from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    app_name: str = "RoleVault API"
    debug: bool = False

    database_url: str = "postgresql+asyncpg://rolevault:rolevault@localhost:5432/rolevault"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    inference_url: str = "http://localhost:1234"

    web_base_url: str = "http://localhost:4173"
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    smtp_from_email: str = "no-reply@rolevault.app"
    smtp_from_name: str = "RoleVault"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
