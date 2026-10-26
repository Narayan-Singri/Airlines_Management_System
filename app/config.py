"""
Application Configuration using Pydantic Settings.
Reads environment variables from .env file or system environment.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database Settings
    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "airline_db"
    db_user: str = "postgres"
    db_password: str = "admin"
    db_min_connections: int = 2
    db_max_connections: int = 10

    # Security Settings
    secret_key: str = "airline_secret_key_super_secure_jwt_token_2026_crce_dbms"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 120

    # CORS Settings
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def conninfo(self) -> str:
        return (
            f"host={self.db_host} port={self.db_port} "
            f"dbname={self.db_name} user={self.db_user} "
            f"password={self.db_password}"
        )

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.cors_origins or self.cors_origins.strip() == "*":
            return ["*"]
        return [orig.strip() for orig in self.cors_origins.split(",") if orig.strip()]


settings = Settings()
