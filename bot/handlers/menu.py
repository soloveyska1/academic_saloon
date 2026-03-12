import html
import random
import logging
from pathlib import Path

from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery, Message, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.filters import StateFilter
from aiogram.enums import ParseMode
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from bot.keyboards.inline import (
    get_start_keyboard,
    get_codex_keyboard,
    get_referral_keyboard,
    get_back_keyboard,
    get_persistent_menu,
    get_price_list_keyboard
)
from bot.services.logger import log_action, LogEvent, LogLevel
from core.config import settings
from core.media_cache import send_cached_photo

logger = logging.getLogger(__name__)

# Пути к изображениям
SUPPORT_IMAGE_PATH = Path(__file__).parent.parent / "media" / "support.jpg"
PRICE_IMAGE_PATH = Path(__file__).parent.parent / "media" / "deng.jpg"
CODEX_IMAGE_PATH = Path(__file__).parent.parent / "media" / "codex.jpg"


# ══════════════════════════════════════════════════════════════
#                    ГЛАВНОЕ МЕНЮ — App-First Portal
# ══════════════════════════════════════════════════════════════

def build_main_menu_text(user_name: str) -> str:
    """
    Формирует текст главного меню — премиальный, строгий стиль.
    App-First подход: направляем в Mini App.

    Args:
        user_name: Имя пользователя (not used)

    Returns:
        HTML-форматированный текст меню
    """
    return """<b>Academic Saloon</b>

С возвращением. Приложение ждёт.

<i>Заказы, чат, оплата — всё внутри.</i>"""


async def send_main_menu(
    chat_id: int,
    bot: Bot,
    user_name: str,
    pin: bool = False,
) -> None:
    """
    Отправляет главное меню с картинкой — универсальная функция.
    Optionally pins the message for new users.

    Используется:
    - После принятия оферты (accept_rules)
    - По команде /start (если юзер уже зарегистрирован)
    - По кнопке "Назад" (back_to_menu)

    Args:
        chat_id: ID чата для отправки
        bot: Экземпляр бота
        user_name: Имя пользователя (not used in simplified message)
        pin: Закрепить сообщение (для новых пользователей)
    """
    from aiogram.types import FSInputFile
    text = build_main_menu_text(user_name)
    keyboard = get_persistent_menu()
    sent_message = None

    # Try animated GIF first
    if settings.WELCOME_ANIMATION.exists():
        try:
            animation = FSInputFile(settings.WELCOME_ANIMATION)
            sent_message = await bot.send_animation(
                chat_id=chat_id,
                animation=animation,
                caption=text,
                reply_markup=keyboard,
            )
        except Exception as e:
            logger.warning(f"Не удалось отправить анимацию: {e}")

    # Fallback: static image
    if sent_message is None and settings.WELCOME_IMAGE.exists():
        try:
            sent_message = await send_cached_photo(
                bot=bot,
                chat_id=chat_id,
                photo_path=settings.WELCOME_IMAGE,
                caption=text,
                reply_markup=keyboard,
            )
        except Exception as e:
            logger.warning(f"Не удалось отправить картинку: {e}")

    # Fallback: text only
    if sent_message is None:
        sent_message = await bot.send_message(
            chat_id=chat_id,
            text=text,
            reply_markup=keyboard,
        )

    # Pin the message if requested (for new users)
    if pin and sent_message:
        try:
            await bot.pin_chat_message(
                chat_id=chat_id,
                message_id=sent_message.message_id,
                disable_notification=True
            )
        except Exception:
            pass  # Pinning might fail in some cases, that's OK


# ══════════════════════════════════════════════════════════════
#                    АТМОСФЕРНЫЕ ФРАЗЫ ДЛЯ МЕНЮ
# ══════════════════════════════════════════════════════════════

