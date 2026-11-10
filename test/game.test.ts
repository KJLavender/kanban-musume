import { describe, expect, it } from "vitest";
import { Debounce, looksLikeGaming, processName, TypingDetector } from "../src/core/game.js";

describe("looksLikeGaming", () => {
  it.each([
    [3, "", true], // full-screen Direct3D game
    [2, "", true], // some other full-screen app
    [4, "", true], // presentation mode
    [5, "", false], // normal desktop
    [0, "", false], // unknown
    [5, "genshin", true], // listed game in a borderless window
  ])("state %i, process %j → %s", (notificationState, gameProcess, want) => {
    expect(looksLikeGaming({ notificationState, gameProcess })).toBe(want);
  });

  it("normalizes process names the way Get-Process wants them", () => {
    expect(processName(" Genshin.EXE ")).toBe("genshin");
    expect(processName("eldenring")).toBe("eldenring");
  });
});

describe("Debounce", () => {
  it("turns on at once and off only after two misses in a row", () => {
    const d = new Debounce(2);
    expect(d.push(true)).toBe(true);
    expect(d.value).toBe(true);
    expect(d.push(false)).toBe(false); // one alt-tab blip
    expect(d.push(true)).toBe(false);
    expect(d.push(false)).toBe(false);
    expect(d.push(false)).toBe(true);
    expect(d.value).toBe(false);
  });
});

describe("TypingDetector", () => {
  const still = { x: 10, y: 10 };
  it("needs three seconds of input with a still mouse, then holds for a while", () => {
    const t = new TypingDetector(3, 8);
    expect(t.push(0, still, 0)).toBe(false);
    expect(t.push(0, still, 1)).toBe(false);
    expect(t.push(0, still, 2)).toBe(false);
    expect(t.push(0, still, 3)).toBe(true);
    // stopped typing (idle grows) but still within the hold window
    expect(t.push(4, still, 7)).toBe(true);
    expect(t.push(9, still, 12)).toBe(false);
  });

  it("moving the mouse is not typing", () => {
    const t = new TypingDetector(3, 8);
    for (let s = 0; s < 10; s++) expect(t.push(0, { x: s * 5, y: 0 }, s)).toBe(false);
  });
});
