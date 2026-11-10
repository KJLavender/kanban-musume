import { describe, expect, it } from "vitest";
import { helloFor, nextCharacter } from "../vscode/src/rotation.js";

const installed = new Set(["hikari", "nozomi", "deepseek", "flandre", "remilia"]);
const list = ["hikari", "nozomi", "deepseek", "flandre", "remilia"];

describe("nextCharacter", () => {
  it("walks the list in order and wraps around", () => {
    expect(nextCharacter(list, "hikari", installed)).toBe("nozomi");
    expect(nextCharacter(list, "remilia", installed)).toBe("hikari");
  });

  it("starts at the first one when nothing (or something unlisted) is showing", () => {
    expect(nextCharacter(list, undefined, installed)).toBe("hikari");
    expect(nextCharacter(list, "chick", installed)).toBe("hikari");
  });

  it("skips characters that aren't installed", () => {
    expect(nextCharacter(["hikari", "ghost", "flandre"], "hikari", installed)).toBe("flandre");
    expect(nextCharacter(["ghost"], undefined, installed)).toBeNull();
  });

  it("each character says hello in their own way", () => {
    expect(helloFor("remilia")).toContain("紅魔館");
    expect(helloFor("hikari-pixel")).toBe(helloFor("hikari"));
    expect(helloFor("my-cat")).toBe("換我來陪你了~");
  });
});
