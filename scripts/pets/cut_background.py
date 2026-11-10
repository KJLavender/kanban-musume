"""Cut a character illustration out of a plain white (or black) backdrop, for
the faded background the VS Code overlay shows behind the pet.

    python scripts/pets/cut_background.py art.jpg deepseek
    python scripts/pets/cut_background.py bench.jpg flandre --backdrop black
    python scripts/pets/cut_background.py scene.png remilia --backdrop none --feather 0.15

When the figure is cropped by the bottom edge (legs running off the picture),
add --no-bottom so pale skin touching that edge isn't mistaken for backdrop.

A full scene with no plain backdrop (--backdrop none) can't be cut out; give it
--feather instead so its edges fade into the editor rather than ending in a box.

Writes a transparent PNG to ~/.acp-pet/backgrounds/<id>.png (or --out).
Only backdrop pixels connected to the image border are removed, so whites
inside the drawing (aprons, eyes, frills) stay. Requires Pillow and numpy.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def flood_from_border(backdrop: np.ndarray, bottom: bool = True) -> np.ndarray:
    """Pixels of `backdrop` reachable from the image border (scanline fill)."""
    h, w = backdrop.shape
    seen = np.zeros((h, w), bool)
    rows = (0, h - 1) if bottom else (0,)
    stack = [(y, x) for x in range(w) for y in rows if backdrop[y, x]]
    stack += [(y, x) for y in range(h if bottom else h - 1) for x in (0, w - 1) if backdrop[y, x]]
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


def cut(img: Image.Image, backdrop: str, feather: float = 0.0, bottom: bool = True) -> Image.Image:
    rgb = np.asarray(img.convert("RGB")).astype(np.int16)
    lo, hi = rgb.min(axis=2), rgb.max(axis=2)
    flat = (hi - lo) < 24  # grey-ish: JPEG noise on a plain backdrop
    mask = np.zeros(lo.shape, bool)
    if backdrop in ("white", "both"):
        mask |= flat & (lo > 228)
    if backdrop in ("black", "both"):
        mask |= flat & (hi < 28)
    alpha = Image.fromarray(np.where(flood_from_border(mask, bottom), 0, 255).astype(np.uint8))
    if backdrop != "none":
        # eat the 1px fringe JPEG leaves around the outline, then soften the edge
        alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = img.convert("RGBA")
    out.putalpha(alpha)
    out = out.crop(out.getchannel("A").getbbox())
    if feather > 0:
        # fade every side to transparent over `feather` of the shorter side
        w, h = out.size
        band = max(1.0, feather * min(w, h))
        ys = np.minimum(np.arange(h), np.arange(h)[::-1])[:, None]
        xs = np.minimum(np.arange(w), np.arange(w)[::-1])[None, :]
        ramp = np.clip(np.minimum(xs, ys) / band, 0, 1) ** 1.5
        a = np.asarray(out.getchannel("A")).astype(np.float32) * ramp
        out.putalpha(Image.fromarray(a.astype(np.uint8)))
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("image")
    ap.add_argument("id", help="character id, e.g. deepseek")
    ap.add_argument("--backdrop", choices=["white", "black", "both", "none"], default="white")
    ap.add_argument("--feather", type=float, default=0.0, help="fade the edges over this share of the shorter side, e.g. 0.15")
    ap.add_argument("--no-bottom", action="store_true", help="don't start from the bottom edge (figure is cropped there)")
    ap.add_argument("--out", default=str(Path.home() / ".acp-pet" / "backgrounds"))
    args = ap.parse_args()
    result = cut(Image.open(args.image), args.backdrop, args.feather, not args.no_bottom)
    target = Path(args.out) / f"{args.id}.png"
    target.parent.mkdir(parents=True, exist_ok=True)
    result.save(target, optimize=True)
    print(f"wrote {target} ({result.width}x{result.height})")
