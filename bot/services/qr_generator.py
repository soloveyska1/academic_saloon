"""
Premium QR Code Generator for Academic Saloon

Минималистичный дизайн:
- Программно сгенерированный фон
- Золотой QR-код с закруглёнными модулями
- Логотип "AS" по центру

Ссылка формата: https://t.me/{bot}/app?startapp=ref_{user_id}
"""

import io
import logging
from typing import Optional

try:
    import qrcode
    from qrcode.image.styledpil import StyledPilImage
    from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
    from PIL import Image, ImageDraw, ImageFont
    HAS_QR_DEPS = True
except ImportError:
    HAS_QR_DEPS = False

from core.config import settings

logger = logging.getLogger(__name__)

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
    """
    Создаёт минималистичный круглый логотип для центра QR.

    Дизайн: тёмный круг с золотой обводкой и буквами "AS"
    """
    logo = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(logo)

    # Тёмный круг с золотой обводкой
    border_width = 3
    draw.ellipse(
        (0, 0, size - 1, size - 1),
        fill=BG_CARD,
        outline=GOLD_PRIMARY,
        width=border_width
    )

    # Внутренний акцент (тонкая линия)
    inner_margin = border_width + 3
    draw.ellipse(
        (inner_margin, inner_margin, size - inner_margin - 1, size - inner_margin - 1),
        outline=(*GOLD_DARK, 80),
        width=1
    )

    # Текст "AS" по центру
    try:
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        ]
        font = None
        font_size = int(size * 0.4)  # 40% от размера логотипа
        for path in font_paths:
            try:
                font = ImageFont.truetype(path, font_size)
                break
            except (OSError, IOError):
                continue
        if font is None:
            font = ImageFont.load_default()
    except Exception:
        font = ImageFont.load_default()

    text = "AS"
    text_bbox = draw.textbbox((0, 0), text, font=font)
    text_w = text_bbox[2] - text_bbox[0]
    text_h = text_bbox[3] - text_bbox[1]

    # Центрируем текст
    text_x = (size - text_w) // 2
    text_y = (size - text_h) // 2 - 2  # Небольшая коррекция вверх

    draw.text((text_x, text_y), text, fill=GOLD_PRIMARY, font=font)

    return logo


