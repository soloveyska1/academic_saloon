from aiogram import Router, F
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from bot.keyboards.inline import (
    get_start_keyboard,
    get_codex_keyboard,
    get_codex_full_keyboard,
    get_referral_keyboard,
    get_back_keyboard,
    get_main_reply_keyboard
)
from core.config import settings

router = Router()


# ══════════════════════════════════════════════════════════════
#                    REPLY KEYBOARD HANDLERS
# ══════════════════════════════════════════════════════════════

@router.message(F.text == "📝 Заказать работу")
async def reply_create_order(message: Message, state: FSMContext):
    """Создать заказ (Reply keyboard)"""
    from bot.handlers.orders import start_order_creation
    await start_order_creation(message, state)


@router.message(F.text == "👤 Мои заказы")
async def reply_my_orders(message: Message, session: AsyncSession):
    """Мои заказы (Reply keyboard)"""
    telegram_id = message.from_user.id
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    orders_count = user.orders_count if user else 0

    text = f"""👤  <b>Мои заказы</b>


◈  Всего заказов: {orders_count}

<i>Здесь будет история твоих заказов.</i>"""

    await message.answer(text)


@router.message(F.text == "💰 Мой баланс")
async def reply_balance(message: Message, session: AsyncSession):
    """Мой баланс (Reply keyboard)"""
    telegram_id = message.from_user.id
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    balance = user.balance if user else 0

    text = f"""💰  <b>Мой баланс</b>


Баланс: <b>{balance:.0f} ₽</b>


<i>Пополняется бонусами за друзей
и компенсациями. Можно тратить
на свои заказы.</i>"""

    await message.answer(text)


@router.message(F.text == "💬 Написать Хозяину")
async def reply_contact_owner(message: Message):
    """Написать Хозяину (Reply keyboard)"""
    text = f"""💬  <b>Написать Хозяину</b>


Пиши напрямую: @{settings.SUPPORT_USERNAME}

Отзывы: <a href="{settings.REVIEWS_CHANNEL}">канал</a>


<i>Отвечаю в течение пары часов,
обычно быстрее.</i>"""

    await message.answer(text, disable_web_page_preview=True)


@router.message(F.text == "🤝 Привести друга")
async def reply_referral(message: Message, session: AsyncSession):
    """Привести друга (Reply keyboard)"""
    telegram_id = message.from_user.id
    referral_link = f"https://t.me/{settings.BOT_USERNAME}?start=ref{telegram_id}"

    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    referrals_count = user.referrals_count if user else 0
    referral_earnings = user.referral_earnings if user else 0

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

    await message.answer(text)


@router.message(F.text == "📜 Прайс-лист")
async def reply_price_list(message: Message):
    """Прайс-лист (Reply keyboard)"""
    text = """📜  <b>Прайс-лист</b>


<b>Базовые расценки:</b>

◈  Реферат — от 800 ₽
◈  Эссе — от 600 ₽
◈  Контрольная — от 1000 ₽
◈  Курсовая — от 3000 ₽
◈  Дипломная — от 15000 ₽
◈  Презентация — от 500 ₽


<i>Точная цена зависит от объёма,
сложности и сроков. Скидывай задачу —
посчитаю индивидуально.</i>"""

    await message.answer(text)


@router.message(F.text == "⚖️ Правила")
async def reply_rules(message: Message):
    """Правила (Reply keyboard)"""
    await message.answer(CODEX_SHORT)


# ══════════════════════════════════════════════════════════════
#                        ТЕКСТЫ КОДЕКСА
# ══════════════════════════════════════════════════════════════

CODEX_SHORT = """📜  <b>Кодекс Салуна</b>

Партнёр, вот что важно знать:


<b>Что ты получаешь</b>

◈  Работу с нуля — оригинальность от 85%
◈  Три бесплатные правки
◈  Защиту от «Кольца вузов» — не светим в антиплагиат
◈  Полную конфиденциальность
◈  Возврат 100%, если передумал до старта


<b>Как это работает</b>

Мы готовим учебные материалы — образцы и примеры для изучения. Как ты их используешь дальше — твоё решение.


<b>Оплата</b>

Половина вперёд, половина после проверки.
На проверку — три дня.


<i>Оплачивая заказ, принимаешь эти условия.</i>"""


