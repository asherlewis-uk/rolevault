from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.database import get_db
from app.models import User, Persona
from app.schemas import PersonaCreate, PersonaUpdate, PersonaResponse
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=list[PersonaResponse])
async def list_personas(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Persona).where(Persona.user_id == current_user.id).order_by(Persona.created_at.desc())
    result = await db.execute(stmt)
    personas = result.scalars().all()
    return [PersonaResponse.model_validate(p) for p in personas]


@router.post("", response_model=PersonaResponse, status_code=status.HTTP_201_CREATED)
async def create_persona(
    payload: PersonaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    persona = Persona(
        user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(persona)
    await db.commit()
    await db.refresh(persona)
    return PersonaResponse.model_validate(persona)


@router.get("/{persona_id}", response_model=PersonaResponse)
async def get_persona(
    persona_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Persona).where(
            and_(Persona.id == persona_id, Persona.user_id == current_user.id)
        )
    )
    persona = result.scalar_one_or_none()
    if persona is None:
        raise HTTPException(status_code=404, detail="Persona not found")
    return PersonaResponse.model_validate(persona)


@router.put("/{persona_id}", response_model=PersonaResponse)
async def update_persona(
    persona_id: UUID,
    payload: PersonaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Persona).where(
            and_(Persona.id == persona_id, Persona.user_id == current_user.id)
        )
    )
    persona = result.scalar_one_or_none()
    if persona is None:
        raise HTTPException(status_code=404, detail="Persona not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(persona, field, value)

    await db.commit()
    await db.refresh(persona)
    return PersonaResponse.model_validate(persona)


@router.delete("/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_persona(
    persona_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Persona).where(
            and_(Persona.id == persona_id, Persona.user_id == current_user.id)
        )
    )
    persona = result.scalar_one_or_none()
    if persona is None:
        raise HTTPException(status_code=404, detail="Persona not found")

    await db.delete(persona)
    await db.commit()
    return None


@router.put("/{persona_id}/activate", response_model=PersonaResponse)
async def activate_persona(
    persona_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Persona).where(
            and_(Persona.id == persona_id, Persona.user_id == current_user.id)
        )
    )
    target = result.scalar_one_or_none()
    if target is None:
        raise HTTPException(status_code=404, detail="Persona not found")

    # Deactivate all other personas for this user
    stmt = select(Persona).where(
        and_(Persona.user_id == current_user.id, Persona.is_active == True)
    )
    result = await db.execute(stmt)
    for persona in result.scalars().all():
        persona.is_active = False

    target.is_active = True
    await db.commit()
    await db.refresh(target)
    return PersonaResponse.model_validate(target)
