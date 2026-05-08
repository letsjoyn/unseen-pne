"""Application settings loaded entirely from environment / .env.

Nothing in the application code may hardcode environment-specific
values; all behavior is driven by these settings or by registry rows
in the database.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_env: str = "local"
    app_name: str = "unseen-pne-api"
    log_level: str = "INFO"

    database_url: str = "sqlite:///./data/local/unseen.db"

    api_auth_token: str = "change-me-in-prod"

    # JWT auth (real user auth, separate from the service-level api_auth_token)
    jwt_secret: str = "dev-secret-change-in-prod-please-rotate-me"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24 * 7  # 7 days

    google_api_key: str | None = None
    google_genai_use_vertexai: bool = False
    google_cloud_project: str | None = None
    google_cloud_location: str = "us-central1"

    gemini_model_reasoning: str = "gemini-2.0-flash-001"
    gemini_model_drafting: str = "gemini-2.0-flash-001"
    gemini_model_embedding: str = "text-embedding-004"

    config_dir: Path = Field(default=Path("./config"))
    seed_on_start: bool = True

    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from: str = "unseen@example.org"

    whatsapp_provider: str = "stub"
    whatsapp_api_key: str | None = None
    whatsapp_from: str | None = None

    google_maps_api_key: str | None = None
    google_places_radius_meters: int = 2000
    google_places_keyword: str = "internet cafe|xerox|print shop|stationery"

    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
