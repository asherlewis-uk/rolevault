import jwt as pyjwt
import requests

from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

import secrets
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models import User, MagicLinkToken
from app.schemas import (
    UserCreate, LoginRequest, TokenResponse, RefreshRequest,
    UserResponse, AppleAuthRequest, MagicLinkRequest, MagicLinkVerifyRequest,
)
from app.auth.utils import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)

router = APIRouter()


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.post("/register", response_model=TokenResponse)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    hashed = hash_password(payload.password)
    email_lower = payload.email.lower().strip()

    user = User(
        id=uuid4(),
        email=email_lower,
        password=hashed,
        display_name=payload.display_name,
        avatar_url=payload.avatar_url,
    )
    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_response(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    email_lower = payload.email.lower().strip()

    result = await db.execute(select(User).where(User.email == email_lower))
    user = result.scalar_one_or_none()

    if user is None or user.password == "" or not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_response(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token_data = decode_token(payload.refresh_token)

    if token_data is None or token_data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    from uuid import UUID
    try:
        user_id = UUID(token_data["sub"])
    except (KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    access_token = create_access_token(user.id)
    new_refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        user=_user_response(user),
    )


@router.post("/apple", response_model=TokenResponse)
async def apple_auth(payload: AppleAuthRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate via Sign in with Apple.
    Verifies the Apple identity token, then finds or creates a user.
    """
    # 1. Fetch Apple's public keys
    jwks_resp = requests.get("https://appleid.apple.com/auth/keys", timeout=10)
    jwks_resp.raise_for_status()
    jwks = jwks_resp.json()

    # 2. Decode the header to find the key ID
    try:
        unverified_header = pyjwt.get_unverified_header(payload.identity_token)
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid identity token")

    # 3. Find the matching key
    kid = unverified_header.get("kid")
    key = next((k for k in jwks["keys"] if k["kid"] == kid), None)
    if key is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Key not found in Apple JWKS")

    public_key = pyjwt.algorithms.RSAAlgorithm.from_jwk(key)

    # 4. Verify the token
    try:
        decoded = pyjwt.decode(
            payload.identity_token,
            public_key,
            algorithms=["RS256"],
            audience="com.rolevault.app",
            issuer="https://appleid.apple.com",
        )
    except pyjwt.PyJWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token verification failed: {str(e)}")

    apple_user_id = decoded.get("sub")
    email = decoded.get("email")
    if not apple_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing sub claim in Apple token")

    # 5. Look up by apple_user_id
    result = await db.execute(select(User).where(User.apple_user_id == apple_user_id))
    user = result.scalar_one_or_none()

    if user:
        # Existing user — return RoleVault JWT
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=_user_response(user),
        )

    # 6. New user — create in RoleVault table only
    display_name = email.split("@")[0] if email else "User"

    user = User(
        id=uuid4(),
        email=email or f"{apple_user_id}@appleid.apple",
        display_name=display_name,
        apple_user_id=apple_user_id,
        password="",  # Apple users don't use password auth
    )
    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email conflict")

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_response(user),
    )


@router.post("/magic-link/request")
async def request_magic_link(payload: MagicLinkRequest, db: AsyncSession = Depends(get_db)):
    """
    Request a magic link. Generates a single-use token valid for 15 minutes.
    In dev mode the token is returned in the response body.
    Future: send via Resend SMTP.
    """
    email_lower = payload.email.lower().strip()

    # Generate cryptographically random token
    token = secrets.token_hex(32)

    # Check if a user already exists with this email
    result = await db.execute(select(User).where(User.email == email_lower))
    existing_user = result.scalar_one_or_none()

    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    magic = MagicLinkToken(
        email=email_lower,
        token=token,
        user_id=existing_user.id if existing_user else None,
        expires_at=expires_at,
    )
    db.add(magic)
    await db.commit()

    return {
        "detail": "Magic link sent. Check your email.",
        "token": token,  # inline in dev; remove in production
        "expires_at": expires_at.isoformat(),
    }


@router.post("/magic-link/verify", response_model=TokenResponse)
async def verify_magic_link(payload: MagicLinkVerifyRequest, db: AsyncSession = Depends(get_db)):
    """
    Verify a magic link token. If valid, returns JWT pair.
    Creates user on first use if no account exists for that email.
    """
    now = datetime.now(timezone.utc)

    # Find valid, unused, non-expired token
    result = await db.execute(
        select(MagicLinkToken).where(
            MagicLinkToken.token == payload.token,
            MagicLinkToken.used == False,
            MagicLinkToken.expires_at > now,
        )
    )
    magic = result.scalar_one_or_none()

    if magic is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired magic link",
        )

    # Mark token as used immediately
    magic.used = True
    await db.flush()

    # Find or create user
    email_lower = magic.email.lower().strip()
    result = await db.execute(select(User).where(User.email == email_lower))
    user = result.scalar_one_or_none()

    if user:
        # Existing user — return JWT
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)
        await db.commit()
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=_user_response(user),
        )

    # New user — create in RoleVault table only
    display_name = email_lower.split("@")[0]

    user = User(
        id=uuid4(),
        email=email_lower,
        display_name=display_name,
        password="",  # magic link users don't have passwords
    )
    db.add(user)
    try:
        await db.commit()
        await db.refresh(user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already exists",
        )

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_response(user),
    )


@router.post("/logout")
async def logout():
    # JWT tokens are stateless; logout is best-effort client-side.
    # Future: add token to a blocklist in Redis.
    return {"detail": "Logged out successfully"}
