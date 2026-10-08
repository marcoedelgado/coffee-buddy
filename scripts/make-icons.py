"""Render the PNG app icons: the coffee-cup mascot (assets/cup.png, from the
Claude Design canvas) centred on the app's cream background.

iOS ignores SVG for home-screen icons, so these PNGs are committed.
Re-run after changing the art:  python scripts/make-icons.py
"""
from pathlib import Path
from PIL import Image

CREAM = "#FFF7E8"
ASSETS = Path(__file__).resolve().parent.parent / "assets"
cup = Image.open(ASSETS / "cup.png").convert("RGBA")
cup = cup.crop(cup.getbbox())  # trim transparent margin

for size in (180, 192, 512):
    icon = Image.new("RGBA", (size, size), CREAM)  # full-bleed: iOS rounds the corners itself
    art = cup.copy()
    art.thumbnail((round(size * 0.78),) * 2, Image.LANCZOS)
    icon.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    icon.convert("RGB").save(ASSETS / f"icon-{size}.png", optimize=True)
    print(f"wrote assets/icon-{size}.png")
