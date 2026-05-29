from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine, Base

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create schema and tables
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS rolevault"))
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS public"))
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat(), "service": settings.app_name}


from app.auth.router import router as auth_router
from app.characters.router import router as characters_router
from app.conversations.router import router as conversations_router
from app.personas.router import router as personas_router
from app.journals.router import router as journals_router
from app.gallery.router import router as gallery_router
from app.config_endpoint.router import router as config_router
from app.inference.router import router as inference_router

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(characters_router, prefix="/api/characters", tags=["characters"])
app.include_router(conversations_router, prefix="/api/convos", tags=["conversations"])
app.include_router(personas_router, prefix="/api/personas", tags=["personas"])
app.include_router(journals_router, prefix="/api/journal", tags=["journal"])
app.include_router(gallery_router, prefix="/api/gallery", tags=["gallery"])
app.include_router(config_router, prefix="/api/config", tags=["config"])
app.include_router(inference_router, prefix="/api/inference", tags=["inference"])
