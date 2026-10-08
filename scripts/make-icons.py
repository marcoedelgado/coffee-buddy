"""Render the PNG app icons from the same shapes as assets/icon.svg.

iOS ignores SVG for home-screen icons, so these PNGs are committed.
Re-run after changing the design:  python scripts/make-icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

BG, CREMA, COFFEE, STEAM, SHELF = "#1e1512", "#e9b872", "#6b4130", "#bfa999", "#4a372d"
OUT = Path(__file__).resolve().parent.parent / "assets"
SS = 4  # supersample, then downscale for smooth edges


def draw(size: int) -> Image.Image:
    big = size * SS
    u = big / 64  # one unit of the 64x64 SVG grid
    img = Image.new("RGB", (big, big), BG)  # full-bleed: iOS rounds the corners itself
    d = ImageDraw.Draw(img)
    p = lambda *xs: [x * u for x in xs]

    # steam
    for x in (24, 32, 40):
        d.arc(p(x - 4, 9, x + 2, 15), 270, 90, fill=STEAM, width=round(2.5 * u))
        d.arc(p(x - 2, 14, x + 4, 20), 90, 270, fill=STEAM, width=round(2.5 * u))
    # handle
    d.arc(p(41, 30, 56, 44), 270, 90, fill=CREMA, width=round(4 * u))
    # cup body: rect top + rounded bottom
    d.rounded_rectangle(p(14, 26, 48, 52), radius=14 * u, fill=CREMA)
    d.rectangle(p(14, 26, 48, 38), fill=CREMA)
    # coffee surface
    d.ellipse(p(14, 22.5, 48, 29.5), fill=COFFEE)
    # saucer
    d.rounded_rectangle(p(10, 54, 54, 58), radius=2 * u, fill=SHELF)
    return img.resize((size, size), Image.LANCZOS)


for size in (180, 192, 512):
    draw(size).save(OUT / f"icon-{size}.png", optimize=True)
    print(f"wrote assets/icon-{size}.png")
