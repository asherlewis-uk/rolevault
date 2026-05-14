from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError, ProgrammingError

from app.database import get_db
from app.models import User, LibreChatUser
from app.schemas import UserCreate, LoginRequest, TokenResponse, RefreshRequest, UserResponse
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

    # 1. Insert into LibreChat users table (public.users)
    lc_user = LibreChatUser(
        id=uuid4(),
        email=email_lower,
        password=hashed,
        name=payload.display_name,
        username=email_lower.split("@")[0],
    )
    db.add(lc_user)
    try:
        await db.flush()
    except (IntegrityError, ProgrammingError):
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # 2. Insert into RoleVault users table
    rv_user = User(
        id=lc_user.id,
        email=email_lower,
        display_name=payload.display_name,
        avatar_url=payload.avatar_url,
    )
    db.add(rv_user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered in RoleVault",
        )

    await db.refresh(rv_user)

    access_token = create_access_token(rv_user.id)
    refresh_token = create_refresh_token(rv_user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_response(rv_user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    email_lower = payload.email.lower().strip()

    # 1. Verify against LibreChat users table
    result = await db.execute(select(LibreChatUser).where(LibreChatUser.email == email_lower))
    lc_user = result.scalar_one_or_none()

    if lc_user is None or not verify_password(payload.password, lc_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    # 2. Ensure RoleVault user record exists
    result = await db.execute(select(User).where(User.id == lc_user.id))
    rv_user = result.scalar_one_or_none()

    if rv_user is None:
        rv_user = User(
            id=lc_user.id,
            email=email_lower,
            display_name=lc_user.name,
            avatar_url=lc_user.avatar,
        )
        db.add(rv_user)
        await db.commit()
        await db.refresh(rv_user)
    else:
        # Sync display name / avatar if changed in LibreChat
        if rv_user.display_name != lc_user.name:
            rv_user.display_name = lc_user.name
        if rv_user.avatar_url != lc_user.avatar:
            rv_user.avatar_url = lc_user.avatar
        await db.commit()
        await db.refresh(rv_user)

    access_token = create_access_token(rv_user.id)
    refresh_token = create_refresh_token(rv_user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_response(rv_user),
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


@router.post("/logout")
async def logout():
    # JWT tokens are stateless; logout is best-effort client-side.
    # Future: add token to a blocklist in Redis.
    return {"detail": "Logged out successfully"}