MENU_GREETINGS = [
    "Рад видеть тебя снова.",
    "Все нужные разделы уже под рукой.",
    "Возвращайся, когда понадобится новая задача.",
    "Хорошо, что заглянул. Что на этот раз?",
    "Здесь всё готово к новой заявке.",
    "Открывай приложение и продолжай с нужного шага.",
    "С возвращением. Чем помочь?",
    "Тут ничего не изменилось — надёжность и качество.",
]

MENU_QUOTES = [
    "«Точные сроки и прозрачные условия»",
    "«Качество и конфиденциальность без лишнего шума»",
    "«Всё важное по заказу в одном месте»",
    "«Поддержка отвечает по делу и быстро»",
    "«Спокойный сервис для серьёзных задач»",
    "«Рабочий процесс без лишних обещаний»",
    "«Понятный маршрут от заявки до результата»",
    "«Премиальный опыт в каждой детали»",
]


def get_menu_text() -> str:
    """Генерирует атмосферный текст для главного меню"""
    greeting = random.choice(MENU_GREETINGS)
    quote = random.choice(MENU_QUOTES)

    return f"""<b>Academic Saloon</b>

{greeting}

<i>{quote}</i>"""

router = Router()


# ══════════════════════════════════════════════════════════════
#                    УСЛОВИЯ
# ══════════════════════════════════════════════════════════════

def build_codex_caption() -> str:
    """Формирует caption для раздела условий и гарантий"""
    lines = [
        "⚖️ <b>Условия и гарантии</b>",
        "",
        "Коротко о том, как устроена работа и на что вы можете рассчитывать.",
        "",
        "💎 <b>Качество:</b> Работаем с нуля и под задачу.",
        "🔒 <b>Конфиденциальность:</b> Детали заказа и материалы остаются внутри сервиса.",
        "🔄 <b>Правки:</b> Три круга правок включены, дальше обсуждаем отдельно.",
        "💰 <b>Возврат:</b> Полный возврат возможен, если работа ещё не начата.",
        "⏱ <b>Сроки:</b> Если что-то требует пересогласования, предупреждаем заранее.",
        "",
        "<i>Полную версию условий можно открыть по кнопке ниже.</i>",
    ]
    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════
#                    НОВЫЕ CALLBACK HANDLERS
# ══════════════════════════════════════════════════════════════

async def safe_delete_message(callback: CallbackQuery) -> None:
    """Безопасное удаление сообщения"""
    if callback.message is None:
        return
    try:
        await callback.message.delete()
    except Exception:
        pass


