"""
Premium QR Code Generator for Academic Saloon

Использует подход "Сэндвич" для создания люксовых QR-карточек:
1. Фоновый шаблон (card_template_bg.png)
2. Золотой QR-код
3. Логотип по центру QR

Ссылка формата: https://t.me/{bot}/app?startapp=ref_{user_id}
"""

import io
import logging
import os
from typing import Optional

try:
    import qrcode
    from qrcode.image.styledpil import StyledPilImage
    from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
    HAS_QR_DEPS = True
except ImportError:
    HAS_QR_DEPS = False

from core.config import settings

logger = logging.getLogger(__name__)

# Paths to assets
ASSETS_DIR = os.path.join(os.path.dirname(__file__), 'assets')
CARD_TEMPLATE_PATH = os.path.join(ASSETS_DIR, 'card_template_bg.png')
LOGO_PATH = os.path.join(ASSETS_DIR, 'shield_logo.png')

# Brand Colors
GOLD_PRIMARY = (212, 175, 55)      # #d4af37
GOLD_LIGHT = (245, 208, 97)        # #f5d061
GOLD_DARK = (179, 135, 40)         # #b38728
BG_DARK = (9, 9, 11)               # #09090b
BG_CARD = (15, 15, 18)             # #0f0f12
TEXT_WHITE = (242, 242, 242)       # #f2f2f2
TEXT_MUTED = (113, 113, 122)       # #71717a


def get_referral_link(user_id: int) -> str:
    """
    Формирует правильную deep-link ссылку на Mini App.
    Формат: https://t.me/{bot}/app?startapp=ref_{user_id}
    """
    bot_username = settings.BOT_USERNAME.lstrip("@")
    return f"https://t.me/{bot_username}/app?startapp=ref_{user_id}"


def create_gold_gradient_background(width: int, height: int) -> Image.Image:
    """Создаёт премиальный градиентный фон с золотыми акцентами."""
    img = Image.new('RGBA', (width, height), BG_DARK)
    draw = ImageDraw.Draw(img)

    # Градиент сверху (золотое свечение)
    for y in range(min(300, height)):
        alpha = int(255 * (1 - y / 300) * 0.12)
        r = min(255, BG_DARK[0] + int((GOLD_PRIMARY[0] - BG_DARK[0]) * alpha / 255))
        g = min(255, BG_DARK[1] + int((GOLD_PRIMARY[1] - BG_DARK[1]) * alpha / 255))
        b = min(255, BG_DARK[2] + int((GOLD_PRIMARY[2] - BG_DARK[2]) * alpha / 255))
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    # Градиент снизу
    for y in range(max(0, height - 200), height):
        progress = (y - (height - 200)) / 200
        alpha = int(progress * 0.08 * 255)
        r = min(255, BG_DARK[0] + int((GOLD_DARK[0] - BG_DARK[0]) * alpha / 255))
        g = min(255, BG_DARK[1] + int((GOLD_DARK[1] - BG_DARK[1]) * alpha / 255))
        b = min(255, BG_DARK[2] + int((GOLD_DARK[2] - BG_DARK[2]) * alpha / 255))
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))

    # Декоративные уголки
    corner_size = 100
    for i in range(corner_size):
        alpha = int((1 - i / corner_size) * 80)
        # Верхний левый
        draw.line([(0, i), (corner_size - i, 0)], fill=(*GOLD_PRIMARY, alpha), width=2)
        # Верхний правый
        draw.line([(width - corner_size + i, 0), (width, i)], fill=(*GOLD_PRIMARY, alpha), width=2)
        # Нижний левый
        draw.line([(0, height - i), (corner_size - i, height)], fill=(*GOLD_DARK, alpha), width=2)
        # Нижний правый
        draw.line([(width - corner_size + i, height), (width, height - i)], fill=(*GOLD_DARK, alpha), width=2)

    return img


