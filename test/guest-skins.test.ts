import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { listSkins, loadSkin } from "../src/core/skins";

const PETS = resolve(__dirname, "../pets");

describe("bundled picture skins", () => {
  it.each(["deepseek", "flandre", "remilia"])("%s loads with its own pictures", async (id) => {
    const info = (await listSkins(PETS)).find((s) => s.id === id);
    expect(info?.type).toBe("images");
    const skin = await loadSkin(PETS, id);
    expect(skin.type).toBe("images");
  });
});