@router.callback_query(F.data == "my_balance")
async def show_my_balance(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Мой баланс"""
    await callback.answer("⏳")

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Открыл «Мой баланс»",
        session=session,
    )

    telegram_id = callback.from_user.id
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    balance = user.balance if user else 0

    text = f"""💰  <b>Мой баланс</b>


Баланс: <b>{balance:.0f} ₽</b>


<i>Пополняется бонусами за друзей
и компенсациями. Можно тратить
на свои заказы.</i>"""

    await safe_delete_message(callback)
    await bot.send_message(callback.message.chat.id, text, reply_markup=get_back_keyboard())


def build_support_caption() -> str:
    """Формирует caption для связи с поддержкой"""
    lines = [
        "📬 <b>Центр поддержки</b>",
        "",
        "Если нужен ответ по заказу, оплате, срокам или материалам, поддержка здесь.",
        "",
        "Пишите напрямую. Разберёмся по делу и без лишних пересылок.",
        "",
        "<i>Обычно отвечаем в течение 5-15 минут.</i>",
    ]
    return "\n".join(lines)


def get_support_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для связи с поддержкой"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text=f"Написать в Telegram @{settings.SUPPORT_USERNAME}",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
        [InlineKeyboardButton(
            text="Отзывы и кейсы",
            url=settings.REVIEWS_CHANNEL
        )],
        [InlineKeyboardButton(text="В главное меню", callback_data="back_to_menu")],
    ])


@router.callback_query(F.data == "contact_owner")
async def show_contact_owner(callback: CallbackQuery, bot: Bot):
    """Открыть поддержку — фото с caption"""
    await callback.answer()

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Открыл «Поддержку»",
    )

    caption = build_support_caption()
    keyboard = get_support_keyboard()

    # Удаляем старое и отправляем фото
    await safe_delete_message(callback)

    if SUPPORT_IMAGE_PATH.exists():
        try:
            # Используем кэширование file_id
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=SUPPORT_IMAGE_PATH,
                caption=caption,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
            )
            return
        except Exception as e:
            logger.warning(f"Не удалось отправить фото поддержки: {e}")

    # Fallback на текст
    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
    )


def build_price_list_caption() -> str:
    """Формирует caption для прайс-листа — премиальный дизайн с blockquote"""
    lines = [
        "<b>Тарифы и гарантии</b>",
        "",
        "<blockquote>🛡 <b>МЫ РАБОТАЕМ НА СОВЕСТЬ</b>",
        "",
        "🔒 <b>Цифровая гигиена:</b> Мы НЕ загружаем работу в системы проверки до твоей сдачи. Файл остаётся «чистым».",
        "",
        "🔄 <b>3 Круга правок:</b> В цену включены 3 полноценные итерации доработок по замечаниям научрука.",
        "",
        "📝 <b>Оформление:</b> Сразу делаем по ГОСТ или методичке.</blockquote>",
        "",
        "<i>Минимальная стоимость — 2 500 ₽</i>",
        "",
        "🎓 <b>ВЫСШАЯ ЛИГА</b>",
        "• Магистерская ........ <code>от 50 000 ₽</code>",
        "• Диплом (ВКР) ........ <code>от 40 000 ₽</code>",
        "<i>(Пишем главами. Оплата 50/50)</i>",
        "",
        "📚 <b>СТУДЕНЧЕСКАЯ БАЗА</b>",
        "• Курсовая ................. <code>от 14 000 ₽</code>",
        "• Отчёт по практике <code>от 8 000 ₽</code>",
        "",
        "⚡️ <b>МАЛЫЕ ФОРМЫ</b>",
        "• Реферат / Эссе ...... <code>от 2 500 ₽</code>",
        "• Презентация .......... <code>от 2 500 ₽</code>",
        "• Контрольная .......... <code>от 2 500 ₽</code>",
        "",
        "📸 <b>ЗАДАЧИ ПО ФОТО</b>",
        "Отправьте задание — оценим индивидуально.",
        "",
        "⚠️ <i>Цены за стандартный срок. Нужно «вчера»? +30...100%</i>",
    ]
    return "\n".join(lines)


@router.callback_query(F.data == "price_list")
async def show_price_list(callback: CallbackQuery, bot: Bot):
    """Прайс-лист — фото с caption в стиле меню"""
    await callback.answer()

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Открыл «Прайс-лист»",
    )

    caption = build_price_list_caption()
    keyboard = get_price_list_keyboard()

    # Удаляем старое и отправляем фото
    await safe_delete_message(callback)

    if PRICE_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=PRICE_IMAGE_PATH,
                caption=caption,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
            )
            return
        except Exception as e:
            logger.warning(f"Не удалось отправить фото прайс-листа: {e}")

    # Fallback на текст
    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
    )


# ══════════════════════════════════════════════════════════════
#                    СУЩЕСТВУЮЩИЕ CALLBACK HANDLERS
# ══════════════════════════════════════════════════════════════

# NOTE: Обработчик "profile" перенесён в my_orders.py для показа красивого ЛК
# Теперь и "profile", и "my_profile" открывают "ПАСПОРТ КОВБОЯ" с картинкой


@router.callback_query(F.data == "finance")
async def show_finance(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Баланс пользователя"""
    await callback.answer("⏳")

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Открыл «Баланс»",
        session=session,
    )

    telegram_id = callback.from_user.id
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    balance = user.balance if user else 0

    text = f"""<b>Баланс</b>


Баланс: <b>{balance:.0f} ₽</b>


<i>Пополняется бонусами за друзей
и компенсациями. Можно тратить
на свои заказы.</i>"""

    await safe_delete_message(callback)
    await bot.send_message(callback.message.chat.id, text, reply_markup=get_back_keyboard())


