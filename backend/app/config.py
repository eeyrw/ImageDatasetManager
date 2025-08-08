# config.py
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    root_dir: Path = "Dataset root dir"
    image_dir: Path = "Sub set of dataset dir"

    class Config:
        env_file = ".env"  # 自动从 .env 文件读取

settings = Settings()
