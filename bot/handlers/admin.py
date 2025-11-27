from aiogram import Router, F, Bot
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database.models.users import User
from core.config import settings
from core.saloon_status import (
    saloon_manager,
    LoadStatus,
    LOAD_STATUS_DISPLAY,
    generate_status_message,
)
from bot.states.admin import AdminStates

router = Router()


# ══════════════════════════════════════════════════════════════
#                        ФИЛЬТРЫ
# ══════════════════════════════════════════════════════════════

def is_admin(user_id: int) -> bool:
    """Проверка, является ли пользователь админом"""
    return user_id in settings.ADMIN_IDS


# ══════════════════════════════════════════════════════════════
#                        КЛАВИАТУРЫ
# ══════════════════════════════════════════════════════════════

def get_admin_keyboard() -> InlineKeyboardMarkup:
    """Главное меню админки"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📊 Статус Салуна", callback_data="admin_status_menu")
        ],
        [
            InlineKeyboardButton(text="👶 Режим новичка", callback_data="admin_newbie_mode")
        ],
    ])
    return kb


def get_admin_back_keyboard() -> InlineKeyboardMarkup:
    """Кнопка назад в админку"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="◀️ Назад", callback_data="admin_panel")
        ],
    ])
    return kb


def get_status_menu_keyboard() -> InlineKeyboardMarkup:
    """Меню управления статусом"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🚦 Загруженность", callback_data="admin_load_status")
        ],
        [
            InlineKeyboardButton(text="👥 Клиенты онлайн", callback_data="admin_clients_online"),
            InlineKeyboardButton(text="📋 Заказы в работе", callback_data="admin_orders_count")
        ],
        [
            InlineKeyboardButton(text="📌 Отправить закреп", callback_data="admin_send_pin")
        ],
        [
            InlineKeyboardButton(text="🔄 Обновить закреп", callback_data="admin_update_pin")
        ],
        [
            InlineKeyboardButton(text="◀️ Назад", callback_data="admin_panel")
        ],
    ])
    return kb


def get_load_status_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура выбора уровня загруженности"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(
                text=f"{LOAD_STATUS_DISPLAY[LoadStatus.LOW][0]} Свободно",
                callback_data="admin_set_load_low"
            )
        ],
        [
            InlineKeyboardButton(
                text=f"{LOAD_STATUS_DISPLAY[LoadStatus.MEDIUM][0]} Средняя загрузка",
                callback_data="admin_set_load_medium"
            )
        ],
        [
            InlineKeyboardButton(
                text=f"{LOAD_STATUS_DISPLAY[LoadStatus.HIGH][0]} Очень плотно",
                callback_data="admin_set_load_high"
            )
        ],
        [
            InlineKeyboardButton(text="◀️ Назад", callback_data="admin_status_menu")
        ],
    ])
    return kb


def get_back_to_status_keyboard() -> InlineKeyboardMarkup:
    """Кнопка назад к меню статуса"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="◀️ Назад", callback_data="admin_status_menu")
        ],
    ])
    return kb


def get_cancel_keyboard() -> InlineKeyboardMarkup:
    """Кнопка отмены ввода"""
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="❌ Отмена", callback_data="admin_status_menu")
        ],
    ])
    return kb


# ══════════════════════════════════════════════════════════════
#                        ХЕНДЛЕРЫ
# ══════════════════════════════════════════════════════════════

@router.message(Command("admin"))
async def cmd_admin(message: Message, state: FSMContext):
    """Админ-панель"""
    if not is_admin(message.from_user.id):
        return

    await state.clear()

    text = """⚙️  <b>Админ-панель</b>

◈  <b>Статус Салуна</b> — управление загруженностью,
    клиентами и закрепом

◈  <b>Режим новичка</b> — сбросит принятие оферты,
    чтобы увидеть флоу как новый пользователь"""

    await message.answer(text, reply_markup=get_admin_keyboard())


@router.callback_query(F.data == "admin_panel")
async def show_admin_panel(callback: CallbackQuery, state: FSMContext):
    """Вернуться в админ-панель"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await state.clear()
    await callback.answer()

    text = """⚙️  <b>Админ-панель</b>

◈  <b>Статус Салуна</b> — управление загруженностью,
    клиентами и закрепом

◈  <b>Режим новичка</b> — сбросит принятие оферты,
    чтобы увидеть флоу как новый пользователь"""

    await callback.message.edit_text(text, reply_markup=get_admin_keyboard())


# ══════════════════════════════════════════════════════════════
#                    МЕНЮ СТАТУСА САЛУНА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_status_menu")
async def show_status_menu(callback: CallbackQuery, state: FSMContext):
    """Показать меню управления статусом"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await state.clear()
    await callback.answer()

    status = await saloon_manager.get_status()
    load = LoadStatus(status.load_status)
    emoji, title, _ = LOAD_STATUS_DISPLAY[load]

    text = f"""📊  <b>Статус Салуна</b>

<b>Текущие показатели:</b>

{emoji}  Загруженность: <b>{title}</b>
👥  Клиентов онлайн: <b>{status.clients_online}</b>
📋  Заказов в работе: <b>{status.orders_in_progress}</b>

📌  Закреп: {"настроен" if status.pinned_message_id else "не настроен"}"""

    await callback.message.edit_text(text, reply_markup=get_status_menu_keyboard())


