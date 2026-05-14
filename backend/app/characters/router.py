from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.models import User, Character, CharacterCustomization
from app.schemas import (
    CharacterCreate,
    CharacterUpdate,
    CharacterResponse,
    CharacterWithCustomizationResponse,
    CharacterCustomizationResponse,
    CharacterCustomizationUpsert,
)
from app.auth.dependencies import get_current_user

router = APIRouter()


def _char_response(c: Character) -> CharacterResponse:
    return CharacterResponse.model_validate(c)


def _customization_response(c: CharacterCustomization) -> CharacterCustomizationResponse:
    return CharacterCustomizationResponse.model_validate(c)


@router.get("", response_model=list[CharacterResponse])
async def list_characters(
    category: Optional[str] = Query(None),
    owner: Optional[UUID] = Query(None),
    visibility: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Character)
    filters = []
    if category:
        filters.append(Character.category == category)
    if owner:
        filters.append(Character.owner_user_id == owner)
    if visibility:
        filters.append(Character.visibility == visibility)
    if filters:
        stmt = stmt.where(and_(*filters))

    result = await db.execute(stmt)
    characters = result.scalars().all()
    return [_char_response(c) for c in characters]


@router.post("", response_model=CharacterResponse, status_code=status.HTTP_201_CREATED)
async def create_character(
    payload: CharacterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    character = Character(
        owner_user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(character)
    await db.commit()
    await db.refresh(character)
    return _char_response(character)


@router.get("/{character_id}", response_model=CharacterWithCustomizationResponse)
async def get_character(
    character_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Character).where(Character.id == character_id))
    character = result.scalar_one_or_none()
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found")

    # Fetch user's customization
    cust_result = await db.execute(
        select(CharacterCustomization).where(
            and_(
                CharacterCustomization.character_id == character_id,
                CharacterCustomization.user_id == current_user.id,
            )
        )
    )
    customization = cust_result.scalar_one_or_none()

    resp = CharacterWithCustomizationResponse.model_validate(character)
    if customization:
        resp.customization = _customization_response(customization)
    return resp


@router.put("/{character_id}", response_model=CharacterResponse)
async def update_character(
    character_id: UUID,
    payload: CharacterUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Character).where(Character.id == character_id))
    character = result.scalar_one_or_none()
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    if character.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not owner of this character")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(character, field, value)

    await db.commit()
    await db.refresh(character)
    return _char_response(character)


@router.delete("/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(
    character_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Character).where(Character.id == character_id))
    character = result.scalar_one_or_none()
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    if character.owner_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not owner of this character")

    await db.delete(character)
    await db.commit()
    return None


@router.get("/{character_id}/customizations", response_model=Optional[CharacterCustomizationResponse])
async def get_customization(
    character_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CharacterCustomization).where(
            and_(
                CharacterCustomization.character_id == character_id,
                CharacterCustomization.user_id == current_user.id,
            )
        )
    )
    customization = result.scalar_one_or_none()
    return _customization_response(customization) if customization else None


@router.put("/{character_id}/customizations", response_model=CharacterCustomizationResponse)
async def upsert_customization(
    character_id: UUID,
    payload: CharacterCustomizationUpsert,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(CharacterCustomization).where(
            and_(
                CharacterCustomization.character_id == character_id,
                CharacterCustomization.user_id == current_user.id,
            )
        )
    )
    customization = result.scalar_one_or_none()

    if customization is None:
        customization = CharacterCustomization(
            character_id=character_id,
            user_id=current_user.id,
            **payload.model_dump(),
        )
        db.add(customization)
    else:
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(customization, field, value)

    await db.commit()
    await db.refresh(customization)
    return _customization_response(customization)
