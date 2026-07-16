"""Typed application configuration."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )

    APP_ENV: Literal["development", "test", "production"] = "development"
    APP_HOST: str = "127.0.0.1"
    APP_PORT: int = Field(default=8000, ge=1, le=65535)
    LOG_LEVEL: str = "INFO"

    # Comma-separated origins allowed to call the rules API (the dashboard).
    CORS_ORIGINS: str = "http://localhost:3001,http://127.0.0.1:3001"

    DATABASE_URL: str = "postgresql+asyncpg://wac:wac@localhost:5432/whatsapp_connector"
    DATABASE_SCHEMA: str = "automation_schema"
    DB_POOL_SIZE: int = Field(default=10, ge=1, le=100)

    VALKEY_URL: str | None = None
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"
    RABBITMQ_PREFETCH: int = Field(default=10, ge=1, le=1000)
    RABBITMQ_TOPOLOGY_ENABLED: bool = True

    CONNECTOR_BASE_URL: str = "http://localhost:3000"
    CONNECTOR_API_KEY: str = ""
    CONNECTOR_TIMEOUT_SECONDS: float = Field(default=10, gt=0, le=60)

    AUTH_ENABLED: bool = True
    API_KEYS: str = ""
    WEBHOOK_SECRET: str = ""
    WEBHOOK_DEFAULT_TENANT_ID: str = "public"
    WEBHOOK_PROCESSING_MODE: Literal["outbox", "direct"] = "outbox"

    # Passphrase for automation_schema.secrets (pgp_sym_encrypt/pgp_sym_decrypt,
    # see db/migration/V8__create_secrets.sql). Values never leave the DB
    # boundary in plaintext except when explicitly resolved for sandbox
    # injection — see infrastructure/persistence/repositories.py.
    SECRETS_ENCRYPTION_KEY: str = ""

    OUTBOX_BATCH_SIZE: int = Field(default=50, ge=1, le=500)
    OUTBOX_POLL_INTERVAL_SECONDS: float = Field(default=1, ge=0.1, le=60)
    OUTBOX_MAX_ATTEMPTS: int = Field(default=10, ge=1, le=100)
    OUTBOX_STALE_LOCK_SECONDS: int = Field(default=300, ge=30, le=3600)

    # RUN_SCRIPT sandbox (see infrastructure/sandbox/). Sized for scripts that
    # may drive a real headless browser (Selenium/Chrome) — page loads and
    # multi-step automation routinely take tens of seconds, and Chrome's
    # multi-process tree (renderer/GPU/zygote/crashpad) needs generous
    # process/file-descriptor headroom. No memory rlimit: RLIMIT_AS breaks
    # Chrome outright (it reserves large virtual-memory regions independent
    # of actual usage) — the wall-clock timeout is the real backstop.
    # SCRIPT_SANDBOX_CPU_SECONDS is kept below SCRIPT_SANDBOX_TIMEOUT_SECONDS
    # on purpose: a CPU-bound script should hit its own RLIMIT_CPU kill
    # (clean, inside the sandbox) before the host's wall-clock timeout has
    # to SIGKILL the process group from outside.
    SCRIPT_SANDBOX_TIMEOUT_SECONDS: float = Field(default=90, gt=0, le=300)
    SCRIPT_SANDBOX_CPU_SECONDS: int = Field(default=60, ge=1, le=280)
    SCRIPT_SANDBOX_MAX_PROCESSES: int = Field(default=512, ge=1, le=2048)
    SCRIPT_SANDBOX_MAX_OPEN_FILES: int = Field(default=1024, ge=8, le=4096)
    SCRIPT_SANDBOX_MAX_OUTPUT_BYTES: int = Field(default=65_536, ge=1024, le=1_048_576)
    SCRIPT_MAX_SOURCE_BYTES: int = Field(default=65_536, ge=256, le=1_048_576)

    # worker-rules processes its RabbitMQ queue with this many messages
    # in flight at once (each RUN_SCRIPT action may hold one for tens of
    # seconds running Selenium) — bounded because each concurrent script
    # can spawn a real headless Chrome process, which costs real memory/CPU.
    WORKER_RULES_MAX_CONCURRENCY: int = Field(default=4, ge=1, le=32)

    # Bulk CSV uploads (e.g. "TRASLADO TIENDA" + attached CSV) fan out into one
    # RUN_SCRIPT run per row, reusing the same rule's script — this caps how
    # many headless Chrome runs a single upload can trigger.
    MAX_CSV_ROWS_PER_UPLOAD: int = Field(default=200, ge=1, le=2000)
    # Rows within one CSV upload processed concurrently — bounded independently
    # of WORKER_RULES_MAX_CONCURRENCY (which caps concurrent *messages*) so one
    # large upload can't alone saturate the sandbox's process/Chrome budget.
    BULK_CSV_ROW_CONCURRENCY: int = Field(default=3, ge=1, le=10)

    @field_validator("DATABASE_SCHEMA")
    @classmethod
    def validate_schema(cls, value: str) -> str:
        if not value.replace("_", "").isalnum():
            raise ValueError("DATABASE_SCHEMA must be alphanumeric with underscores")
        return value

    @model_validator(mode="after")
    def validate_security_defaults(self) -> Settings:
        if self.APP_ENV == "production":
            if self.AUTH_ENABLED and not self.API_KEYS.strip():
                raise ValueError("API_KEYS is required when AUTH_ENABLED=true in production")
            if len(self.WEBHOOK_SECRET) < 32:
                raise ValueError("WEBHOOK_SECRET must have at least 32 characters in production")
            if not self.CONNECTOR_API_KEY:
                raise ValueError("CONNECTOR_API_KEY is required in production")
            if len(self.SECRETS_ENCRYPTION_KEY) < 32:
                raise ValueError(
                    "SECRETS_ENCRYPTION_KEY must have at least 32 characters in production"
                )
        return self

    def api_key_map(self) -> dict[str, str]:
        """Return secret-to-tenant mapping from API_KEYS."""
        result: dict[str, str] = {}
        if not self.API_KEYS.strip():
            return result
        for entry in self.API_KEYS.split(","):
            tenant, separator, secret = entry.strip().partition(":")
            if not separator or not tenant or len(secret) < 16:
                raise ValueError("API_KEYS entries must be tenant:secret with secret >= 16 chars")
            result[secret] = tenant
        return result

    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide immutable settings instance."""
    return Settings()
