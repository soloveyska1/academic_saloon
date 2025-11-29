"""
Кэширование file_id для медиафайлов.
После первой отправки картинки сохраняем file_id в Redis,
чтобы не читать файл с диска при каждой отправке.
"""

import hashlib
from pathlib import Path
from typing import Optional

from aiogram import Bot
from aiogram.types import FSInputFile, Message

from core.redis_pool import get_redis


# Префикс для ключей кэша
MEDIA_CACHE_PREFIX = "media:file_id:"
# TTL кэша - 7 дней (file_id может протухать)
MEDIA_CACHE_TTL = 60 * 60 * 24 * 7


def _get_file_hash(file_path: Path) -> str:
    """
    Создаёт хэш файла для идентификации.
    Учитывает путь и время модификации.
    """
    try:
        stat = file_path.stat()
        key_data = f"{file_path}:{stat.st_mtime}:{stat.st_size}"
        return hashlib.md5(key_data.encode()).hexdigest()[:16]
    except Exception:
        return hashlib.md5(str(file_path).encode()).hexdigest()[:16]


async def get_cached_file_id(file_path: Path) -> Optional[str]:
    """
    Получить закэшированный file_id для файла.
    Возвращает None если кэш пуст или устарел.
    """
    try:
        redis = await get_redis()
        file_hash = _get_file_hash(file_path)
        cache_key = f"{MEDIA_CACHE_PREFIX}{file_hash}"
        return await redis.get(cache_key)
    except Exception:
        return None


async def cache_file_id(file_path: Path, file_id: str) -> None:
    """Сохранить file_id в кэш"""
    try:
        redis = await get_redis()
        file_hash = _get_file_hash(file_path)
        cache_key = f"{MEDIA_CACHE_PREFIX}{file_hash}"
        await redis.set(cache_key, file_id, ex=MEDIA_CACHE_TTL)
    except Exception:
        pass  # Кэш не критичен


async def send_cached_photo(
    bot: Bot,
    chat_id: int,
    photo_path: Path,
    caption: str = None,
    reply_markup=None,
    **kwargs
) -> Optional[Message]:
    """
    Отправить фото с использованием кэша file_id.
    Если file_id закэширован - использует его.
    Иначе - отправляет файл и кэширует file_id.
    """
    # Пробуем получить из кэша
    cached_id = await get_cached_file_id(photo_path)

    if cached_id:
        try:
            # Используем закэшированный file_id
            msg = await bot.send_photo(
                chat_id=chat_id,
                photo=cached_id,
                caption=caption,
                reply_markup=reply_markup,
                **kwargs
            )
            return msg
        except Exception:
            # file_id протух - отправим файл заново
            pass

    # Отправляем файл с диска
    try:
        photo = FSInputFile(photo_path)
        msg = await bot.send_photo(
            chat_id=chat_id,
            photo=photo,
            caption=caption,
            reply_markup=reply_markup,
            **kwargs
        )

        # Кэшируем file_id для следующих отправок
        if msg and msg.photo:
            file_id = msg.photo[-1].file_id  # Берём самое большое фото
            await cache_file_id(photo_path, file_id)

        return msg
    except Exception as e:
        raise e


async def answer_cached_photo(
    message: Message,
    photo_path: Path,
    caption: str = None,
    reply_markup=None,
    **kwargs
) -> Optional[Message]:
    """
    Ответить фото с использованием кэша file_id.
    Удобный враппер для message.answer_photo.
    """
    bot = message.bot
    chat_id = message.chat.id
    return await send_cached_photo(
        bot=bot,
        chat_id=chat_id,
        photo_path=photo_path,
        caption=caption,
        reply_markup=reply_markup,
        **kwargs
    )


async def get_cached_input_media_photo(
    photo_path: Path,
    caption: str = None,
    **kwargs
):
    """
    Получить InputMediaPhoto с использованием кэша file_id.
    Если file_id закэширован — использует его, иначе — FSInputFile.
    """
    from aiogram.types import InputMediaPhoto

    # Пробуем получить из кэша
    cached_id = await get_cached_file_id(photo_path)

    if cached_id:
        return InputMediaPhoto(media=cached_id, caption=caption, **kwargs)

    # Fallback на FSInputFile
    return InputMediaPhoto(media=FSInputFile(photo_path), caption=caption, **kwargs)
