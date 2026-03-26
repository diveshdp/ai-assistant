from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    openai_api_key: str
    database_url: str
    redis_url: str = "redis://localhost:6379"
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 10080
    app_env: str = "development"
    cors_origins: List[str] = ["http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
