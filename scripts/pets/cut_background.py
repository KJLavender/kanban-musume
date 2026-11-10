"""Cut a character illustration out of a plain white (or black) backdrop, for
the faded background the VS Code overlay shows behind the pet.

    python scripts/pets/cut_background.py art.jpg deepseek
    python scripts/pets/cut_background.py bench.jpg flandre --backdrop black

Writes a transparent PNG to ~/.acp-pet/backgrounds/<id>.png (or --out).
Only backdrop pixels connected to the image border are removed, so whites
inside the drawing (aprons, eyes, frills) stay. Requires Pillow and numpy.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def flood_from_border(backdrop: np.ndarray) -> np.ndarray:
    """Pixels of `backdrop` reachable from the image border (scanline fill)."""
    h, w = backdrop.shape
    seen = np.zeros((h, w), bool)
    stack = [(y, x) for x in range(w) for y in (0, h - 1) if backdrop[y, x]]
    stack += [(y, x) for y in range(h) for x in (0, w - 1) if backdrop[y, x]]
    while stack:
        y, x = stack.pop()
        if seen[y, x]:
            continue
        # extend left and right along the row, then queue the rows above and below
        x0 = x
        while x0 > 0 and backdrop[y, x0 - 1] and not seen[y, x0 - 1]:
            x0 -= 1
        x1 = x
        while x1 < w - 1 and backdrop[y, x1 + 1] and not seen[y, x1 + 1]:
            x1 += 1
        seen[y, x0 : x1 + 1] = True
        for ny in (y - 1, y + 1):
            if 0 <= ny < h:
                row = backdrop[ny, x0 : x1 + 1] & ~seen[ny, x0 : x1 + 1]
                stack.extend((ny, x0 + int(i)) for i in np.flatnonzero(row))
    return seen


def cut(img: Image.Image, backdrop: str) -> Image.Image:
    rgb = np.asarray(img.convert("RGB")).astype(np.int16)
    lo, hi = rgb.min(axis=2), rgb.max(axis=2)
    flat = (hi - lo) < 24  # grey-ish: JPEG noise on a plain backdrop
    mask = flat & (lo > 228) if backdrop == "white" else flat & (hi < 28)
    gone = flood_from_border(mask)
    alpha = Image.fromarray(np.where(gone, 0, 255).astype(np.uint8))
    # eat the 1px fringe JPEG leaves around the outline, then soften the edge
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = img.convert("RGBA")
    out.putalpha(alpha)
    return out.crop(out.getchannel("A").getbbox())


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("id", help="character id, e.g. deepseek")
    ap.add_argument("--backdrop", choices=["white", "black"], default="white")
    ap.add_argument("--out", default=str(Path.home() / ".acp-pet" / "backgrounds"))
    args = ap.parse_args()
    result = cut(Image.open(args.image), args.backdrop)
    target = Path(args.out) / f"{args.id}.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    result.save(target, optimize=True)
    print(f"wrote {target} ({result.width}x{result.height})")
