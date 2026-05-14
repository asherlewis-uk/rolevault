from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "RoleVault API"
    debug: bool = False

    database_url: str = "postgresql+asyncpg://rolevault:rolevault@localhost:5432/rolevault"
    librechat_db_url: str = "postgresql+asyncpg://librechat:librechat@localhost:5432/librechat"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    inference_url: str = "http://localhost:1234"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
