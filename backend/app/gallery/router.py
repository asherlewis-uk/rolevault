from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.models import User, GalleryMoment
from app.schemas import GalleryMomentCreate, GalleryMomentResponse
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=list[GalleryMomentResponse])
async def list_gallery_moments(
    character_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(GalleryMoment).where(GalleryMoment.user_id == current_user.id)
    if character_id:
        stmt = stmt.where(GalleryMoment.character_id == character_id)
    stmt = stmt.order_by(GalleryMoment.created_at.desc())
    result = await db.execute(stmt)
    moments = result.scalars().all()
    return [GalleryMomentResponse.model_validate(m) for m in moments]


@router.post("", response_model=GalleryMomentResponse, status_code=status.HTTP_201_CREATED)
async def create_gallery_moment(
    payload: GalleryMomentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    moment = GalleryMoment(
        user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(moment)
    await db.commit()
    await db.refresh(moment)
    return GalleryMomentResponse.model_validate(moment)


@router.delete("/{moment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gallery_moment(
    moment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(GalleryMoment).where(
            and_(GalleryMoment.id == moment_id, GalleryMoment.user_id == current_user.id)
        )
    )
    moment = result.scalar_one_or_none()
    if moment is None:
        raise HTTPException(status_code=404, detail="Gallery moment not found")

    await db.delete(moment)
    await db.commit()
    return None
