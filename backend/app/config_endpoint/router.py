import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.schemas import ConfigResponse
from app.auth.dependencies import get_current_user
from app.models import User

router = APIRouter()
settings = get_settings()


@router.get("", response_model=ConfigResponse)
async def get_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    models = []
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{settings.inference_url}/v1/models", timeout=10.0)
            if resp.status_code == 200:
                data = resp.json()
                models = [m.get("id", "") for m in data.get("data", [])]
    except Exception:
        models = []

    return ConfigResponse(
        inference_url=settings.inference_url,
        models=models,
        version="0.1.0",
    )
