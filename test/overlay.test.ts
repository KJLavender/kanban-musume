import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildOverlay } from "../vscode/src/overlay/assets.js";
import { checksum, findWorkbench, isPatched, patch, unpatch } from "../vscode/src/overlay/patch.js";

const HTML = `<!DOCTYPE html>\n<html>\n\t<head></head>\n\t<body></body>\n\t<script src="./workbench.js" type="module"></script>\n</html>\n`;
const REL = "vs/code/electron-browser/workbench/workbench.html";

/** A tiny stand-in for <VS Code>/resources/app. */
async function fakeInstall() {
  const app = await mkdtemp(join(tmpdir(), "acp-pet-fake-vscode-"));
  await mkdir(join(app, "out", "vs/code/electron-browser/workbench"), { recursive: true });
  await writeFile(join(app, "out", REL), HTML);
  const product = `{\n  "nameShort": "Code",\n  "checksums": {\n    "${REL}": "${checksum(HTML)}",\n    "vs/other.js": "keep"\n  }\n}\n`;
  await writeFile(join(app, "product.json"), product);
  const assets = join(app, "assets");
  await mkdir(assets);
  await writeFile(join(assets, "overlay.js"), "/* overlay */");
  return { app, assets, product };
}

describe("patching VS Code", () => {
  it("adds one script line, copies the files and keeps the checksum valid", async () => {
    const { app, assets } = await fakeInstall();
    const inst = findWorkbench(app);
    await patch(inst, assets);
    const html = await readFile(inst.html, "utf8");
    expect(html.match(/acp-pet\/overlay\.js/g)).toHaveLength(1);
    expect(await isPatched(inst)).toBe(true);
    expect(existsSync(join(inst.assetDir, "overlay.js"))).toBe(true);
    const product = JSON.parse(await readFile(join(app, "product.json"), "utf8"));
    expect(product.checksums[REL]).toBe(checksum(html));
    expect(product.checksums["vs/other.js"]).toBe("keep");
  });

  it("patching twice doesn't add a second line", async () => {
    const { app, assets } = await fakeInstall();
    const inst = findWorkbench(app);
    await patch(inst, assets);
    await patch(inst, assets);
    expect((await readFile(inst.html, "utf8")).match(/acp-pet:start/g)).toHaveLength(1);
  });

  it("unpatch puts workbench.html and product.json back exactly", async () => {
    const { app, assets, product } = await fakeInstall();
    const inst = findWorkbench(app);
    await patch(inst, assets);
    await unpatch(inst);
    expect(await readFile(inst.html, "utf8")).toBe(HTML);
    expect(await readFile(join(app, "product.json"), "utf8")).toBe(product);
    expect(existsSync(inst.assetDir)).toBe(false);
    expect(await isPatched(inst)).toBe(false);
  });

  it("refuses a folder that isn't a VS Code install", async () => {
    expect(() => findWorkbench(tmpdir())).toThrow(/workbench\.html/);
  });
});

describe("building the overlay folder", () => {
  it("uses the background shipped in the skin folder when you haven't set your own", async () => {
    const out = await mkdtemp(join(tmpdir(), "acp-pet-overlay-"));
    const cfg = await buildOverlay(out, {
      ids: ["remilia"],
      skinDirs: [join(__dirname, "..", "pets")],
      backgroundDir: join(out, "no-such-dir"),
      rotateMinutes: 5,
      backgroundOpacity: 0.1,
      height: 200,
      script: "",
    });
    expect(cfg.characters[0]!.background).toBe("remilia/background.png");
    expect(existsSync(join(out, "remilia", "background.png"))).toBe(true);
  });

  it("collects picture skins with fallbacks, skips sprite-sheet packs and missing ones", async () => {
    const out = await mkdtemp(join(tmpdir(), "acp-pet-overlay-"));
    const bgs = await mkdtemp(join(tmpdir(), "acp-pet-bg-"));
    await writeFile(join(bgs, "flandre.png"), "fake png");
    const cfg = await buildOverlay(out, {
      ids: ["flandre", "hikari", "nobody"],
      skinDirs: [join(__dirname, "..", "pets")],
      backgroundDir: bgs,
      rotateMinutes: 5,
      backgroundOpacity: 0.1,
      height: 200,
      script: "console.log('overlay')",
    });
    // hikari is the code-drawn sprite sheet, nobody doesn't exist: only Flandre remains
    expect(cfg.characters.map((c) => c.id)).toEqual(["flandre"]);
    const f = cfg.characters[0]!;
    expect(f.frames.idle).toBe("flandre/idle.png");
    expect(f.frames.levelup).toBe("flandre/levelup.png");
    expect(f.background).toBe("flandre/background.png");
    expect(f.mumbles.length).toBeGreaterThan(0);
    for (const path of Object.values(f.frames)) expect(existsSync(join(out, path))).toBe(true);
    const js = await readFile(join(out, "overlay.js"), "utf8");
    expect(js.startsWith("window.__ACP_PET__ = {")).toBe(true);
    expect(js).toContain("console.log('overlay')");
  });
});
