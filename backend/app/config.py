"""Runtime configuration. Everything comes from environment variables (see ../.env.example)."""
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="DCS_", extra="ignore")

    database_url: str = "sqlite:///./digital_crime_scene.db"
    # Comma separated list of allowed browser origins, e.g. "http://localhost:5173,https://you.github.io"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    # Requests per minute per client IP (sliding window, in memory).
    rate_limit_per_minute: int = Field(default=120, ge=1)
    assistant_rate_limit_per_minute: int = Field(default=20, ge=1)
    # Optional OpenAI-compatible chat-completions endpoint. Leave empty to run fully offline.
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = ""
    llm_timeout_seconds: float = 12.0
    # Upper bound on a synced progress document, in bytes.
    max_snapshot_bytes: int = 400_000

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def llm_enabled(self) -> bool:
        return bool(self.llm_base_url and self.llm_api_key and self.llm_model)


@lru_cache
def get_settings() -> Settings:
    return Settings()