# ══════════════════════════════════════════════════════════════
#                    УПРАВЛЕНИЕ ЗАГРУЖЕННОСТЬЮ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_load_status")
async def show_load_status_menu(callback: CallbackQuery):
    """Показать меню выбора загруженности"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()

    status = await saloon_manager.get_status()
    load = LoadStatus(status.load_status)
    emoji, title, desc = LOAD_STATUS_DISPLAY[load]

    text = f"""🚦  <b>Загруженность</b>

Текущий статус: {emoji} <b>{title}</b>
<i>{desc}</i>

Выбери новый уровень:"""

    await callback.message.edit_text(text, reply_markup=get_load_status_keyboard())


@router.callback_query(F.data.startswith("admin_set_load_"))
async def set_load_status(callback: CallbackQuery):
    """Установить уровень загруженности"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    load_map = {
        "admin_set_load_low": LoadStatus.LOW,
        "admin_set_load_medium": LoadStatus.MEDIUM,
        "admin_set_load_high": LoadStatus.HIGH,
    }

    new_load = load_map.get(callback.data)
    if not new_load:
        await callback.answer("Неизвестный статус", show_alert=True)
        return

    await saloon_manager.set_load_status(new_load)
    emoji, title, _ = LOAD_STATUS_DISPLAY[new_load]

    await callback.answer(f"Установлено: {emoji} {title}", show_alert=True)

    # Возвращаемся в меню статуса — обновляем текст
    status = await saloon_manager.get_status()
    load = LoadStatus(status.load_status)
    emoji_new, title_new, _ = LOAD_STATUS_DISPLAY[load]

    text = f"""📊  <b>Статус Салуна</b>

<b>Текущие показатели:</b>

{emoji_new}  Загруженность: <b>{title_new}</b>
👥  Клиентов онлайн: <b>{status.clients_online}</b>
📋  Заказов в работе: <b>{status.orders_in_progress}</b>

📌  Закреп: {"настроен" if status.pinned_message_id else "не настроен"}"""

    await callback.message.edit_text(text, reply_markup=get_status_menu_keyboard())


# ══════════════════════════════════════════════════════════════
#                    УПРАВЛЕНИЕ КЛИЕНТАМИ ОНЛАЙН
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_clients_online")
async def ask_clients_count(callback: CallbackQuery, state: FSMContext):
    """Запросить количество клиентов онлайн"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()

    status = await saloon_manager.get_status()

    text = f"""👥  <b>Клиенты онлайн</b>

Текущее значение: <b>{status.clients_online}</b>

Введи новое число:"""

    await callback.message.edit_text(text, reply_markup=get_cancel_keyboard())
    await state.set_state(AdminStates.waiting_clients_count)


@router.message(AdminStates.waiting_clients_count)
async def set_clients_count(message: Message, state: FSMContext):
    """Установить количество клиентов"""
    if not is_admin(message.from_user.id):
        return

    try:
        count = int(message.text.strip())
        if count < 0:
            raise ValueError("Число должно быть неотрицательным")

        await saloon_manager.set_clients_online(count)
        await state.clear()

        text = f"""✅  <b>Готово!</b>

Клиентов онлайн: <b>{count}</b>"""

        await message.answer(text, reply_markup=get_back_to_status_keyboard())

    except ValueError:
        await message.answer(
            "❌ Введи корректное число (0 или больше)",
            reply_markup=get_cancel_keyboard()
        )


# ══════════════════════════════════════════════════════════════
#                    УПРАВЛЕНИЕ ЗАКАЗАМИ В РАБОТЕ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_orders_count")
async def ask_orders_count(callback: CallbackQuery, state: FSMContext):
    """Запросить количество заказов в работе"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()

    status = await saloon_manager.get_status()

    text = f"""📋  <b>Заказы в работе</b>

Текущее значение: <b>{status.orders_in_progress}</b>

Введи новое число:"""

    await callback.message.edit_text(text, reply_markup=get_cancel_keyboard())
    await state.set_state(AdminStates.waiting_orders_count)


