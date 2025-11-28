from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr

# Базовая директория проекта
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    BOT_TOKEN: SecretStr
    BOT_USERNAME: str
    ADMIN_IDS: list[int]

    # Ссылки и контакты
    REVIEWS_CHANNEL: str = "https://t.me/+Cls1cEPgPcMyZDJi"
    LOG_CHANNEL_ID: int = -1003300275622
    SUPPORT_USERNAME: str = "Thisissaymoon"

    # Медиа файлы
    WELCOME_IMAGE: Path = BASE_DIR / "bot" / "media" / "image_saloon.jpg"
    WELCOME_VOICE: Path = BASE_DIR / "bot" / "media" / "voice_welcome.ogg"
    OFFER_IMAGE: Path = BASE_DIR / "bot" / "media" / "saloon_welcome.jpg"
    ORDER_IMAGE: Path = BASE_DIR / "bot" / "media" / "bar_saloon.jpg"
    MENU_IMAGE: Path = BASE_DIR / "bot" / "media" / "back_saloon.jpg"
    CANCEL_IMAGE: Path = BASE_DIR / "bot" / "media" / "cancel_saloon.jpg"
    ERROR_IMAGE: Path = BASE_DIR / "bot" / "media" / "tech_pause.jpg"

    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int

    REDIS_HOST: str
    REDIS_PORT: int
    REDIS_DB_FSM: int
    REDIS_DB_CACHE: int

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB_FSM}"

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

settings = Settings()