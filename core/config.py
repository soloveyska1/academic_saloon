from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr

# Базовая директория проекта
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    BOT_TOKEN: SecretStr  # From .env file
    BOT_USERNAME: str
    ADMIN_IDS: list[int]

    # Ссылки и контакты
    REVIEWS_CHANNEL: str = "https://t.me/+Cls1cEPgPcMyZDJi"
    LOG_CHANNEL_ID: int = -1003300275622
    ORDERS_CHANNEL_ID: int = -1003331104298  # Канал для Live-карточек заказов
    ADMIN_GROUP_ID: int = -1003352978651  # Супергруппа с Forum Topics для тикетов
    SUPPORT_USERNAME: str = "Thisissaymoon"
    OFFER_URL: str = "https://telegra.ph/Bolshoj-Kodeks-Akademicheskogo-Saluna-11-30"  # Юридическая оферта

    # Mini App URL (Web App для Telegram)
    WEBAPP_URL: str = "https://academic-saloon.duckdns.org"

    # Реквизиты для оплаты (ручной перевод) — из .env
    PAYMENT_PHONE: str  # Номер для СБП
    PAYMENT_CARD: str   # Номер карты
    PAYMENT_BANKS: str  # Банки для СБП
    PAYMENT_NAME: str   # Имя получателя

    # ЮKassa (онлайн-оплата)
    YOOKASSA_SHOP_ID: str | None = None         # ID магазина
    YOOKASSA_SECRET_KEY: str | None = None      # Секретный ключ
    YOOKASSA_RETURN_URL: str = "https://t.me/{bot_username}"  # URL возврата после оплаты

    # Яндекс Диск (хранение файлов заказов)
    YANDEX_DISK_TOKEN: str | None = None        # OAuth токен
    YANDEX_DISK_FOLDER: str = "Academic_Saloon_Orders"  # Корневая папка для заказов

    # Медиа файлы
    WELCOME_IMAGE: Path = BASE_DIR / "bot" / "media" / "saloon_first.jpg"  # New onboarding image
    OFFER_IMAGE: Path = BASE_DIR / "bot" / "media" / "saloon_welcome.jpg"
    ORDER_IMAGE: Path = BASE_DIR / "bot" / "media" / "bar_saloon.jpg"
    MENU_IMAGE: Path = BASE_DIR / "bot" / "media" / "back_saloon.jpg"
    CANCEL_IMAGE: Path = BASE_DIR / "bot" / "media" / "otmena.jpg"
    ERROR_IMAGE: Path = BASE_DIR / "bot" / "media" / "tech_pause.jpg"
    TASK_INPUT_IMAGE: Path = BASE_DIR / "bot" / "media" / "Kontr.jpg"
    KURS_IMAGE: Path = BASE_DIR / "bot" / "media" / "kurs_otc.jpg"
    DIPLOMA_IMAGE: Path = BASE_DIR / "bot" / "media" / "diploma.jpg"
    DIRECTIONS_IMAGE: Path = BASE_DIR / "bot" / "media" / "directions.jpg"
    DEADLINE_IMAGE: Path = BASE_DIR / "bot" / "media" / "deadline.jpg"

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