@router.callback_query(F.data == "support")
async def call_support(callback: CallbackQuery, bot: Bot):
    """Связь с поддержкой — единый центр помощи"""
    from bot.keyboards.inline import get_support_keyboard

    await callback.answer()

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Открыл «Центр помощи»",
    )

    text = """🛡️ <b>Центр помощи Academic Saloon</b>

Здесь один понятный маршрут:

<b>💬 Чат поддержки</b> — основной способ быстро решить вопрос по заказу, оплате, срокам, правкам или файлам.

<b>✈️ Telegram</b> — запасной внешний канал, если удобнее писать напрямую.

<i>Открой чат поддержки, и мы сразу подхватим диалог.</i>"""

    await safe_delete_message(callback)
    await callback.message.answer(text, reply_markup=get_support_keyboard(), disable_web_page_preview=True)


@router.callback_query(F.data == "codex")
async def show_codex(callback: CallbackQuery, bot: Bot):
    """Условия сервиса — правила с фото и ссылкой на Telegraph"""
    await callback.answer()

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Открыл «Условия сервиса»",
    )

    caption = build_codex_caption()
    keyboard = get_codex_keyboard()

    # Удаляем старое и отправляем фото
    await safe_delete_message(callback)

    if CODEX_IMAGE_PATH.exists():
        try:
            await send_cached_photo(
                bot=bot,
                chat_id=callback.message.chat.id,
                photo_path=CODEX_IMAGE_PATH,
                caption=caption,
                reply_markup=keyboard,
                parse_mode=ParseMode.HTML,
            )
            return
        except Exception as e:
            logger.warning(f"Не удалось отправить фото кодекса: {e}")

    # Fallback на текст
    await bot.send_message(
        chat_id=callback.message.chat.id,
        text=caption,
        reply_markup=keyboard,
        parse_mode=ParseMode.HTML,
    )


@router.callback_query(F.data == "referral")
async def show_referral(callback: CallbackQuery, session: AsyncSession, bot: Bot):
    """Реферальная программа"""
    await callback.answer("⏳")

    telegram_id = callback.from_user.id
    referral_link = f"https://t.me/{settings.BOT_USERNAME}?start=ref{telegram_id}"

    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    referrals_count = user.referrals_count if user else 0
    referral_earnings = user.referral_earnings if user else 0

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Открыл «Привести друга»",
        session=session,
    )

    # Tiered referral info
    from bot.services.bonus import get_referral_tier_info
    tier_info = get_referral_tier_info(referrals_count)
    current_pct = tier_info["current_percent"]

    # Build tier progress line
    tier_lines = []
    for t in tier_info["tiers"]:
        marker = "▸" if t["percent"] == current_pct else " "
        tier_lines.append(f"{marker} {t['range']} друзей — {t['percent']}%")
    tiers_text = "\n".join(tier_lines)

    next_hint = ""
    if tier_info["refs_to_next"] > 0:
        next_hint = f"\n\nЕщё {tier_info['refs_to_next']} — и процент вырастет."

    text = f"""🤝  <b>Внутренний круг</b>


Твоя ссылка:
<code>{referral_link}</code>


<b>Как это работает</b>

Друг переходит по ссылке и делает заказ.
Ты получаешь <b>{current_pct}%</b> от суммы на баланс.
Друг получает скидку 5% на первый заказ.

<b>Уровни бонусов</b>

{tiers_text}

Бонус 2-го уровня: 2% от заказов друзей твоих друзей.{next_hint}


<b>Твоя статистика</b>

◈  Приглашено: {referrals_count}
◈  Твой бонус: {current_pct}%
◈  Заработано: {referral_earnings:.0f} ₽"""

    await safe_delete_message(callback)
    await callback.message.answer(
        text,
        reply_markup=get_referral_keyboard(f"Помощь с учёбой — {referral_link}")
    )


