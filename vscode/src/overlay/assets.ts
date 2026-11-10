// Gathers what the editor overlay needs into one folder: each character's
// pose pictures, an optional background illustration, and overlay.js with
// the settings baked in (VS Code's page may only load files from its own
// folder, so everything is copied, not linked).

import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import { mumblesFor } from "../../../src/core/ambient.js";
import type { PetState } from "../../../src/core/events.js";
import { IMAGE_FALLBACK, POSES } from "../../../src/core/skins.js";
import { helloFor } from "../rotation.js";

const IMAGES = new Set([".png", ".gif", ".webp", ".jpg", ".jpeg"]);

export type OverlayCharacter = {
  id: string;
  name: string;
  hello: string;
  mumbles: readonly string[];
  /** Pose → path inside the overlay folder. Every pose is filled (fallbacks applied). */
  frames: Record<PetState, string>;
  background: string | null;
};

export type OverlayConfig = {
  rotateMinutes: number;
  /** 0–1: how strongly the background illustration shows through. */
  backgroundOpacity: number;
  /** Character height in CSS pixels. */
  height: number;
  characters: OverlayCharacter[];
};

export type BuildOptions = {
  ids: string[];
  /** Searched in order for <id>/ folders with pictures (bundled pets, then ~/.acp-pet/skins). */
  skinDirs: string[];
  /** Holds <id>.png/.webp/.jpg backgrounds (~/.acp-pet/backgrounds); falls back to background.* in the skin folder. */
  backgroundDir: string;
  rotateMinutes: number;
  backgroundOpacity: number;
  height: number;
  /** The bundled overlay script (dist/overlay.js). */
  script: string;
};

/** A picture skin folder for this id: has idle.*, and isn't a sprite-sheet pack. */
async function findPictures(id: string, dirs: string[]): Promise<{ dir: string; files: Map<string, string> } | null> {
  for (const root of dirs) {
    const dir = join(root, id);
    if (!existsSync(dir) || existsSync(join(dir, "pet.json"))) continue;
    const files = new Map<string, string>();
    for (const f of await readdir(dir)) {
      const ext = extname(f).toLowerCase();
      if (IMAGES.has(ext)) files.set(f.slice(0, -ext.length).toLowerCase(), f);
    }
    if (files.has("idle")) return { dir, files };
  }
  return null;
}

async function readName(dir: string, id: string) {
  try {
    const meta = JSON.parse(await readFile(join(dir, "skin.json"), "utf8")) as { name?: unknown };
    if (typeof meta.name === "string") return meta.name;
  } catch {
    /* no skin.json */
  }
  return id;
}

export async function buildOverlay(out: string, opts: BuildOptions): Promise<OverlayConfig> {
  const characters: OverlayCharacter[] = [];
  for (const id of opts.ids) {
    const found = await findPictures(id, opts.skinDirs);
    if (!found) continue; // not installed, or a sprite-sheet pack the overlay can't show
    const target = join(out, id);
    await mkdir(target, { recursive: true });
    const frames = {} as Record<PetState, string>;
    for (const pose of POSES) {
      const name = [pose, ...IMAGE_FALLBACK[pose]].find((n) => found.files.has(n))!;
      const file = found.files.get(name)!;
      if (!existsSync(join(target, file))) await copyFile(join(found.dir, file), join(target, file));
      frames[pose] = `${id}/${file}`;
    }
    let background: string | null = null;
    // Your own picture in ~/.acp-pet/backgrounds wins over the one shipped in the
    // skin folder. Cut-outs (PNG/WebP with transparency) first; see scripts/pets/cut_background.py.
    const exts = [".png", ".webp", ".jpg", ".jpeg"];
    const candidates = [
      ...exts.map((ext) => join(opts.backgroundDir, `${id}${ext}`)),
      ...exts.map((ext) => join(found.dir, `background${ext}`)),
    ];
    for (const src of candidates) {
      const ext = extname(src);
      if (existsSync(src)) {
        await copyFile(src, join(target, `background${ext}`));
        background = `${id}/background${ext}`;
        break;
      }
    }
    characters.push({
      id,
      name: await readName(found.dir, id),
      hello: helloFor(id),
      mumbles: mumblesFor(id),
      frames,
      background,
    });
  }
  const config: OverlayConfig = {
    rotateMinutes: opts.rotateMinutes,
    backgroundOpacity: opts.backgroundOpacity,
    height: opts.height,
    characters,
  };
  await writeFile(join(out, "overlay.js"), `window.__ACP_PET__ = ${JSON.stringify(config)};\n${opts.script}`, "utf8");
  return config;
}
