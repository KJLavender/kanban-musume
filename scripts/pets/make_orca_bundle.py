"""Turn a picture skin (one PNG per pose, like pets/deepseek) into a pet bundle
for Orca's built-in pet: pet.json plus a sprite sheet with the Codex animation
names Orca plays for agent states (idle, running, waiting, failed, ...).

    python scripts/pets/make_orca_bundle.py                 # every picture skin in pets/
    python scripts/pets/make_orca_bundle.py deepseek remilia --out dist-orca

Each pose becomes a short animation (breathing, walking bob, hop, typing
jitter, sway), so a still picture still moves. Frames are 320x400, much
sharper than Codex's 192x208; Orca accepts any frame size up to 1024.
Requires Pillow.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
FW, FH = 320, 400
COLUMNS = 8

# Same fallbacks as src/core/skins.ts IMAGE_FALLBACK (pose -> what to use instead).
FALLBACK = {
    "thinking": ["working", "idle"],
    "reading": ["working", "idle"],
    "typing": ["working", "idle"],
    "hammering": ["working", "idle"],
    "peeking": ["working", "idle"],
    "tugging": ["idle"],
    "happy": ["idle"],
    "levelup": ["happy", "idle"],
    "sick": ["idle"],
    "sulking": ["sick", "idle"],
    "bored": ["idle"],
    "sleeping": ["idle"],
}

# Orca/Codex animation -> (our pose, motion, frames, ms per frame, ms on the last frame).
ANIMATIONS = {
    "idle": ("idle", "breathe", 6, 420, 900),
    "running-right": ("idle", "walk-right", 8, 110, 110),
    "running-left": ("idle", "walk-left", 8, 110, 110),
    "waving": ("happy", "hop", 4, 140, 280),
    "jumping": ("levelup", "jump", 5, 120, 260),
    "failed": ("sick", "droop", 8, 180, 500),
    "waiting": ("tugging", "bob", 6, 180, 320),
    "running": ("typing", "jitter", 6, 90, 90),
    "review": ("reading", "sway", 6, 220, 380),
}


def load_pose(folder: Path, pose: str) -> Image.Image:
    for name in [pose, *FALLBACK.get(pose, [])]:
        for ext in (".png", ".webp", ".gif", ".jpg"):
            p = folder / f"{name}{ext}"
            if p.exists():
                return Image.open(p).convert("RGBA")
    raise FileNotFoundError(f"{folder} has no picture for {pose}")


def fit(img: Image.Image) -> Image.Image:
    """Scale to fit the frame with a margin for motion, keeping the aspect ratio."""
    box = img.getchannel("A").getbbox() or (0, 0, img.width, img.height)
    img = img.crop(box)
    scale = min((FW - 24) / img.width, (FH - 28) / img.height)
    return img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)


def frame(base: Image.Image, motion: str, i: int, n: int) -> Image.Image:
    t = i / n
    wave = math.sin(t * 2 * math.pi)
    img, dx, dy = base, 0.0, 0.0
    if motion == "breathe":
        img = base.resize((base.width, round(base.height * (1 + 0.012 * (1 - math.cos(t * 2 * math.pi)) / 2))), Image.LANCZOS)
    elif motion in ("walk-right", "walk-left"):
        if motion == "walk-right":
            img = ImageOps.mirror(base)
        dy = -abs(wave) * 7
        img = img.rotate(wave * 2.5, resample=Image.BICUBIC, center=(img.width / 2, img.height), expand=False)
    elif motion == "hop":
        dy = -abs(wave) * 12
    elif motion == "jump":
        dy = -math.sin(t * math.pi) * 22
    elif motion == "droop":
        dy = 3 * t
        img = base.rotate(math.sin(t * 6 * math.pi) * 1.5, resample=Image.BICUBIC, center=(base.width / 2, base.height))
    elif motion == "bob":
        dy = -abs(wave) * 5
    elif motion == "jitter":
        dx = 2 if i % 2 else -2
    elif motion == "sway":
        img = base.rotate(wave * 3, resample=Image.BICUBIC, center=(base.width / 2, base.height))
    out = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    x = round((FW - img.width) / 2 + dx)
    y = round(FH - 6 - img.height + dy)  # feet on the same baseline in every frame
    out.alpha_composite(img, (x, max(0, y)))
    return out


def build(folder: Path, out_root: Path) -> Path:
    meta = json.loads((folder / "skin.json").read_text(encoding="utf-8")) if (folder / "skin.json").exists() else {}
    sheet = Image.new("RGBA", (FW * COLUMNS, FH * len(ANIMATIONS)), (0, 0, 0, 0))
    animations = {}
    for row, (name, (pose, motion, frames, ms, last_ms)) in enumerate(ANIMATIONS.items()):
        base = fit(load_pose(folder, pose))
        for i in range(frames):
            sheet.alpha_composite(frame(base, motion, i, frames), (i * FW, row * FH))
        animations[name] = {"row": row, "frames": frames, "frameDurationsMs": [ms] * (frames - 1) + [last_ms]}
    out = out_root / folder.name
    out.mkdir(parents=True, exist_ok=True)
    sheet.save(out / "spritesheet.webp", "WEBP", lossless=True, method=6)
    manifest = {
        "id": folder.name,
        "displayName": meta.get("name", folder.name),
        "description": "Kanban Musume character, made from picture poses. https://github.com/KJLavender/kanban-musume",
        "spritesheetPath": "spritesheet.webp",
        "frame": {"width": FW, "height": FH},
        "fps": 8,
        "defaultAnimation": "idle",
        "animations": animations,
    }
    (out / "pet.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return out


def picture_skins(pets: Path) -> list[str]:
    return sorted(p.name for p in pets.iterdir() if p.is_dir() and (p / "idle.png").exists() and not (p / "pet.json").exists())


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*", help="picture skin folders in pets/ (default: all of them)")
    ap.add_argument("--pets", default=str(ROOT / "pets"))
    ap.add_argument("--out", default=str(ROOT / "dist-orca"))
    args = ap.parse_args()
    pets = Path(args.pets)
    for pet_id in args.ids or picture_skins(pets):
        print("wrote", build(pets / pet_id, Path(args.out)))
