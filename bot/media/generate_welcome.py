"""
Generate animated welcome GIF for Academic Saloon Telegram bot.
Brand: Deep void black + Liquid gold (#d4af37).
Animation: Golden arc reveal → breathing orb → text crystallization.
"""

import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ═══ BRAND CONSTANTS ═══
W, H = 800, 800
BG = (9, 9, 11)
GOLD = (212, 175, 55)
GOLD_BRIGHT = (245, 208, 97)
GOLD_DEEP = (180, 142, 38)
GOLD_PALE = (251, 245, 183)
MUTED = (140, 140, 150)

CX, CY = W // 2, H // 2 - 40
RING_RADIUS = 135
RING_WIDTH = 3
DOT_RADIUS = 5

TOTAL_FRAMES = 50
FRAME_DURATION = 55  # ms

# The ring has a deliberate gap (like the original logo — ~300° arc)
ARC_TOTAL_DEGREES = 310
ARC_START_OFFSET = -130  # Start position (top-left-ish)

# Fonts
try:
    font_title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Didot.ttc", 50)
except:
    font_title = ImageFont.load_default()

try:
    font_subtitle = ImageFont.truetype("/System/Library/Fonts/Avenir Next.ttc", 20)
except:
    font_subtitle = ImageFont.load_default()


def ease_out_expo(t):
    return 1 - pow(2, -10 * t) if t < 1 else 1

def ease_out_cubic(t):
    return 1 - pow(1 - t, 3)

def lerp(a, b, t):
    return a + (b - a) * max(0, min(1, t))

def lerp_color(c1, c2, t):
    t = max(0, min(1, t))
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def radial_gradient_bg(w, h, cx, cy):
    """Create deep void background with subtle radial gradient."""
    img = Image.new("RGBA", (w, h), (*BG, 255))
    draw = ImageDraw.Draw(img)
    max_r = int(math.sqrt(cx*cx + cy*cy))

    # Very subtle dark-to-slightly-lighter gradient from center
    for r in range(max_r, 0, -4):
        ratio = r / max_r
        # Subtle lift in center
        lift = int(6 * (1 - ratio * ratio))
        c = (BG[0] + lift, BG[1] + lift, BG[2] + lift + 1, 255)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)

    return img


def draw_gold_arc(draw, cx, cy, radius, progress, width=3):
    """Draw the signature golden arc with gap."""
    if progress <= 0:
        return

    sweep = ARC_TOTAL_DEGREES * progress
    start = ARC_START_OFFSET

    bbox = [cx - radius, cy - radius, cx + radius, cy + radius]

    # Draw main arc
    draw.arc(bbox, start=start, end=start + sweep, fill=GOLD, width=width)

    # Draw bright leading tip
    if progress < 0.95:
        tip_angle = math.radians(start + sweep)
        tip_x = cx + radius * math.cos(tip_angle)
        tip_y = cy + radius * math.sin(tip_angle)
        r = width + 1
        draw.ellipse([tip_x - r, tip_y - r, tip_x + r, tip_y + r], fill=GOLD_BRIGHT)


def draw_secondary_arc(draw, cx, cy, radius, progress, width=1):
    """Thinner, subtler secondary ring."""
    if progress <= 0:
        return

    sweep = ARC_TOTAL_DEGREES * 0.7 * progress
    start = ARC_START_OFFSET + 20

    bbox = [cx - radius, cy - radius, cx + radius, cy + radius]
    color = lerp_color(BG, GOLD_DEEP, progress * 0.35)
    draw.arc(bbox, start=start, end=start + sweep, fill=color, width=width)


def add_glow(img, cx, cy, radius, intensity, color=GOLD):
    """Smooth radial glow."""
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    for r in range(radius, 0, -3):
        ratio = r / radius
        # Gaussian-like falloff
        falloff = math.exp(-3 * ratio * ratio)
        alpha = int(255 * intensity * falloff)
        if alpha < 1:
            continue
        draw.ellipse(
            [cx - r, cy - r, cx + r, cy + r],
            fill=(*color, alpha)
        )

    return Image.alpha_composite(img, overlay)


def draw_text_centered(img, text, y, font, color, alpha):
    """Draw centered text with alpha."""
    if alpha <= 0:
        return img

    txt = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(txt)
    bbox = d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    x = (W - tw) // 2
    d.text((x, y), text, font=font, fill=(*color, int(255 * alpha)))
    return Image.alpha_composite(img, txt)


