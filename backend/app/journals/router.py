from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.models import User, JournalEntry
from app.schemas import JournalEntryCreate, JournalEntryResponse
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=list[JournalEntryResponse])
async def list_journal_entries(
    character_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(JournalEntry).where(JournalEntry.user_id == current_user.id)
    if character_id:
        stmt = stmt.where(JournalEntry.character_id == character_id)
    stmt = stmt.order_by(JournalEntry.created_at.desc())
    result = await db.execute(stmt)
    entries = result.scalars().all()
    return [JournalEntryResponse.model_validate(e) for e in entries]


@router.post("", response_model=JournalEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_journal_entry(
    payload: JournalEntryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = JournalEntry(
        user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return JournalEntryResponse.model_validate(entry)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journal_entry(
    entry_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(JournalEntry).where(
            and_(JournalEntry.id == entry_id, JournalEntry.user_id == current_user.id)
        )
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    await db.delete(entry)
    await db.commit()
    return None
