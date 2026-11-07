"""Render the PNG app icons: a calm, flat coffee cup with soft steam on a
warm latte background. Drawn in code (no source art) at 4x and downsampled
for smooth edges.

iOS ignores SVG for home-screen icons, so these PNGs are committed.
Re-run after changing the design:  python scripts/make-icons.py
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parent.parent / "assets"

BG = "#E9D8C1"       # latte
CUP = "#3B2A21"      # espresso
STEAM = "#FBF4E9"    # milk foam
S = 2048             # supersampled canvas


def steam(draw, x, top, bottom, amp, width):
    """A soft S-curve wisp drawn as overlapping discs (round caps for free)."""
    r = width / 2
    steps = 400
    for i in range(steps + 1):
        t = i / steps
        y = bottom - t * (bottom - top)
        cx = x + amp * math.sin(t * 2 * math.pi)
        draw.ellipse((cx - r, y - r, cx + r, y + r), fill=STEAM)


img = Image.new("RGB", (S, S), BG)  # full-bleed: iOS rounds the corners itself
d = ImageDraw.Draw(img)

# Cup body: a squircle bowl, full width at the rim easing into a flat bottom.
X = -36  # nudge left so cup + handle sit optically centred
left, right, top, bottom = 560 + X, 1360 + X, 900, 1600
cx, hw0, h = (left + right) / 2, (right - left) / 2, bottom - top
side = [(cx + hw0 * (1 - u ** 4) ** 0.25, top + u * h) for u in (i / 200 for i in range(201))]
body = Image.new("L", (S, S), 0)
ImageDraw.Draw(body).polygon(side + [(2 * cx - x, y) for x, y in reversed(side)], fill=255)
img.paste(CUP, mask=body)

# Handle: a thick ring on the right, its inner half hidden behind the cup.
hx, hy, hr, hw = right - 40, 1150, 190, 78
d.ellipse((hx - hr, hy - hr, hx + hr, hy + hr), outline=CUP, width=hw)
img.paste(CUP, mask=body)

# Rim: a slim lip slightly wider than the body.
d.rounded_rectangle((left - 30, top - 40, right + 30, top + 40), radius=40, fill=CUP)

# Saucer.
d.rounded_rectangle((420 + X, 1590, 1580 + X, 1670), radius=40, fill=CUP)

# Two gentle wisps of steam.
steam(d, 860 + X, 360, 780, 60, 70)
steam(d, 1080 + X, 440, 780, 50, 70)

for size in (180, 192, 512):
    img.resize((size, size), Image.LANCZOS).save(ASSETS / f"icon-{size}.png", optimize=True)
    print(f"wrote assets/icon-{size}.png")