def generate_premium_qr_card(
    user_id: int,
    username: str = "друг",
    referral_code: str = "",
    invited_count: int = 0,
    earnings: float = 0.0,
) -> Optional[bytes]:
    """
    Генерирует минималистичную премиум QR-карточку.

    Дизайн:
    - Чистый тёмный фон с тонким золотым свечением
    - Золотой QR-код с логотипом
    - Минимум текста - только код и бренд

    Returns:
        PNG изображение в байтах
    """
    if not HAS_QR_DEPS:
        logger.warning("QR code dependencies not installed (qrcode, Pillow)")
        return None

    try:
        # Компактные размеры для шаринга
        CARD_WIDTH = 800
        CARD_HEIGHT = 1000
        QR_SIZE = 450
        LOGO_SIZE = 100

        # === СЛОЙ 1: Минималистичный тёмный фон ===
        background = Image.new('RGBA', (CARD_WIDTH, CARD_HEIGHT), BG_DARK)
        draw = ImageDraw.Draw(background)

        # Тонкое золотое свечение сверху
        for y in range(200):
            alpha = int(255 * (1 - y / 200) * 0.08)
            r = min(255, BG_DARK[0] + int((GOLD_PRIMARY[0] - BG_DARK[0]) * alpha / 255))
            g = min(255, BG_DARK[1] + int((GOLD_PRIMARY[1] - BG_DARK[1]) * alpha / 255))
            b = min(255, BG_DARK[2] + int((GOLD_PRIMARY[2] - BG_DARK[2]) * alpha / 255))
            draw.line([(0, y), (CARD_WIDTH, y)], fill=(r, g, b, 255))

        # Загрузка шрифтов
        try:
            font_paths = [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            ]
            font_brand = font_code = font_small = None
            for path in font_paths:
                try:
                    font_brand = ImageFont.truetype(path, 28)
                    font_code = ImageFont.truetype(path, 36)
                    font_small = ImageFont.truetype(path, 20)
                    break
                except (OSError, IOError):
                    continue
            if font_brand is None:
                font_brand = font_code = font_small = ImageFont.load_default()
        except Exception:
            font_brand = font_code = font_small = ImageFont.load_default()

        center_x = CARD_WIDTH // 2

        # === Бренд-заголовок вверху ===
        brand_text = "ACADEMIC SALOON"
        brand_bbox = draw.textbbox((0, 0), brand_text, font=font_brand)
        brand_w = brand_bbox[2] - brand_bbox[0]
        draw.text(
            ((CARD_WIDTH - brand_w) // 2, 60),
            brand_text,
            fill=GOLD_PRIMARY,
            font=font_brand
        )

        # Тонкая линия под брендом
        line_y = 110
        line_width = 100
        draw.line(
            [(center_x - line_width, line_y), (center_x + line_width, line_y)],
            fill=(*GOLD_DARK, 150),
            width=1
        )

        # === СЛОЙ 2: QR-код с контейнером ===
        referral_link = get_referral_link(user_id)
        qr_img = create_qr_code(referral_link, QR_SIZE)

        # QR-контейнер с тонкой рамкой
        qr_container_size = QR_SIZE + 60
        qr_container = Image.new('RGBA', (qr_container_size, qr_container_size), (0, 0, 0, 0))
        qr_container_draw = ImageDraw.Draw(qr_container)

        # Тёмный фон для контейнера
        qr_container_draw.rounded_rectangle(
            [(0, 0), (qr_container_size - 1, qr_container_size - 1)],
            radius=24,
            fill=(15, 15, 18, 255),
            outline=(*GOLD_DARK, 100),
            width=1
        )

        # Вставляем QR в контейнер
        qr_container.paste(qr_img, (30, 30), qr_img)

        # === СЛОЙ 3: Логотип в центре QR ===
        logo = create_logo_overlay(LOGO_SIZE)
        logo_x = 30 + (QR_SIZE - LOGO_SIZE) // 2
        logo_y = 30 + (QR_SIZE - LOGO_SIZE) // 2
        qr_container.paste(logo, (logo_x, logo_y), logo)

        # Вставляем контейнер с QR
        qr_y = 150
        qr_x = center_x - (qr_container_size // 2)
        background.paste(qr_container, (qr_x, qr_y), qr_container)

        # === Реферальный код под QR ===
        if not referral_code:
            referral_code = f"REF{user_id}"

        y_text = qr_y + qr_container_size + 35

        # Лейбл
        label = "ВАШ КОД"
        label_bbox = draw.textbbox((0, 0), label, font=font_small)
        label_w = label_bbox[2] - label_bbox[0]
        draw.text(
            ((CARD_WIDTH - label_w) // 2, y_text),
            label,
            fill=TEXT_MUTED,
            font=font_small
        )

        # Код
        y_text += 30
        code_bbox = draw.textbbox((0, 0), referral_code, font=font_code)
        code_w = code_bbox[2] - code_bbox[0]
        draw.text(
            ((CARD_WIDTH - code_w) // 2, y_text),
            referral_code,
            fill=GOLD_LIGHT,
            font=font_code
        )

        # === Бонусы внизу ===
        y_text += 70
        bonus_text = "Скидка 5% на первый заказ"
        bonus_bbox = draw.textbbox((0, 0), bonus_text, font=font_small)
        bonus_w = bonus_bbox[2] - bonus_bbox[0]
        draw.text(
            ((CARD_WIDTH - bonus_w) // 2, y_text),
            bonus_text,
            fill=TEXT_WHITE,
            font=font_small
        )

        # === Конвертируем в PNG ===
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
