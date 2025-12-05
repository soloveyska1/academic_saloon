"""
Premium QR Code Generator for Academic Saloon

Generates beautiful, branded QR code cards for referral sharing.
"""

import io
import logging
from typing import Optional

try:
    import qrcode
    from qrcode.image.styledpil import StyledPilImage
    from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
    from qrcode.image.styles.colormasks import SolidFillColorMask
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
BG_CARD = (20, 20, 23)             # #141417
TEXT_WHITE = (242, 242, 242)       # #f2f2f2
TEXT_MUTED = (113, 113, 122)       # #71717a


def generate_premium_qr_card(
    referral_link: str,
    username: str,
    referral_code: str,
    invited_count: int = 0,
    earnings: float = 0.0,
) -> Optional[bytes]:
    """
    Generate a premium QR code card for sharing.

    Returns PNG image as bytes, or None if generation fails.
    """
    if not HAS_QR_DEPS:
        logger.warning("QR code dependencies not installed (qrcode, Pillow)")
        return None

    try:
        # Card dimensions (optimized for Telegram sharing)
        CARD_WIDTH = 800
        CARD_HEIGHT = 1000
        QR_SIZE = 400
        PADDING = 50

        # Create card background with gradient effect
        card = Image.new('RGB', (CARD_WIDTH, CARD_HEIGHT), BG_DARK)
        draw = ImageDraw.Draw(card)

        # Add subtle gradient overlay at top
        for y in range(200):
            alpha = int(255 * (1 - y / 200) * 0.15)
            color = (
                min(255, BG_DARK[0] + int(GOLD_PRIMARY[0] * alpha / 255)),
                min(255, BG_DARK[1] + int(GOLD_PRIMARY[1] * alpha / 255)),
                min(255, BG_DARK[2] + int(GOLD_PRIMARY[2] * alpha / 255)),
            )
            draw.line([(0, y), (CARD_WIDTH, y)], fill=color)

        # Add decorative corner accents
        accent_size = 80
        # Top left
        for i in range(accent_size):
            alpha = 1 - (i / accent_size)
            draw.line([(0, i), (accent_size - i, 0)],
                     fill=(*GOLD_PRIMARY, int(100 * alpha)))
        # Top right
        for i in range(accent_size):
            alpha = 1 - (i / accent_size)
            draw.line([(CARD_WIDTH - accent_size + i, 0), (CARD_WIDTH, i)],
                     fill=(*GOLD_PRIMARY, int(100 * alpha)))

        # Try to load fonts, fallback to default
        try:
            # Try common system fonts
            font_paths = [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
                "/System/Library/Fonts/Helvetica.ttc",
                "C:\\Windows\\Fonts\\arial.ttf",
            ]
            font_large = None
            font_medium = None
            font_small = None

            for path in font_paths:
                try:
                    font_large = ImageFont.truetype(path, 48)
                    font_medium = ImageFont.truetype(path, 32)
                    font_small = ImageFont.truetype(path, 24)
                    break
                except (OSError, IOError):
                    continue

            if font_large is None:
                font_large = ImageFont.load_default()
                font_medium = ImageFont.load_default()
                font_small = ImageFont.load_default()
        except Exception:
            font_large = ImageFont.load_default()
            font_medium = ImageFont.load_default()
            font_small = ImageFont.load_default()

        # === HEADER ===
        y_pos = PADDING

        # Brand name
        brand_text = "ACADEMIC SALOON"
        brand_bbox = draw.textbbox((0, 0), brand_text, font=font_large)
        brand_width = brand_bbox[2] - brand_bbox[0]
        draw.text(
            ((CARD_WIDTH - brand_width) // 2, y_pos),
            brand_text,
            font=font_large,
            fill=GOLD_PRIMARY
        )
        y_pos += 70

        # Tagline
        tagline = "Элитный клуб студентов"
        tagline_bbox = draw.textbbox((0, 0), tagline, font=font_small)
        tagline_width = tagline_bbox[2] - tagline_bbox[0]
        draw.text(
            ((CARD_WIDTH - tagline_width) // 2, y_pos),
            tagline,
            font=font_small,
            fill=TEXT_MUTED
        )
        y_pos += 60

        # Decorative line
        line_width = 200
        line_y = y_pos
        draw.line(
            [((CARD_WIDTH - line_width) // 2, line_y),
             ((CARD_WIDTH + line_width) // 2, line_y)],
            fill=GOLD_DARK,
            width=2
        )
        y_pos += 40

        # === QR CODE ===
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=2,
        )
        qr.add_data(referral_link)
        qr.make(fit=True)

        # Create styled QR with rounded modules
        qr_img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer(),
            color_mask=SolidFillColorMask(
                back_color=BG_CARD,
                front_color=GOLD_PRIMARY
            )
        )

        # Resize QR to desired size
        qr_img = qr_img.resize((QR_SIZE, QR_SIZE), Image.Resampling.LANCZOS)

        # Create QR container with border
        qr_container_size = QR_SIZE + 40
        qr_container = Image.new('RGB', (qr_container_size, qr_container_size), BG_CARD)
        qr_draw = ImageDraw.Draw(qr_container)

        # Draw gold border
        qr_draw.rounded_rectangle(
            [(0, 0), (qr_container_size - 1, qr_container_size - 1)],
            radius=20,
            outline=GOLD_DARK,
            width=3
        )

        # Paste QR in container
        qr_container.paste(qr_img, (20, 20))

        # Paste QR container on card
        qr_x = (CARD_WIDTH - qr_container_size) // 2
        card.paste(qr_container, (qr_x, y_pos))
        y_pos += qr_container_size + 40

        # === REFERRAL CODE ===
        code_text = referral_code
        code_bbox = draw.textbbox((0, 0), code_text, font=font_medium)
        code_width = code_bbox[2] - code_bbox[0]
        draw.text(
            ((CARD_WIDTH - code_width) // 2, y_pos),
            code_text,
            font=font_medium,
            fill=GOLD_LIGHT
        )
        y_pos += 50

        # === INVITE TEXT ===
        invite_text = f"@{username} приглашает тебя"
        invite_bbox = draw.textbbox((0, 0), invite_text, font=font_small)
        invite_width = invite_bbox[2] - invite_bbox[0]
        draw.text(
            ((CARD_WIDTH - invite_width) // 2, y_pos),
            invite_text,
            font=font_small,
            fill=TEXT_WHITE
        )
        y_pos += 50

        # === BENEFITS ===
        benefits = [
            "💎 Скидка 5% на первый заказ",
            "💰 Бонус 100₽ на счёт",
        ]

        for benefit in benefits:
            benefit_bbox = draw.textbbox((0, 0), benefit, font=font_small)
            benefit_width = benefit_bbox[2] - benefit_bbox[0]
            draw.text(
                ((CARD_WIDTH - benefit_width) // 2, y_pos),
                benefit,
                font=font_small,
                fill=TEXT_MUTED
            )
            y_pos += 35

        # === STATS (if any) ===
        if invited_count > 0 or earnings > 0:
            y_pos += 20
            stats_text = f"В команде: {invited_count} | Заработано: {earnings:.0f}₽"
            stats_bbox = draw.textbbox((0, 0), stats_text, font=font_small)
            stats_width = stats_bbox[2] - stats_bbox[0]

            # Draw stats pill background
            pill_padding = 20
            pill_height = 40
            pill_x = (CARD_WIDTH - stats_width) // 2 - pill_padding
            pill_y = y_pos - 5
            draw.rounded_rectangle(
                [(pill_x, pill_y),
                 (pill_x + stats_width + pill_padding * 2, pill_y + pill_height)],
                radius=20,
                fill=(30, 30, 35),
                outline=GOLD_DARK,
                width=1
            )

            draw.text(
                ((CARD_WIDTH - stats_width) // 2, y_pos),
                stats_text,
                font=font_small,
                fill=GOLD_PRIMARY
            )

        # Convert to bytes
        buffer = io.BytesIO()
        card.save(buffer, format='PNG', quality=95)
        buffer.seek(0)

        return buffer.getvalue()

    except Exception as e:
        logger.error(f"Failed to generate QR card: {e}")
        return None


def generate_simple_qr(data: str, size: int = 300) -> Optional[bytes]:
    """
    Generate a simple gold QR code (without card frame).

    Returns PNG image as bytes.
    """
    if not HAS_QR_DEPS:
        logger.warning("QR code dependencies not installed")
        return None

    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=2,
        )
        qr.add_data(data)
        qr.make(fit=True)

        qr_img = qr.make_image(
            image_factory=StyledPilImage,
            module_drawer=RoundedModuleDrawer(),
            color_mask=SolidFillColorMask(
                back_color=BG_DARK,
                front_color=GOLD_PRIMARY
            )
        )

        qr_img = qr_img.resize((size, size), Image.Resampling.LANCZOS)

        buffer = io.BytesIO()
        qr_img.save(buffer, format='PNG')
        buffer.seek(0)

        return buffer.getvalue()

    except Exception as e:
        logger.error(f"Failed to generate simple QR: {e}")
        return None
