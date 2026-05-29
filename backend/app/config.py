from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional

ROLEVAULT_INTERNAL_INFERENCE_URL = "https://api.asherlewis.online"
ROLEVAULT_EXTERNAL_OPENAI_URL = "https://api.openai.com"
ROLEVAULT_EXTERNAL_ANTHROPIC_URL = "https://api.anthropic.com"
ROLEVAULT_WEB_BASE_URL = "https://rolevault.asherlewis.online"
ROLEVAULT_APPLE_IOS_CLIENT_ID = "com.rolevault.app"
ROLEVAULT_APPLE_WEB_CLIENT_ID = "com.rolevault.web"


class Settings(BaseSettings):
    app_name: str = "RoleVault API"
    debug: bool = False

    database_url: str = "postgresql+asyncpg://rolevault:rolevault@localhost:5432/rolevault"

    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    internal_inference_url: str = ROLEVAULT_INTERNAL_INFERENCE_URL
    internal_inference_default_model: str = "google/gemini-3-flash-preview"
    external_openai_url: str = ROLEVAULT_EXTERNAL_OPENAI_URL
    external_openai_default_model: str = "gpt-4o-mini"
    external_anthropic_url: str = ROLEVAULT_EXTERNAL_ANTHROPIC_URL
    external_anthropic_default_model: str = "claude-3-5-haiku-latest"

    web_base_url: str = ROLEVAULT_WEB_BASE_URL
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    smtp_from_email: str = "no-reply@rolevault.app"
    smtp_from_name: str = "RoleVault"
    magic_link_dev_tokens: bool = False

    apple_ios_client_id: str = ROLEVAULT_APPLE_IOS_CLIENT_ID
    apple_web_client_id: str = ROLEVAULT_APPLE_WEB_CLIENT_ID

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    settings.web_base_url = ROLEVAULT_WEB_BASE_URL
    settings.apple_ios_client_id = ROLEVAULT_APPLE_IOS_CLIENT_ID
    settings.apple_web_client_id = ROLEVAULT_APPLE_WEB_CLIENT_ID
    return settings
