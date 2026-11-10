// Puts the character overlay into VS Code itself, the way doki-theme does:
// one <script> line in workbench.html plus an acp-pet/ folder next to it.
// The checksum in product.json is updated too, so VS Code doesn't call the
// install corrupt. Everything is undone by unpatch(). Pure fs, so it can be
// tested on a fake install folder.

import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const START = "<!-- acp-pet:start -->";
const END = "<!-- acp-pet:end -->";
const TAG = `${START}<script src="./acp-pet/overlay.js"></script>${END}`;
const BLOCK = /\s*<!-- acp-pet:start -->[\s\S]*?<!-- acp-pet:end -->/g;

/** Where workbench.html lives, relative to <appRoot>/out. Newer builds use electron-browser. */
const CANDIDATES = ["vs/code/electron-browser/workbench/workbench.html", "vs/code/electron-sandbox/workbench/workbench.html"];

export type Install = { appRoot: string; html: string; rel: string; assetDir: string };

export function findWorkbench(appRoot: string): Install {
  for (const rel of CANDIDATES) {
    const html = join(appRoot, "out", rel);
    if (existsSync(html)) return { appRoot, html, rel, assetDir: join(html, "..", "acp-pet") };
  }
  throw new Error(`can't find workbench.html under ${appRoot}`);
}

/** VS Code's checksum: sha256, base64, no padding. */
export const checksum = (data: Buffer | string) => createHash("sha256").update(data).digest("base64").replace(/=+$/, "");

async function fixChecksum(inst: Install, html: string) {
  const productPath = join(inst.appRoot, "product.json");
  const text = await readFile(productPath, "utf8");
  const product = JSON.parse(text) as { checksums?: Record<string, string> };
  if (!product.checksums || !(inst.rel in product.checksums)) return;
  const next = checksum(html);
  if (product.checksums[inst.rel] === next) return;
  // Replace just that value, so the rest of product.json stays byte-for-byte the same.
  const key = JSON.stringify(inst.rel);
  const updated = text.replace(new RegExp(`(${key.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}\\s*:\\s*)"[^"]*"`), `$1"${next}"`);
  await writeFile(productPath, updated, "utf8");
}

export const isPatched = async (inst: Install) => (await readFile(inst.html, "utf8")).includes(START);

/**
 * Copy the overlay files (a folder holding overlay.js and the pictures) into
 * VS Code and add the script line. Safe to run again: it replaces both.
 */
export async function patch(inst: Install, assets: string): Promise<void> {
  const original = (await readFile(inst.html, "utf8")).replace(BLOCK, "");
  if (!original.includes("</html>")) throw new Error("workbench.html looks unfamiliar; not touching it");
  await rm(inst.assetDir, { recursive: true, force: true });
  await mkdir(inst.assetDir, { recursive: true });
  await cp(assets, inst.assetDir, { recursive: true });
  const html = original.replace("</html>", `\t${TAG}\n</html>`);
  await writeFile(inst.html, html, "utf8");
  await fixChecksum(inst, html);
}

/** Remove the script line and the files, and put the checksum back. */
export async function unpatch(inst: Install): Promise<void> {
  const html = (await readFile(inst.html, "utf8")).replace(BLOCK, "");
  await writeFile(inst.html, html, "utf8");
  await rm(inst.assetDir, { recursive: true, force: true });
  await fixChecksum(inst, html);
}
