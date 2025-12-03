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
    get_main_menu_keyboard,
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
#                    ГЛАВНОЕ МЕНЮ — ПЕРЕИСПОЛЬЗУЕМАЯ ФУНКЦИЯ
# ══════════════════════════════════════════════════════════════

def build_main_menu_text(user_name: str) -> str:
    """
    Формирует текст главного меню — combined status + welcome, always 24/7.

    Args:
        user_name: Имя пользователя (not used in simplified message)

    Returns:
        HTML-форматированный текст меню
    """
    return """🌟 <b>АКАДЕМИЧЕСКИЙ САЛУН — ОТКРЫТО 24/7</b>
⚡️ Оперативная помощь. 1000+ сделок. Гарантия.

Привет, партнер! Учеба прижала к стенке? Мы здесь, чтобы прикрыть твою спину. Выбери, что нужно сделать, и мы найдем лучшего стрелка под твою задачу.

👇 Жми на главную кнопку внизу.

<i>Нажимая кнопки, ты соглашаешься с правилами сервиса.</i>"""


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
    text = build_main_menu_text(user_name)
    keyboard = get_main_menu_keyboard()
    sent_message = None

    # Пытаемся отправить с новой картинкой (saloon_first.jpg)
    if settings.WELCOME_IMAGE.exists():
        try:
            sent_message = await send_cached_photo(
                bot=bot,
                chat_id=chat_id,
                photo_path=settings.WELCOME_IMAGE,
                caption=text,
                reply_markup=keyboard,
            )
        except Exception as e:
            logger.warning(f"Не удалось отправить картинку меню: {e}")

    # Fallback: просто текст
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
    "Рад видеть тебя снова, партнёр.",
    "Двери Салуна всегда открыты для своих.",
    "Присаживайся, тут тебе рады.",
    "Хорошо, что заглянул. Что на этот раз?",
    "Салун ждал тебя, странник.",
    "Виски на столе, дела на стойке. Выбирай.",
    "С возвращением. Чем помочь?",
    "Тут ничего не изменилось — надёжность и качество.",
]

MENU_QUOTES = [
    "🌵 «В Салуне не обманывают своих»",
    "🐎 «Хороший партнёр — на вес золота»",
    "🎯 «Мы не промахиваемся по дедлайнам»",
    "🤠 «Шериф следит за порядком»",
    "⭐ «Честность — лучшая политика»",
    "🔥 «Работа кипит, пока ты отдыхаешь»",
    "💨 «Быстрее ветра, надёжнее скалы»",
    "🏜 «Через любую сессию — к победе»",
]


def get_menu_text() -> str:
    """Генерирует атмосферный текст для главного меню"""
    greeting = random.choice(MENU_GREETINGS)
    quote = random.choice(MENU_QUOTES)

    return f"""🏚  <b>Академический Салун</b>

{greeting}

<i>{quote}</i>"""

router = Router()


# ══════════════════════════════════════════════════════════════
#                    МАНИФЕСТ ШЕРИФА (КОДЕКС)
# ══════════════════════════════════════════════════════════════

