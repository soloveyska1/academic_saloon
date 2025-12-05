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
CARD_TEMPLATE_PATH = os.path.join(ASSETS_DIR, 'card_template_bg.jpg')
LOGO_PATH = os.path.join(ASSETS_DIR, 'shield_logo.jpg')

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
    """Создаёт круглый логотип для центра QR."""
    # Пробуем загрузить готовый лого
    if os.path.exists(LOGO_PATH):
        try:
            logo = Image.open(LOGO_PATH).convert('RGBA')
            
            # Маскируем в круг (так как исходник JPG)
            mask = Image.new('L', (size, size), 0)
            draw_mask = ImageDraw.Draw(mask)
            draw_mask.ellipse((0, 0, size, size), fill=255)
            
            # Ресайз и кроп
            logo = logo.resize((size, size), Image.Resampling.LANCZOS)
            
            # Создаем финальный контейнер с маской
            output = Image.new('RGBA', (size, size), (0, 0, 0, 0))
            output.paste(logo, (0, 0), mask=mask)
            
            # Добавляем золотую обводку
            draw_outline = ImageDraw.Draw(output)
            draw_outline.ellipse((0, 0, size-1, size-1), outline=GOLD_PRIMARY, width=2)
            
            return output
        except Exception as e:
            logger.warning(f"Failed to load logo: {e}")

    # Fallback: Генерируем программный логотип
    logo = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    # ... (остальной код генерации можно оставить или упростить, но лучше вернуть валидный объект)
    draw = ImageDraw.Draw(logo)
    draw.ellipse((0, 0, size-1, size-1), fill=BG_CARD, outline=GOLD_PRIMARY, width=2)
    
    # Текст "AS"
    try:
        font = ImageFont.load_default()
    except Exception:
        font = None
        
    if font:
        draw.text((size//2 - 10, size//2 - 10), "AS", fill=GOLD_PRIMARY, font=font)
        
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

        # === РАЗМЕЩЕНИЕ ЭЛЕМЕНТОВ (Premium Design) ===
        
        # Размеры полотна: 1080 x 1350
        # Центр QR кода должен попадать в визуальный центр золотой рамки.
        # Обычно это геометрический центр картинки или чуть ниже.
        # Попробуем разместить QR по центру.
        
        center_x = CARD_WIDTH // 2
        center_y = CARD_HEIGHT // 2 + 50  # Чуть смещаем вниз для баланса
        
        # === СЛОЙ 2: QR-код ===
        referral_link = get_referral_link(user_id)
        qr_img = create_qr_code(referral_link, QR_SIZE)

        # QR-контейнер с рамкой (убираем сложную 'Сэндвич' рамку, делаем минималистично)
        # На новом фоне уже есть рамка? Если да, то делаем прозрачный контейнер.
        # Если "в черном квадрате", то просто QR.
        # Добавим легкое свечение вокруг QR чтобы отделить от темного фона
        
        qr_container_size = QR_SIZE + 40
        qr_container = Image.new('RGBA', (qr_container_size, qr_container_size), (0, 0, 0, 0))
        qr_container_draw = ImageDraw.Draw(qr_container)
        
        # Легкое золотое свечение (shadow)
        # for i in range(15):
        #     alpha = int((15 - i) * 3)
        #     qr_container_draw.rounded_rectangle(
        #         [(i, i), (qr_container_size - i, qr_container_size - i)],
        #         radius=20,
        #         outline=(*GOLD_PRIMARY, alpha),
        #         width=1
        #     )
            
        # Вставляем QR в контейнер
        qr_container.paste(qr_img, (20, 20), qr_img)

        # === СЛОЙ 3: Логотип в центре QR ===
        logo = create_logo_overlay(LOGO_SIZE)
        logo_x = 20 + (QR_SIZE - LOGO_SIZE) // 2
        logo_y = 20 + (QR_SIZE - LOGO_SIZE) // 2
        qr_container.paste(logo, (logo_x, logo_y), logo)

        # Вставляем контейнер с QR на фон
        qr_x = center_x - (qr_container_size // 2)
        qr_y = center_y - (qr_container_size // 2)
        background.paste(qr_container, (qr_x, qr_y), qr_container)
        
        # === ТЕКСТОВЫЕ БЛОКИ (Аккуратно вписываем) ===
        
        # Реферальный код (над QR или под ним)
        # Разместим ПОД QR кодом, мелким шрифтом
        if not referral_code:
            referral_code = f"REF{user_id}"

        y_text_start = qr_y + qr_container_size + 30
        
        # Код
        code_bbox = draw.textbbox((0, 0), referral_code, font=font_code)
        code_w = code_bbox[2] - code_bbox[0]
        draw.text(
            ((CARD_WIDTH - code_w) // 2, y_text_start),
            referral_code,
            fill=GOLD_LIGHT,
            font=font_code
        )
        
        # Инвайт (чуть ниже)
        y_text_start += 60
        invite_text = f"@{username} приглашает тебя"
        inv_bbox = draw.textbbox((0, 0), invite_text, font=font_regular)
        inv_w = inv_bbox[2] - inv_bbox[0]
        draw.text(
            ((CARD_WIDTH - inv_w) // 2, y_text_start),
            invite_text,
            fill=TEXT_WHITE,
            font=font_regular
        )
        
        # Бенефиты (еще ниже, если влезает, или вообще убрать для минимализма)
        # Для премиума лучше меньше текста.
        # Оставим только статистику, если она есть
        
        if invited_count > 0 or earnings > 0:
            y_text_start += 70
            stats = f"{invited_count} друзей • +{earnings:.0f}₽"
            stats_bbox = draw.textbbox((0, 0), stats, font=font_small)
            stats_w = stats_bbox[2] - stats_bbox[0]
            
            # Pill background for stats
            pill_h = 44
            pill_w = stats_w + 50
            pill_x = (CARD_WIDTH - pill_w) // 2
            
            draw.rounded_rectangle(
                [(pill_x, y_text_start - 8), (pill_x + pill_w, y_text_start - 8 + pill_h)],
                radius=22,
                fill=(20, 20, 25, 200),
                outline=GOLD_DARK,
                width=1
            )
            
            draw.text(
                ((CARD_WIDTH - stats_w) // 2, y_text_start),
                stats,
                fill=GOLD_PRIMARY,
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
