import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Locate and load .env file from the backend directory
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)


class Settings(BaseSettings):
    PROJECT_NAME: str = "KrishiMandi API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Database settings
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://abhishek:root@localhost:5432/krishimandi_db"
    )

    # JWT Authentication settings
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "krishimandi_super_secret_jwt_key_sih2026_change_in_production"
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

    # CORS settings
    CORS_ORIGINS: list[str] = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5500",
        "http://localhost:8000",
        "http://localhost:8080",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5500",
        "http://127.0.0.1:8000",
        "http://127.0.0.1:8080",
        "*"
    ]

    class Config:
        case_sensitive = True
        extra = "ignore"


settings = Settings()