def create_qr_code(data: str, size: int = 400) -> Image.Image:
    """Генерирует золотой QR-код с прозрачным фоном."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # 30% можно перекрыть лого!
        box_size=10,
        border=1,
    )
    qr.add_data(data)
    qr.make(fit=True)

    # Создаём QR с закруглёнными модулями
    qr_img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
    )

    # Конвертируем в RGBA
    qr_img = qr_img.convert('RGBA')
    qr_img = qr_img.resize((size, size), Image.Resampling.LANCZOS)

    # Делаем белый фон прозрачным и красим модули в золото
    pixels = qr_img.load()
    for y in range(qr_img.height):
        for x in range(qr_img.width):
            r, g, b, a = pixels[x, y]
            if r > 200 and g > 200 and b > 200:  # Белый -> прозрачный
                pixels[x, y] = (0, 0, 0, 0)
            elif r < 50 and g < 50 and b < 50:  # Чёрный -> золотой
                pixels[x, y] = (*GOLD_PRIMARY, 255)

    return qr_img


def create_logo_overlay(size: int = 100) -> Image.Image:
    """Создаёт логотип для центра QR (если нет файла assets/shield_logo.png)."""
    # Пробуем загрузить готовый лого
    if os.path.exists(LOGO_PATH):
        try:
            logo = Image.open(LOGO_PATH).convert('RGBA')
            logo = logo.resize((size, size), Image.Resampling.LANCZOS)
            return logo
        except Exception as e:
            logger.warning(f"Failed to load logo: {e}")

    # Генерируем программный логотип
    logo = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(logo)

    # Круг с градиентным фоном
    margin = 5
    for i in range(size // 2 - margin):
        alpha = 255 - int(i * 0.5)
        r = int(BG_CARD[0] + (GOLD_DARK[0] - BG_CARD[0]) * i / (size // 2))
        g = int(BG_CARD[1] + (GOLD_DARK[1] - BG_CARD[1]) * i / (size // 2))
        b = int(BG_CARD[2] + (GOLD_DARK[2] - BG_CARD[2]) * i / (size // 2))
        draw.ellipse(
            [margin + i, margin + i, size - margin - i, size - margin - i],
            outline=(r, g, b, alpha),
            width=2
        )

    # Заливка центра
    draw.ellipse(
        [margin + 10, margin + 10, size - margin - 10, size - margin - 10],
        fill=(*BG_CARD, 255)
    )

    # Золотая обводка
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        outline=(*GOLD_PRIMARY, 255),
        width=3
    )

    # Текст "AS"
    try:
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ]
        font = None
        for path in font_paths:
            try:
                font = ImageFont.truetype(path, size // 3)
                break
            except (OSError, IOError):
                continue
        if font is None:
            font = ImageFont.load_default()
    except Exception:
        font = ImageFont.load_default()

    text = "AS"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    draw.text(
        ((size - text_w) // 2, (size - text_h) // 2 - 5),
        text,
        fill=GOLD_PRIMARY,
        font=font
    )

    return logo


def generate_premium_qr_card(
    user_id: int,
    username: str = "друг",
    referral_code: str = "",
    invited_count: int = 0,
    earnings: float = 0.0,
) -> Optional[bytes]:
    """
    Генерирует премиальную QR-карточку методом "Сэндвич".

    Слои:
    1. Фоновый шаблон или сгенерированный градиент
    2. QR-код (золотой, прозрачный фон)
    3. Логотип по центру QR
    4. Текстовые элементы

    Returns:
        PNG изображение в байтах
    """
    if not HAS_QR_DEPS:
        logger.warning("QR code dependencies not installed (qrcode, Pillow)")
        return None

    try:
        # Размеры карточки (оптимально для шаринга в Telegram)
        CARD_WIDTH = 1080
        CARD_HEIGHT = 1350
        QR_SIZE = 500
        LOGO_SIZE = 120

        # === СЛОЙ 1: Фон ===
        if os.path.exists(CARD_TEMPLATE_PATH):
            try:
                background = Image.open(CARD_TEMPLATE_PATH).convert('RGBA')
                background = background.resize((CARD_WIDTH, CARD_HEIGHT), Image.Resampling.LANCZOS)
            except Exception as e:
                logger.warning(f"Failed to load template: {e}")
                background = create_gold_gradient_background(CARD_WIDTH, CARD_HEIGHT)
        else:
            background = create_gold_gradient_background(CARD_WIDTH, CARD_HEIGHT)

        draw = ImageDraw.Draw(background)

        # Загрузка шрифтов
        try:
            font_paths = [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            ]
            font_title = font_regular = font_small = font_code = None
            for path in font_paths:
                try:
                    font_title = ImageFont.truetype(path, 56)
                    font_regular = ImageFont.truetype(path, 32)
                    font_small = ImageFont.truetype(path, 24)
                    font_code = ImageFont.truetype(path, 42)
                    break
                except (OSError, IOError):
                    continue
            if font_title is None:
                font_title = font_regular = font_small = font_code = ImageFont.load_default()
        except Exception:
            font_title = font_regular = font_small = font_code = ImageFont.load_default()

        y_pos = 60

        # === ЗАГОЛОВОК ===
        title = "ACADEMIC SALOON"
        title_bbox = draw.textbbox((0, 0), title, font=font_title)
        title_w = title_bbox[2] - title_bbox[0]
        draw.text(
            ((CARD_WIDTH - title_w) // 2, y_pos),
            title,
            fill=GOLD_PRIMARY,
            font=font_title
        )
        y_pos += 80

        # Подзаголовок
        subtitle = "ЭЛИТНЫЙ КЛУБ"
        sub_bbox = draw.textbbox((0, 0), subtitle, font=font_small)
        sub_w = sub_bbox[2] - sub_bbox[0]
        draw.text(
            ((CARD_WIDTH - sub_w) // 2, y_pos),
            subtitle,
            fill=TEXT_MUTED,
            font=font_small
        )
        y_pos += 50

        # Декоративная линия
        line_w = 300
        draw.line(
            [((CARD_WIDTH - line_w) // 2, y_pos), ((CARD_WIDTH + line_w) // 2, y_pos)],
            fill=GOLD_DARK,
            width=2
        )
        y_pos += 50

        # === СЛОЙ 2: QR-код ===
        referral_link = get_referral_link(user_id)
        qr_img = create_qr_code(referral_link, QR_SIZE)

        # QR-контейнер с рамкой
        qr_container_size = QR_SIZE + 60
        qr_container = Image.new('RGBA', (qr_container_size, qr_container_size), (*BG_CARD, 255))
        qr_container_draw = ImageDraw.Draw(qr_container)

        # Золотая рамка
        qr_container_draw.rounded_rectangle(
            [(0, 0), (qr_container_size - 1, qr_container_size - 1)],
            radius=25,
            outline=GOLD_DARK,
            width=3
        )

        # Внутренняя тень/свечение
        for i in range(10):
            alpha = int((10 - i) * 8)
            qr_container_draw.rounded_rectangle(
                [(5 + i, 5 + i), (qr_container_size - 5 - i, qr_container_size - 5 - i)],
                radius=22 - i,
                outline=(*GOLD_PRIMARY, alpha),
                width=1
            )

        # Вставляем QR в контейнер
        qr_container.paste(qr_img, (30, 30), qr_img)

        # === СЛОЙ 3: Логотип в центре QR ===
        logo = create_logo_overlay(LOGO_SIZE)
        logo_x = 30 + (QR_SIZE - LOGO_SIZE) // 2
        logo_y = 30 + (QR_SIZE - LOGO_SIZE) // 2
        qr_container.paste(logo, (logo_x, logo_y), logo)

        # Вставляем контейнер с QR на фон
        qr_x = (CARD_WIDTH - qr_container_size) // 2
        background.paste(qr_container, (qr_x, y_pos), qr_container)
        y_pos += qr_container_size + 40

        # === РЕФЕРАЛЬНЫЙ КОД ===
        if not referral_code:
            referral_code = f"REF{user_id}"

        code_bbox = draw.textbbox((0, 0), referral_code, font=font_code)
        code_w = code_bbox[2] - code_bbox[0]
        draw.text(
            ((CARD_WIDTH - code_w) // 2, y_pos),
            referral_code,
            fill=GOLD_LIGHT,
            font=font_code
        )
        y_pos += 60

        # === ПРИГЛАШЕНИЕ ===
        invite_text = f"@{username} приглашает тебя"
        inv_bbox = draw.textbbox((0, 0), invite_text, font=font_regular)
        inv_w = inv_bbox[2] - inv_bbox[0]
        draw.text(
            ((CARD_WIDTH - inv_w) // 2, y_pos),
            invite_text,
            fill=TEXT_WHITE,
            font=font_regular
        )
        y_pos += 60

        # === БЕНЕФИТЫ ===
        benefits = [
            "💎  Скидка 5% на первый заказ",
            "💰  Бонус 100₽ на счёт",
        ]
        for benefit in benefits:
            b_bbox = draw.textbbox((0, 0), benefit, font=font_small)
            b_w = b_bbox[2] - b_bbox[0]
            draw.text(
                ((CARD_WIDTH - b_w) // 2, y_pos),
                benefit,
                fill=TEXT_MUTED,
                font=font_small
            )
            y_pos += 40

        # === СТАТИСТИКА (если есть) ===
        if invited_count > 0 or earnings > 0:
            y_pos += 20
            stats = f"В команде: {invited_count}  •  Заработано: {earnings:.0f}₽"
            stats_bbox = draw.textbbox((0, 0), stats, font=font_small)
            stats_w = stats_bbox[2] - stats_bbox[0]

            # Pill background
            pill_h = 45
            pill_w = stats_w + 40
            pill_x = (CARD_WIDTH - pill_w) // 2
            draw.rounded_rectangle(
                [(pill_x, y_pos - 5), (pill_x + pill_w, y_pos - 5 + pill_h)],
                radius=22,
                fill=(30, 30, 35, 255),
                outline=GOLD_DARK,
                width=1
            )
            draw.text(
                ((CARD_WIDTH - stats_w) // 2, y_pos + 5),
                stats,
                fill=GOLD_PRIMARY,
                font=font_small
            )
            y_pos += pill_h + 30

        # === ФУТЕР ===
        y_pos = CARD_HEIGHT - 80
        footer = "СКАНИРУЙ • РЕГИСТРИРУЙСЯ • ПОЛУЧАЙ БОНУС"
        f_bbox = draw.textbbox((0, 0), footer, font=font_small)
        f_w = f_bbox[2] - f_bbox[0]
        draw.text(
            ((CARD_WIDTH - f_w) // 2, y_pos),
            footer,
            fill=(*TEXT_MUTED, 180),
            font=font_small
        )

        # === Конвертируем в PNG ===
        # Конвертируем в RGB для PNG без прозрачности (меньше размер)
        final = background.convert('RGB')
        buffer = io.BytesIO()
        final.save(buffer, format='PNG', quality=95, optimize=True)
        buffer.seek(0)

        return buffer.getvalue()

    except Exception as e:
        logger.error(f"Failed to generate premium QR card: {e}", exc_info=True)
        return None


def generate_simple_qr(user_id: int, size: int = 400) -> Optional[bytes]:
    """
    Генерирует простой золотой QR-код (без карточки).

    Используется как fallback или для встроенного отображения.
    """
    if not HAS_QR_DEPS:
        logger.warning("QR dependencies not installed")
        return None

    try:
        referral_link = get_referral_link(user_id)

        # Создаём QR
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=2,
        )
        qr.add_data(referral_link)
        qr.make(fit=True)

        qr_img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer(),
        )

        qr_img = qr_img.convert('RGBA')
        qr_img = qr_img.resize((size, size), Image.Resampling.LANCZOS)

        # Перекрашиваем
        pixels = qr_img.load()
        for y in range(qr_img.height):
            for x in range(qr_img.width):
                r, g, b, a = pixels[x, y]
                if r > 200:  # Белый -> тёмный фон
                    pixels[x, y] = (*BG_DARK, 255)
                else:  # Чёрный -> золотой
                    pixels[x, y] = (*GOLD_PRIMARY, 255)

        # Конвертируем в PNG
        final = qr_img.convert('RGB')
        buffer = io.BytesIO()
        final.save(buffer, format='PNG')
        buffer.seek(0)

        return buffer.getvalue()

    except Exception as e:
        logger.error(f"Failed to generate simple QR: {e}")
        return None
