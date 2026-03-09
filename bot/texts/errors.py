"""
Error messages for bot.
Premium minimalism tone.
"""

ERROR_COMPENSATION_BONUS = 50  # ₽ bonus for experiencing an error


def get_error_message(user_name: str) -> str:
    """User-facing error message with compensation."""
    return f"""<b>Временные неполадки</b>

{user_name}, возникла техническая пауза. Ваши заказы и баланс в безопасности.

За неудобства начислена компенсация:
<b>+{ERROR_COMPENSATION_BONUS} ₽</b> на баланс.

<i>Если вопрос срочный — напишите в поддержку.</i>"""


ERROR_GENERIC = "Произошла ошибка. Попробуйте ещё раз или обратитесь в поддержку."

ERROR_ORDER_NOT_FOUND = "Заказ не найден."

ERROR_ACCESS_DENIED = "Доступ ограничен."

ERROR_RATE_LIMIT = "Слишком много запросов. Подождите немного."

ERROR_FILE_TOO_LARGE = "Файл слишком большой. Максимум — 20 МБ."

ERROR_FILE_TYPE = "Этот тип файла не поддерживается."

ERROR_ORDER_LIMIT = "Достигнут лимит активных заказов. Завершите текущие, прежде чем создавать новые."

ERROR_BAN_MESSAGE = """<b>Доступ ограничен</b>

Ваш аккаунт заблокирован.

Если считаете это ошибкой — обратитесь в поддержку."""
