from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.inference.router import fetch_internal_model_ids
from app.schemas import ConfigResponse
from app.auth.dependencies import get_current_user
from app.models import User

router = APIRouter()


@router.get("", response_model=ConfigResponse)
async def get_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    del db, current_user
    models = await fetch_internal_model_ids()

    return ConfigResponse(
        models=models,
        version="0.1.0",
    )