def add_vignette(img, strength=0.6):
    """Smooth corner vignette."""
    vig = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(vig)
    max_d = math.sqrt(CX**2 + CY**2)

    for y in range(0, H, 3):
        for x in range(0, W, 3):
            d = math.sqrt((x - CX)**2 + (y - CY)**2)
            ratio = d / max_d
            # Only darken edges
            if ratio > 0.5:
                alpha = int(255 * strength * ((ratio - 0.5) * 2) ** 1.5)
                alpha = min(255, alpha)
                draw.rectangle([x, y, x + 3, y + 3], fill=(0, 0, 0, alpha))

    return Image.alpha_composite(img, vig)


def generate_frame(i):
    t = i / TOTAL_FRAMES

    # Background
    img = radial_gradient_bg(W, H, CX, CY)
    draw = ImageDraw.Draw(img)

    # ═══ ARC REVEAL (0.0 → 0.55) ═══
    arc_t = ease_out_expo(min(1, t / 0.55))
    draw_gold_arc(draw, CX, CY, RING_RADIUS, arc_t, RING_WIDTH)

    # Secondary arc (delayed)
    if t > 0.08:
        arc2_t = ease_out_expo(min(1, (t - 0.08) / 0.55))
        draw_secondary_arc(draw, CX, CY, RING_RADIUS + 22, arc2_t, 1)

    # ═══ CENTER ORB (0.15 → 0.40) ═══
    orb_t = max(0, (t - 0.15) / 0.25)
    orb_p = ease_out_cubic(min(1, orb_t))

    if orb_p > 0:
        # Breathing pulse
        breath = 1 + 0.12 * math.sin(i * 0.18)
        r = DOT_RADIUS * orb_p * breath

        # Glow
        glow_r = int(80 * orb_p * breath)
        glow_i = 0.25 * orb_p * (0.8 + 0.2 * math.sin(i * 0.12))
        img = add_glow(img, CX, CY, glow_r, glow_i)
        draw = ImageDraw.Draw(img)

        # Core dot
        c = lerp_color(GOLD_DEEP, GOLD_BRIGHT, orb_p)
        draw.ellipse([CX - r, CY - r, CX + r, CY + r], fill=c)

    # ═══ RING GLOW (after ring completes) ═══
    if arc_t > 0.8:
        ring_glow = (arc_t - 0.8) * 5  # 0→1
        # Subtle glow along the ring
        img = add_glow(img, CX, CY, RING_RADIUS + 30, 0.08 * ring_glow, GOLD_DEEP)
        draw = ImageDraw.Draw(img)

    # ═══ TITLE (0.42 → 0.70) ═══
    title_t = max(0, (t - 0.42) / 0.28)
    title_a = ease_out_cubic(min(1, title_t))

    title_y = CY + RING_RADIUS + 55
    img = draw_text_centered(img, "ACADEMIC SALOON", title_y, font_title, GOLD, title_a)

    # ═══ SUBTITLE (0.55 → 0.80) ═══
    sub_t = max(0, (t - 0.55) / 0.25)
    sub_a = ease_out_cubic(min(1, sub_t))

    sub_y = title_y + 62
    img = draw_text_centered(
        img,
        "А К А Д Е М И Ч Е С К И Й   С Е Р В И С",
        sub_y, font_subtitle, MUTED, sub_a
    )

    # Vignette (baked on last compose)
    img = add_vignette(img, 0.5)

    return img.convert("RGB")


def main():
    print("Generating Academic Saloon welcome animation...")
    frames = []

    for i in range(TOTAL_FRAMES):
        frame = generate_frame(i)
        frames.append(frame)
        if (i + 1) % 10 == 0:
            print(f"  Frame {i + 1}/{TOTAL_FRAMES}")

    # Hold final frame
    for _ in range(18):
        frames.append(frames[-1])

    # Save GIF
    gif_path = "/Users/saymurrbk.ru/Desktop/Проекты/saloon/academic_saloon/bot/media/welcome_animated.gif"
    frames[0].save(
        gif_path,
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_DURATION,
        loop=0,
        optimize=True,
    )

    # Save static version
    static_path = "/Users/saymurrbk.ru/Desktop/Проекты/saloon/academic_saloon/bot/media/welcome_static.jpg"
    frames[-1].save(static_path, quality=95)

    print(f"\nDone!")
    print(f"  GIF: {gif_path} ({len(frames)} frames, {len(frames) * FRAME_DURATION / 1000:.1f}s)")
    print(f"  Static: {static_path}")


if __name__ == "__main__":
    main()