@router.callback_query(F.data == "about")
async def show_about(callback: CallbackQuery, bot: Bot):
    """О сервисе"""
    await callback.answer("⏳")

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Открыл «О сервисе»",
    )

    text = f"""<b>Academic Saloon</b>

Премиальный сервис для академических задач.

◈ Курсовые и выпускные работы
◈ Контрольные, эссе и рефераты
◈ Презентации, практика и нестандартные задачи

Отзывы и примеры: <a href="{settings.REVIEWS_CHANNEL}">канал</a>

<i>Чёткая коммуникация, прозрачная стоимость и сопровождение по заказу.</i>"""

    await safe_delete_message(callback)
    await callback.message.answer(text, reply_markup=get_back_keyboard(), disable_web_page_preview=True)


@router.callback_query(F.data == "back_to_menu")
async def back_to_menu(callback: CallbackQuery, bot: Bot):
    """Возврат в главное меню с персонализированным приветствием"""
    await callback.answer("⏳")

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_MENU,
        user=callback.from_user,
        details="Вернулся в главное меню",
    )

    # Удаляем старое сообщение
    await safe_delete_message(callback)

    # Отправляем персонализированное меню
    user_name = callback.from_user.full_name or "друг"
    chat_id = callback.message.chat.id if callback.message else callback.from_user.id

    await send_main_menu(
        chat_id=chat_id,
        bot=bot,
        user_name=user_name,
    )


# ══════════════════════════════════════════════════════════════
#                    НОВЫЕ CALLBACK'И ГЛАВНОГО МЕНЮ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "start_order")
async def start_order_callback(callback: CallbackQuery, state: FSMContext, bot: Bot, session: AsyncSession):
    """
    Рассчитать стоимость — переход к выбору типа работы.
    Алиас для create_order.
    """
    from bot.handlers.order_flow.entry import start_order as orders_start_order
    await orders_start_order(callback, state, bot, session)


@router.callback_query(F.data == "show_price")
async def show_price_callback(callback: CallbackQuery, bot: Bot):
    """
    Прайс — алиас для price_list.
    """
    await show_price_list(callback, bot)


@router.callback_query(F.data == "free_stuff")
async def show_free_stuff(callback: CallbackQuery, bot: Bot):
    """Тайник (Халява) — секретный раздел с бонусами"""
    await callback.answer("🎁")

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Открыл «Тайник»",
    )

    text = """🎁 <b>Бонусы и предложения</b>

Здесь собраны основные способы получить дополнительную выгоду.

<b>Как это работает:</b>

◈ <b>Первый заказ:</b> стартовая скидка применяется автоматически
◈ <b>Рефералы:</b> за приглашённых друзей начисляется бонус на баланс
◈ <b>Постоянные клиенты:</b> условия усиливаются по мере активности

<b>Промокоды:</b>
Новые предложения периодически появляются в <a href="{reviews}">канале отзывов</a>.

<i>Следите за обновлениями — там публикуем всё актуальное.</i>""".format(reviews=settings.REVIEWS_CHANNEL)

    await safe_delete_message(callback)
    await bot.send_message(
        callback.message.chat.id,
        text,
        reply_markup=get_back_keyboard(),
        disable_web_page_preview=True
    )


# ══════════════════════════════════════════════════════════════
#                    ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ
# ══════════════════════════════════════════════════════════════

@router.message(F.text, StateFilter(None))
async def handle_text_message(message: Message, bot: Bot, session: AsyncSession):
    """
    Обработка текстовых сообщений вне контекста.
    Направляем пользователя к чату поддержки.
    """
    from bot.keyboards.inline import get_support_keyboard

    # Показываем меню поддержки
    await message.answer(
        "🤔 <b>Нужна помощь?</b>\n\n"
        "Откройте чат поддержки кнопкой ниже. Это самый быстрый способ решить вопрос по заказу или оплате.",
        reply_markup=get_support_keyboard()
    )