CODEX_FULL = """📜  <b>Кодекс Салуна</b>
<i>полная версия</i>


<b>Что мы делаем</b>

Готовим учебные материалы: образцы работ, примеры оформления, аналитику — всё, что помогает разобраться в теме.

Ты получаешь основу для изучения. Как используешь — твоё решение и ответственность.


<b>Твои гарантии</b>

◈  <b>Качество</b>
Пишем с нуля, оригинальность от 85%.

◈  <b>Правки</b>
Три итерации бесплатно — уточнения, дополнения, исправления по замечаниям. Хватает почти всегда.

Смена темы, рост объёма больше 20%, новые требования после старта — это уже другая задача, обсудим отдельно.

◈  <b>Сроки</b>
Держим слово. Задержка больше трёх дней по нашей вине — скидка 15% или полный возврат.

Срок считается с момента оплаты и получения всех материалов от тебя.

◈  <b>Конфиденциальность</b>
Никому ничего не передаём. Не публикуем, не продаём. Что было в Салуне — остаётся в Салуне.


<b>Про антиплагиат</b>

Мы не проверяем работу заранее — и вот почему.

Вузовские системы запоминают каждый проверенный документ. Если мы проверим до сдачи — текст попадёт в базу. Когда загрузишь сам — могут пометить как дубликат.

Поэтому пишем качественно с нуля и не светим твой текст в системах. Если после сдачи возникнут проблемы с процентом — бесплатно доработаем в течение недели. Просто пришли скрин отчёта.

Хочешь проверить сам? Text.ru, Content-Watch — это безопасно.


<b>Оплата и возврат</b>

Схема: 50% аванс → работа → 50% после проверки.

▸  Отмена до начала — возврат 100%
▸  Отмена в процессе — возврат 50%
▸  После получения работы — возврат невозможен

«Не понравился стиль», «препод не принял», «оказалось нужно по-другому» — не основание для возврата. Обсуждай детали до начала работы.


<b>Проверка работы</b>

После получения — три дня на замечания и правки. Молчишь три дня — заказ принят. Нужно больше времени — скажи заранее.


<b>Бонусы за друзей</b>

Приводишь друга — получаешь 5% от его заказа на баланс. Друг получает скидку 5% на первый заказ.


<b>Для постоянных</b>

🥉  от 3 заказов — скидка 5%
🥈  от 7 заказов — скидка 10%
🥇  от 15 заказов — скидка 15% и приоритет

Статус остаётся навсегда.


<b>Важно понимать</b>

Мы не твой преподаватель и не можем гарантировать, что работу примут. Делаем качественно по твоему заданию, но решение третьей стороны — не в наших руках.

Диплом за два дня не будет шедевром. Сложные вещи требуют времени.


<i>Оплачивая заказ, подтверждаешь согласие с условиями.</i>


Вопросы — @{settings.SUPPORT_USERNAME}"""


# ══════════════════════════════════════════════════════════════
#                         ХЕНДЛЕРЫ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "profile")
async def show_profile(callback: CallbackQuery, session: AsyncSession):
    """Досье пользователя"""
    await callback.answer()
    
    telegram_id = callback.from_user.id
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        await callback.message.edit_text("Досье не найдено.", reply_markup=get_back_keyboard())
        return

    status, discount = user.loyalty_status
    discount_line = f"◈  Скидка: {discount}%" if discount > 0 else ""

    text = f"""🤠  <b>Досье</b>


◈  {user.fullname}
◈  Баланс: {user.balance:.0f} ₽
◈  Заказов: {user.orders_count}

{status}
{discount_line}"""

    await callback.message.edit_text(text.strip(), reply_markup=get_back_keyboard())


@router.callback_query(F.data == "finance")
async def show_finance(callback: CallbackQuery, session: AsyncSession):
    """Казна пользователя"""
    await callback.answer()
    
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

    await callback.message.edit_text(text, reply_markup=get_back_keyboard())


@router.callback_query(F.data == "support")
async def call_support(callback: CallbackQuery):
    """Связь с поддержкой"""
    await callback.answer()
    
    text = f"""⭐  <b>Шериф на связи</b>


Пиши: @{settings.SUPPORT_USERNAME}

Отзывы: <a href="{settings.REVIEWS_CHANNEL}">канал</a>


<i>Отвечаю в течение пары часов,
обычно быстрее.</i>"""

    await callback.message.edit_text(text, reply_markup=get_back_keyboard(), disable_web_page_preview=True)


@router.callback_query(F.data == "codex")
async def show_codex_short(callback: CallbackQuery):
    """Краткая версия Кодекса"""
    await callback.answer()
    await callback.message.edit_text(CODEX_SHORT, reply_markup=get_codex_keyboard())


@router.callback_query(F.data == "codex_full")
async def show_codex_full(callback: CallbackQuery):
    """Полная версия Кодекса"""
    await callback.answer()
    await callback.message.edit_text(CODEX_FULL, reply_markup=get_codex_full_keyboard())


@router.callback_query(F.data == "referral")
async def show_referral(callback: CallbackQuery, session: AsyncSession):
    """Реферальная программа"""
    await callback.answer()
    
    telegram_id = callback.from_user.id
    referral_link = f"https://t.me/{settings.BOT_USERNAME}?start=ref{telegram_id}"
    
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()
    
    referrals_count = user.referrals_count if user else 0
    referral_earnings = user.referral_earnings if user else 0

    text = f"""🐎  <b>Позови друга</b>


Твоя ссылка:
<code>{referral_link}</code>


<b>Как это работает</b>

Друг переходит по ссылке и делает заказ.
Ты получаешь 5% от суммы на баланс.
Друг получает скидку 5% на первый заказ.


<b>Твоя статистика</b>

◈  Приглашено: {referrals_count}
◈  Заработано: {referral_earnings:.0f} ₽"""

    await callback.message.edit_text(
        text,
        reply_markup=get_referral_keyboard(f"Помощь с учёбой — {referral_link}")
    )


@router.callback_query(F.data == "about")
async def show_about(callback: CallbackQuery):
    """О сервисе"""
    await callback.answer()
    
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

    await callback.message.edit_text(text, reply_markup=get_back_keyboard(), disable_web_page_preview=True)


@router.callback_query(F.data == "back_to_menu")
async def back_to_menu(callback: CallbackQuery):
    """Возврат в главное меню"""
    await callback.answer()
    await callback.message.edit_text(
        "🏚  <b>Салун</b>\n\n"
        "Чем могу помочь, партнёр?",
        reply_markup=get_start_keyboard()
    )