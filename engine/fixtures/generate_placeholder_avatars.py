"""Generates synthetic placeholder avatar images for local testing.

Stands in for real Instagram avatars until Stage 3's data-source adapters exist.
Usage: .venv/Scripts/python.exe fixtures/generate_placeholder_avatars.py [--count N]
"""
from __future__ import annotations

import argparse
import colorsys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def generate(output_dir: Path, count: int, size: int = 200) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for i in range(count):
        hue = (i / count) % 1.0
        r, g, b = (int(c * 255) for c in colorsys.hsv_to_rgb(hue, 0.55, 0.9))
        image = Image.new("RGB", (size, size), (r, g, b))
        draw = ImageDraw.Draw(image)
        label = str(i + 1)
        font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), label, font=font)
        text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(
            ((size - text_w) / 2 - bbox[0], (size - text_h) / 2 - bbox[1]),
            label,
            fill=(255, 255, 255),
            font=font,
        )
        image.save(output_dir / f"avatar_{i + 1:03d}.png")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--count", type=int, default=40)
    parser.add_argument("--output", type=Path, default=Path(__file__).parent / "avatars")
    args = parser.parse_args()
    generate(args.output, args.count)
    print(f"Generated {args.count} placeholder avatars in {args.output}")