@router.message(AdminStates.waiting_orders_count)
async def set_orders_count(message: Message, state: FSMContext):
    """Установить количество заказов"""
    if not is_admin(message.from_user.id):
        return

    try:
        count = int(message.text.strip())
        if count < 0:
            raise ValueError("Число должно быть неотрицательным")

        await saloon_manager.set_orders_in_progress(count)
        await state.clear()

        text = f"""✅  <b>Готово!</b>

Заказов в работе: <b>{count}</b>"""

        await message.answer(text, reply_markup=get_back_to_status_keyboard())

    except ValueError:
        await message.answer(
            "❌ Введи корректное число (0 или больше)",
            reply_markup=get_cancel_keyboard()
        )


# ══════════════════════════════════════════════════════════════
#                    ЗАКРЕПЛЕННОЕ СООБЩЕНИЕ
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_send_pin")
async def ask_pin_chat_id(callback: CallbackQuery, state: FSMContext):
    """Запросить ID чата для отправки закрепа"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    await callback.answer()

    # Предпросмотр сообщения
    status = await saloon_manager.get_status()
    preview = generate_status_message(status)

    text = f"""📌  <b>Отправить закреп</b>

<b>Предпросмотр:</b>

{preview}

━━━━━━━━━━━━━━━━━━━━━

Введи ID чата/канала (число со знаком минус для каналов):

<i>Например: -1001234567890</i>"""

    await callback.message.edit_text(text, reply_markup=get_cancel_keyboard())
    await state.set_state(AdminStates.waiting_pin_chat_id)


@router.message(AdminStates.waiting_pin_chat_id)
async def send_pin_message(message: Message, state: FSMContext, bot: Bot):
    """Отправить закрепленное сообщение"""
    if not is_admin(message.from_user.id):
        return

    try:
        chat_id = int(message.text.strip())

        status = await saloon_manager.get_status()
        text = generate_status_message(status)

        # Отправляем сообщение
        sent_msg = await bot.send_message(chat_id=chat_id, text=text)

        # Пытаемся закрепить
        try:
            await bot.pin_chat_message(
                chat_id=chat_id,
                message_id=sent_msg.message_id,
                disable_notification=True
            )
            pin_status = "и закреплено"
        except Exception:
            pin_status = "(закрепить вручную)"

        # Сохраняем ID сообщения
        await saloon_manager.set_pinned_message(chat_id, sent_msg.message_id)
        await state.clear()

        result_text = f"""✅  <b>Готово!</b>

Сообщение отправлено {pin_status}.

Chat ID: <code>{chat_id}</code>
Message ID: <code>{sent_msg.message_id}</code>

Теперь можешь обновлять его через кнопку «Обновить закреп»."""

        await message.answer(result_text, reply_markup=get_back_to_status_keyboard())

    except ValueError:
        await message.answer(
            "❌ Введи корректный ID чата (число)",
            reply_markup=get_cancel_keyboard()
        )
    except Exception as e:
        await message.answer(
            f"❌ Ошибка отправки:\n<code>{e}</code>\n\nПроверь, что бот добавлен в чат/канал как администратор.",
            reply_markup=get_cancel_keyboard()
        )


@router.callback_query(F.data == "admin_update_pin")
async def update_pin_message(callback: CallbackQuery, bot: Bot):
    """Обновить закрепленное сообщение"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    status = await saloon_manager.get_status()

    if not status.pinned_message_id or not status.pinned_chat_id:
        await callback.answer(
            "Сначала отправь закреп через «Отправить закреп»",
            show_alert=True
        )
        return

    try:
        text = generate_status_message(status)
        await bot.edit_message_text(
            chat_id=status.pinned_chat_id,
            message_id=status.pinned_message_id,
            text=text
        )
        await callback.answer("✅ Закреп обновлён!", show_alert=True)

    except Exception as e:
        await callback.answer(
            f"Ошибка обновления: {str(e)[:100]}",
            show_alert=True
        )


# ══════════════════════════════════════════════════════════════
#                    РЕЖИМ НОВИЧКА
# ══════════════════════════════════════════════════════════════

@router.callback_query(F.data == "admin_newbie_mode")
async def enable_newbie_mode(callback: CallbackQuery, session: AsyncSession):
    """Включить режим новичка (сбросить принятие оферты)"""
    if not is_admin(callback.from_user.id):
        await callback.answer("Доступ запрещён", show_alert=True)
        return

    telegram_id = callback.from_user.id

    # Получаем пользователя
    query = select(User).where(User.telegram_id == telegram_id)
    result = await session.execute(query)
    user = result.scalar_one_or_none()

    if user:
        # Сбрасываем принятие оферты
        user.terms_accepted_at = None
        await session.commit()

        text = """👶  <b>Режим новичка включён</b>

Твоя оферта сброшена. Теперь нажми /start
и увидишь флоу как новый пользователь.

<i>Голосовое и уведомления админам
также придут заново.</i>"""

    else:
        text = """❌  Пользователь не найден в БД.

Нажми /start чтобы создать запись."""

    await callback.answer()
    await callback.message.edit_text(text, reply_markup=get_admin_back_keyboard())