def build_codex_caption() -> str:
    """Формирует caption для Кодекса — короткий манифест"""
    lines = [
        "⚖️ <b>Кодекс Чести Салуна</b>",
        "",
        "Мы работаем по старым законам Дикого Запада: слово — кремень.",
        "",
        "💎 <b>Качество:</b> Пишем с нуля. Уникальность <b>85%+</b>.",
        "🕵️ <b>Анонимность:</b> Твоя тайна умрет с нами. В вузовские базы текст <b>не сливаем</b>.",
        "🔄 <b>Правки:</b> <b>3 итерации</b> бесплатно. Доводим до ума.",
        "💰 <b>Moneyback:</b> Передумал до старта? Вернем <b>100%</b>.",
        "🤝 <b>Честность:</b> Срок провален на 3 дня? Вернем деньги или дадим скидку.",
        "",
        "<i>Оплачивая заказ, ты скрепляешь этот договор рукопожатием.</i>",
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
    """Формирует caption для связи с Шерифом"""
    lines = [
        "📬 <b>Прямая линия с Шерифом</b>",
        "",
        "Есть вопрос по заказу? Хочешь обсудить сложную задачу? Или что-то пошло не так?",
        "",
        "Я на связи. Пиши смело — разрулим любую ситуацию.",
        "",
        "<i>⚡️ Ответ прилетит быстрее пули (обычно за 5-15 минут).</i>",
    ]
    return "\n".join(lines)


def get_support_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для связи с Шерифом — URL кнопки"""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text=f"✈️ Написать лично (@{settings.SUPPORT_USERNAME})",
            url=f"https://t.me/{settings.SUPPORT_USERNAME}"
        )],
        [InlineKeyboardButton(
            text="⭐ Почитать отзывы (Канал)",
            url=settings.REVIEWS_CHANNEL
        )],
        [InlineKeyboardButton(text="🌵 Обратно в салун", callback_data="back_to_menu")],
    ])


@router.callback_query(F.data == "contact_owner")
async def show_contact_owner(callback: CallbackQuery, bot: Bot):
    """Написать Шерифу — фото с caption"""
    await callback.answer()

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Открыл «Написать Шерифу»",
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
        "📜 <b>ТАРИФЫ И ГАРАНТИИ САЛУНА</b>",
        "",
        "<blockquote>🛡 <b>МЫ РАБОТАЕМ НА СОВЕСТЬ</b>",
        "",
        "🔒 <b>Цифровая гигиена:</b> Мы НЕ загружаем работу в вузовские системы (Антиплагиат.ВУЗ) до твоей сдачи. Файл остаётся «чистым».",
        "",
        "🔄 <b>3 Круга правок:</b> В цену включены 3 полноценные итерации доработок по замечаниям научрука.",
        "",
        "📝 <b>Оформление:</b> Сразу делаем по ГОСТ или методичке.</blockquote>",
        "",
        "<i>Минимальный чек Салуна — 2 500 ₽</i>",
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
        "Скидывай задание — Шериф оценит индивидуально.",
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
    """Казна пользователя"""
    await callback.answer("⏳")

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Открыл «Казна»",
        session=session,
    )

    telegram_id = callback.from_user.id
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    balance = user.balance if user else 0

    text = f"""💰  <b>Казна</b>


Баланс: <b>{balance:.0f} ₽</b>


<i>Пополняется бонусами за друзей
и компенсациями. Можно тратить
на свои заказы.</i>"""

    await safe_delete_message(callback)
    await bot.send_message(callback.message.chat.id, text, reply_markup=get_back_keyboard())


@router.callback_query(F.data == "support")
async def call_support(callback: CallbackQuery, bot: Bot):
    """Связь с поддержкой — выбор способа связи"""
    from bot.keyboards.inline import get_sheriff_choice_keyboard

    await callback.answer("🤠")

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Открыл «Шериф на связи»",
    )

    text = """🛡️ <b>Шериф к вашим услугам!</b>

Выбери, как хочешь связаться:

<b>💬 Телеграм</b> — напишешь мне напрямую,
отвечу в течение пары часов (обычно быстрее)

<b>🤖 Чат здесь</b> — пиши прямо в боте,
увижу сразу и отвечу сюда же

<i>Выбирай, партнёр! 🤠</i>"""

    await safe_delete_message(callback)
    await callback.message.answer(text, reply_markup=get_sheriff_choice_keyboard(), disable_web_page_preview=True)


@router.callback_query(F.data == "codex")
async def show_codex(callback: CallbackQuery, bot: Bot):
    """Кодекс Чести — манифест с фото и ссылкой на Telegraph"""
    await callback.answer()

    # Логируем
    await log_action(
        bot=bot,
        event=LogEvent.NAV_BUTTON,
        user=callback.from_user,
        details="Открыл «Кодекс»",
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

    text = f"""🤝  <b>Привести друга</b>


Твоя ссылка:
<code>{referral_link}</code>


<b>Как это работает</b>

Друг переходит по ссылке и делает заказ.
Ты получаешь 5% от суммы на баланс.
Друг получает скидку 5% на первый заказ.


<b>Твоя статистика</b>

◈  Приглашено: {referrals_count}
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

    text = f"""🏚  <b>Академический Салун</b>


Помощь с учёбой для тех,
кому нужен надёжный партнёр.

◈  Курсовые и дипломы
◈  Рефераты и эссе
◈  Контрольные и доклады
◈  Презентации и отчёты


Отзывы: <a href="{settings.REVIEWS_CHANNEL}">канал</a>


<i>Работаем честно.
Пишем качественно.
Не подводим.</i>"""

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
    user_name = callback.from_user.full_name or "Партнёр"
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

    text = """🎁 <b>Тайник Салуна</b>

Хо-хо, ковбой нашёл секретную комнату!

<b>🎯 Как получить скидку:</b>

◈ <b>Первый заказ:</b> −5% автоматически
◈ <b>Приведи друга:</b> +5% на баланс от его заказа
◈ <b>Оптовик:</b> После 3 заказов — скидка 10%

<b>💎 Тайные коды:</b>
Иногда Шериф раздаёт промокоды в <a href="{reviews}">канале отзывов</a>.

<i>Следи за новостями — тут бывает жарко.</i>""".format(reviews=settings.REVIEWS_CHANNEL)

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
    Направляем пользователя к чату с шерифом.
    """
    from bot.keyboards.inline import get_sheriff_choice_keyboard

    # Показываем меню связи с шерифом
    await message.answer(
        "🤔 <b>Хочешь что-то спросить?</b>\n\n"
        "Чтобы связаться с Шерифом, нажми кнопку ниже:\n\n"
        "💬 <i>Так я точно увижу твоё сообщение!</i>",
        reply_markup=get_sheriff_choice_keyboard()
    )
