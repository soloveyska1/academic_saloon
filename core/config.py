from __future__ import annotations

from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr

# Базовая директория проекта
BASE_DIR = Path(__file__).resolve().parent.parent
CANONICAL_OFFER_URL = "https://telegra.ph/Publichnaya-oferta-servisa-Akademicheskij-Salon-03-26-2"
CANONICAL_PRIVACY_POLICY_URL = "https://telegra.ph/Politika-obrabotki-personalnyh-dannyh-servisa-Akademicheskij-Salon-03-26"
CANONICAL_EXECUTOR_INFO_URL = "https://telegra.ph/Svedeniya-ob-ispolnitele-servisa-Akademicheskij-Salon-03-26"
LEGACY_OFFER_URLS = {
    "https://telegra.ph/Bolshoj-Kodeks-Akademicheskogo-Saluna-03-25",
    "https://telegra.ph/Bolshoj-Kodeks-Akademicheskogo-Saluna-11-30",
    "https://telegra.ph/Publichnaya-oferta-servisa-Akademicheskij-Salon-03-26",
}
LEGACY_PRIVACY_POLICY_URLS: set[str] = set()
LEGACY_EXECUTOR_INFO_URLS: set[str] = set()


def normalize_public_doc_url(url: str | None, canonical_url: str, legacy_urls: set[str] | None = None) -> str:
    if not url:
        return canonical_url

    cleaned = url.strip()
    if legacy_urls and cleaned in legacy_urls:
        return canonical_url

    return cleaned


def normalize_offer_url(url: str | None) -> str:
    return normalize_public_doc_url(url, CANONICAL_OFFER_URL, LEGACY_OFFER_URLS)


def normalize_privacy_policy_url(url: str | None) -> str:
    return normalize_public_doc_url(url, CANONICAL_PRIVACY_POLICY_URL, LEGACY_PRIVACY_POLICY_URLS)


def normalize_executor_info_url(url: str | None) -> str:
    return normalize_public_doc_url(url, CANONICAL_EXECUTOR_INFO_URL, LEGACY_EXECUTOR_INFO_URLS)

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
    OFFER_URL: str = CANONICAL_OFFER_URL  # Публичная оферта
    PRIVACY_POLICY_URL: str = CANONICAL_PRIVACY_POLICY_URL  # Политика обработки ПД
    EXECUTOR_INFO_URL: str = CANONICAL_EXECUTOR_INFO_URL  # Сведения об исполнителе

    # Mini App URL (Web App для Telegram)
    # Hosted on server via nginx at academic-saloon.duckdns.org
    WEBAPP_URL: str = "https://academic-saloon.duckdns.org"

    # Реквизиты для оплаты (ручной перевод) — из .env
    PAYMENT_PHONE: str  # Номер для СБП
    PAYMENT_CARD: str   # Номер карты
    PAYMENT_BANKS: str  # Банки для СБП
    PAYMENT_NAME: str   # Имя получателя

    # ЮKassa (онлайн-оплата)
    YOOKASSA_SHOP_ID: Optional[str] = None      # ID магазина
    YOOKASSA_SECRET_KEY: Optional[str] = None   # Секретный ключ
    YOOKASSA_RETURN_URL: str = "https://t.me/{bot_username}"  # URL возврата после оплаты
    YOOKASSA_WEBHOOK_SECRET: Optional[str] = None  # Для верификации webhook подписей (опционально)

    # Sentry (error tracking)
    SENTRY_DSN: Optional[str] = None

    # Яндекс Диск (хранение файлов заказов)
    YANDEX_DISK_TOKEN: Optional[str] = None     # OAuth токен
    YANDEX_DISK_FOLDER: str = "Academic_Saloon_Orders"  # Корневая папка для заказов

    # Медиа файлы
    WELCOME_ANIMATION: Path = BASE_DIR / "bot" / "media" / "welcome_animated.gif"  # Animated welcome
    WELCOME_IMAGE: Path = BASE_DIR / "bot" / "media" / "welcome_static.jpg"  # Static fallback
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

    @property
    def formatted_yookassa_return_url(self) -> str:
        """Return a valid YooKassa return URL with the bot username injected.

        The default configuration historically contained the ``{bot_username}``
        placeholder, which produced broken redirects when left unsubstituted.
        This helper ensures the placeholder is replaced with the configured bot
        username while still allowing fully custom URLs to pass through.
        """

        placeholder = "{bot_username}"
        if placeholder in self.YOOKASSA_RETURN_URL:
            return self.YOOKASSA_RETURN_URL.format(bot_username=self.BOT_USERNAME)
        return self.YOOKASSA_RETURN_URL

    @property
    def public_offer_url(self) -> str:
        return normalize_offer_url(self.OFFER_URL)

    @property
    def public_privacy_policy_url(self) -> str:
        return normalize_privacy_policy_url(self.PRIVACY_POLICY_URL)

    @property
    def public_executor_info_url(self) -> str:
        return normalize_executor_info_url(self.EXECUTOR_INFO_URL)

    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

settings = Settings()
