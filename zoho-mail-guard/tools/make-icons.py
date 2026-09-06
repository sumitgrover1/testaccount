#!/usr/bin/env python3
"""Generate the extension's PNG icons: a white shield on the brand indigo.

Run from the project root:  python3 tools/make-icons.py
Kept in the repo so the icons can be regenerated instead of being opaque binaries.
"""
import struct
import zlib
from pathlib import Path

BG = (26, 79, 214)      # brand indigo
FG = (255, 255, 255)    # shield
SS = 4                  # supersampling factor for anti-aliasing

OUT_DIR = Path(__file__).resolve().parent.parent / "icons"
SIZES = (16, 32, 48, 128)


def in_rounded_square(x, y, radius=0.18):
    """Unit-square rounded rectangle covering the whole canvas."""
    dx = max(radius - x, x - (1 - radius), 0.0)
    dy = max(radius - y, y - (1 - radius), 0.0)
    return dx * dx + dy * dy <= radius * radius


def in_shield(x, y):
    """Classic shield: straight shoulders, then tapering to a point."""
    top, waist, tip = 0.20, 0.54, 0.84
    half = 0.25
    if y < top or y > tip:
        return False
    if y <= waist:
        return abs(x - 0.5) <= half
    taper = (tip - y) / (tip - waist)
    return abs(x - 0.5) <= half * (0.35 + 0.65 * taper)


def in_check(x, y):
    """Tick inside the shield, drawn as two thick line segments."""
    def near_segment(ax, ay, bx, by, width):
        vx, vy = bx - ax, by - ay
        length2 = vx * vx + vy * vy
        t = max(0.0, min(1.0, ((x - ax) * vx + (y - ay) * vy) / length2))
        px, py = ax + t * vx, ay + t * vy
        return (x - px) ** 2 + (y - py) ** 2 <= width * width

    return near_segment(0.38, 0.50, 0.46, 0.60, 0.045) or near_segment(
        0.46, 0.60, 0.63, 0.38, 0.045
    )


def render(size):
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            r = g = b = a = 0.0
            for sy in range(SS):
                for sx in range(SS):
                    x = (px + (sx + 0.5) / SS) / size
                    y = (py + (sy + 0.5) / SS) / size
                    if not in_rounded_square(x, y):
                        continue
                    colour = FG if (in_shield(x, y) and not in_check(x, y)) else BG
                    r += colour[0]
                    g += colour[1]
                    b += colour[2]
                    a += 255
            samples = SS * SS
            if a == 0:
                row += bytes((0, 0, 0, 0))
            else:
                # Un-premultiply so transparent corners keep clean edges.
                row += bytes(
                    (
                        round(r / (a / 255)),
                        round(g / (a / 255)),
                        round(b / (a / 255)),
                        round(a / samples),
                    )
                )
        rows.append(bytes(row))
    return rows


def write_png(path, size, rows):
    raw = b"".join(b"\x00" + row for row in rows)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        target = OUT_DIR / f"icon-{size}.png"
        write_png(target, size, render(size))
        print(f"wrote {target.relative_to(OUT_DIR.parent)} ({target.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
