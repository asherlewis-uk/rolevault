import hashlib
import logging
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Optional
from urllib.parse import urlencode
from uuid import UUID

import jwt as pyjwt
import requests
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.auth.utils import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
)
from app.config import get_settings
from app.database import get_db, set_service_role_context
from app.models import DeviceSession, MagicLinkToken, User
from app.schemas import (
    AppleAuthRequest,
    MagicLinkRequest,
    MagicLinkVerifyRequest,
    RefreshRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter()
settings = get_settings()
logger = logging.getLogger(__name__)

SESSION_TTL = timedelta(days=7)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _is_apple_email_verified(value: object) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() == "true"
    return False


def _is_apple_nonce_valid(claim: object, nonce: str) -> bool:
    if not isinstance(claim, str):
        return False
    nonce_hash = hashlib.sha256(nonce.encode("utf-8")).hexdigest()
    return secrets.compare_digest(claim, nonce) or secrets.compare_digest(claim, nonce_hash)


def _send_magic_link_email(
    recipient_email: str,
    token: str,
    nonce: str,
    expires_at: datetime,
) -> bool:
    if not settings.smtp_host:
        logger.warning("SMTP host is not configured; cannot send magic link email")
        return False

    query = urlencode({"token": token, "nonce": nonce})
    magic_link = f"{settings.web_base_url.rstrip('/')}/magic-link?{query}"

    msg = EmailMessage()
    msg["Subject"] = "Your RoleVault sign-in link"
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"] = recipient_email
    msg.set_content(
        "Use this one-time sign-in link to access your RoleVault account.\n\n"
        f"{magic_link}\n\n"
        f"This link expires at {expires_at.isoformat()}."
    )

    try:
        if settings.smtp_use_tls:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                server.starttls()
                if settings.smtp_username and settings.smtp_password:
                    server.login(settings.smtp_username, settings.smtp_password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
                if settings.smtp_username and settings.smtp_password:
                    server.login(settings.smtp_username, settings.smtp_password)
                server.send_message(msg)
    except Exception:
        logger.exception("Failed to send magic link email")
        return False

    return True


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        email_verified_at=user.email_verified_at,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


async def _upsert_device_session(
    db: AsyncSession,
    user: User,
    device_id: str,
    access_token: str,
    refresh_token: str,
    platform: Optional[str] = None,
) -> None:
    now = _now()
    result = await db.execute(
        select(DeviceSession).where(
            DeviceSession.user_id == user.id,
            DeviceSession.device_id == device_id,
        )
    )
    session = result.scalar_one_or_none()

    if session is None:
        db.add(
            DeviceSession(
                user_id=user.id,
                device_id=device_id,
                session_token_hash=hash_token(access_token),
                refresh_token_hash=hash_token(refresh_token),
                platform=platform,
                expires_at=now + SESSION_TTL,
                last_seen_at=now,
                created_at=now,
                updated_at=now,
            )
        )
        return

    session.session_token_hash = hash_token(access_token)
    session.refresh_token_hash = hash_token(refresh_token)
    session.platform = platform or session.platform
    session.expires_at = now + SESSION_TTL
    session.last_seen_at = now
    session.revoked_at = None
    session.updated_at = now


async def _issue_tokens_for_device(
    db: AsyncSession,
    user: User,
    device_id: str,
    platform: Optional[str] = None,
) -> TokenResponse:
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    await _upsert_device_session(db, user, device_id, access_token, refresh_token, platform)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_response(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    set_service_role_context(db)
    token_data = decode_token(payload.refresh_token)

    if token_data is None or token_data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    try:
        user_id = UUID(str(token_data["sub"]))
    except (KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    now = _now()
    result = await db.execute(
        select(DeviceSession).where(
            DeviceSession.user_id == user_id,
            DeviceSession.device_id == payload.device_id,
            DeviceSession.refresh_token_hash == hash_token(payload.refresh_token),
            DeviceSession.revoked_at.is_(None),
            DeviceSession.expires_at > now,
        )
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    response = await _issue_tokens_for_device(db, user, payload.device_id, session.platform)
    await db.commit()
    return response


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)):
    return _user_response(current_user)


@router.post("/apple", response_model=TokenResponse)
async def apple_auth(payload: AppleAuthRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate via Sign in with Apple.
    Verifies the Apple identity token, then finds or creates a user.
    """
    jwks_resp = requests.get("https://appleid.apple.com/auth/keys", timeout=10)
    jwks_resp.raise_for_status()
    jwks = jwks_resp.json()

    try:
        unverified_header = pyjwt.get_unverified_header(payload.identity_token)
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid identity token")

    kid = unverified_header.get("kid")
    key = next((k for k in jwks["keys"] if k["kid"] == kid), None)
    if key is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Key not found in Apple JWKS")

    public_key = pyjwt.algorithms.RSAAlgorithm.from_jwk(key)
    valid_audiences = [settings.apple_ios_client_id]
    if settings.apple_web_client_id != settings.apple_ios_client_id:
        valid_audiences.append(settings.apple_web_client_id)

    decoded = None
    last_error = None
    for audience in valid_audiences:
        try:
            decoded = pyjwt.decode(
                payload.identity_token,
                public_key,
                algorithms=["RS256"],
                audience=audience,
                issuer="https://appleid.apple.com",
            )
            break
        except pyjwt.PyJWTError as error:
            last_error = error

    if decoded is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(last_error)}",
        )

    if not _is_apple_nonce_valid(decoded.get("nonce"), payload.nonce):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid nonce claim in Apple token",
        )

    apple_subject = decoded.get("sub")
    if not apple_subject:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing sub claim in Apple token")

    now = _now()
    raw_email = decoded.get("email")
    email = raw_email.lower().strip() if isinstance(raw_email, str) and raw_email else None
    email_verified_at = now if email and _is_apple_email_verified(decoded.get("email_verified")) else None

    set_service_role_context(db)
    result = await db.execute(select(User).where(User.apple_subject == apple_subject))
    user = result.scalar_one_or_none()

    if user is None and email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user and user.apple_subject and user.apple_subject != apple_subject:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is linked to another Apple ID")
        if user:
            user.apple_subject = apple_subject

    if user is None:
        user = User(
            email=email,
            email_verified_at=email_verified_at,
            apple_subject=apple_subject,
            display_name=email.split("@")[0] if email else "User",
            last_login_at=now,
        )
        db.add(user)
        await db.flush()
    else:
        if email and user.email is None:
            user.email = email
        if email_verified_at and user.email_verified_at is None:
            user.email_verified_at = email_verified_at
        user.last_login_at = now

    try:
        response = await _issue_tokens_for_device(db, user, payload.device_id, payload.platform)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Authentication identity conflict")

    return response


@router.post("/magic-link/request")
async def request_magic_link(payload: MagicLinkRequest, db: AsyncSession = Depends(get_db)):
    """
    Request a magic link. Generates a single-use token and nonce valid for 15 minutes.
    In dev mode they can be returned in the response body when explicitly enabled.
    """
    set_service_role_context(db)
    email = payload.email.lower().strip()
    token = secrets.token_urlsafe(48)
    nonce = secrets.token_urlsafe(32)
    expires_at = _now() + timedelta(minutes=15)

    result = await db.execute(select(User).where(User.email == email))
    existing_user = result.scalar_one_or_none()

    magic = MagicLinkToken(
        email=email,
        token_hash=hash_token(token),
        nonce_hash=hash_token(nonce),
        device_id=payload.device_id,
        user_id=existing_user.id if existing_user else None,
        expires_at=expires_at,
    )
    db.add(magic)
    await db.commit()

    if settings.debug and settings.magic_link_dev_tokens:
        return {
            "detail": "Magic link sent. Check your email.",
            "token": token,
            "nonce": nonce,
            "expires_at": expires_at.isoformat(),
        }

    if not _send_magic_link_email(email, token, nonce, expires_at):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to send magic link email at this time",
        )

    return {
        "detail": "Magic link sent. Check your email.",
        "expires_at": expires_at.isoformat(),
    }


@router.post("/magic-link/verify", response_model=TokenResponse)
async def verify_magic_link(payload: MagicLinkVerifyRequest, db: AsyncSession = Depends(get_db)):
    """
    Verify a magic link token and nonce. If valid, returns JWT pair and binds
    the authenticated session to the requesting device.
    """
    set_service_role_context(db)
    now = _now()

    result = await db.execute(
        select(MagicLinkToken).where(
            MagicLinkToken.token_hash == hash_token(payload.token),
            MagicLinkToken.nonce_hash == hash_token(payload.nonce),
            MagicLinkToken.device_id == payload.device_id,
            MagicLinkToken.consumed_at.is_(None),
            MagicLinkToken.expires_at > now,
        )
    )
    magic = result.scalar_one_or_none()

    if magic is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired magic link",
        )

    magic.consumed_at = now
    await db.flush()

    email = magic.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            email=email,
            email_verified_at=now,
            display_name=email.split("@")[0],
            last_login_at=now,
        )
        db.add(user)
        await db.flush()
    else:
        if user.email_verified_at is None:
            user.email_verified_at = now
        user.last_login_at = now

    magic.user_id = user.id

    try:
        response = await _issue_tokens_for_device(db, user, payload.device_id)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already exists",
        )

    return response


@router.post("/logout")
async def logout(
    payload: Optional[RefreshRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload is None:
        return {"detail": "Logged out successfully"}

    result = await db.execute(
        select(DeviceSession).where(
            DeviceSession.user_id == current_user.id,
            DeviceSession.device_id == payload.device_id,
            DeviceSession.refresh_token_hash == hash_token(payload.refresh_token),
            DeviceSession.revoked_at.is_(None),
        )
    )
    session = result.scalar_one_or_none()
    if session:
        now = _now()
        session.revoked_at = now
        session.updated_at = now
        await db.commit()

    return {"detail": "Logged out successfully"}
