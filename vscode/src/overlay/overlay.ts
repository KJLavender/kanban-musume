// Runs inside VS Code's own window (added by patch.ts). Shows the current
// character in the bottom-right corner over a faded background illustration,
// and lets it react to you: breathing, typing along, pats and pokes, dragging,
// falling asleep when you leave, mumbling, and taking turns with the others.
//
// VS Code's page enforces Trusted Types, so the DOM is built with
// createElement/textContent only, never innerHTML.

import type { PetState } from "../../../src/core/events.js";
import { annoyedLine, touchLine, type TouchZone } from "../../../src/core/lines.js";
import type { OverlayCharacter, OverlayConfig } from "./assets.js";

declare global {
  interface Window {
    __ACP_PET__?: OverlayConfig;
  }
}

const SLEEP_AFTER_MS = 10 * 60_000;
const POKES_TO_ANNOY = 5;
const POKE_WINDOW_MS = 4000;
const STORE = "acpPet.overlay";

type Saved = { char?: string; right?: number; bottom?: number; switchedAt?: number };

function load(): Saved {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? "{}") as Saved;
  } catch {
    return {};
  }
}
function save(patch: Saved) {
  try {
    localStorage.setItem(STORE, JSON.stringify({ ...load(), ...patch }));
  } catch {
    /* storage unavailable: just don't remember */
  }
}

const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

const CSS = `
#acp-pet-bg { position: fixed; inset: 0; pointer-events: none; z-index: 20; background-repeat: no-repeat;
  background-size: contain; background-position: right center; transition: opacity 1.2s ease; }
#acp-pet { position: fixed; z-index: 21; pointer-events: none; display: flex; flex-direction: column;
  align-items: flex-end; transition: opacity 0.6s ease; }
#acp-pet.fading { opacity: 0; }
#acp-pet .acp-bubble { pointer-events: none; max-width: 240px; margin-bottom: 4px; padding: 6px 10px; border-radius: 10px;
  font: 13px/1.4 var(--vscode-font-family, sans-serif); color: var(--vscode-editorWidget-foreground, #ddd);
  background: var(--vscode-editorWidget-background, #252526); border: 1px solid var(--vscode-editorWidget-border, #454545);
  box-shadow: 0 2px 8px rgba(0,0,0,.35); opacity: 0; transform: translateY(4px); transition: opacity .2s, transform .2s; }
#acp-pet .acp-bubble.show { opacity: 1; transform: none; }
#acp-pet img { pointer-events: auto; cursor: grab; user-select: none; -webkit-user-drag: none;
  transform-origin: 50% 100%; animation: acp-breathe 3.2s ease-in-out infinite; filter: drop-shadow(0 3px 6px rgba(0,0,0,.35)); }
#acp-pet.dragging img { cursor: grabbing; animation: none; }
#acp-pet.pose-happy img, #acp-pet.pose-levelup img { animation: acp-hop .36s ease-in-out 4 alternate; }
#acp-pet.pose-typing img { animation: acp-jitter .14s steps(2) infinite; }
#acp-pet.pose-sulking img { animation: acp-shake .5s ease-in-out 2; }
#acp-pet.pose-sleeping img { animation: acp-breathe 5s ease-in-out infinite; filter: brightness(.85) drop-shadow(0 3px 6px rgba(0,0,0,.35)); }
@keyframes acp-breathe { 0%,100% { transform: scale(1, 1); } 50% { transform: scale(1.01, 1.025); } }
@keyframes acp-hop { from { transform: translateY(0); } to { transform: translateY(-14px); } }
@keyframes acp-jitter { from { transform: translateX(-1px); } to { transform: translateX(1px); } }
@keyframes acp-shake { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-4deg); } 75% { transform: rotate(4deg); } }
`;

function start(cfg: OverlayConfig) {
  const base = new URL("./acp-pet/", location.href);
  const url = (p: string) => new URL(p, base).href;

  const style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  const bg = document.createElement("div");
  bg.id = "acp-pet-bg";
  const wrap = document.createElement("div");
  wrap.id = "acp-pet";
  const bubble = document.createElement("div");
  bubble.className = "acp-bubble";
  const img = document.createElement("img");
  img.alt = "";
  img.draggable = false;
  img.style.height = `${cfg.height}px`;
  wrap.append(bubble, img);
  document.body.append(bg, wrap);

  const saved = load();
  const place = (right: number, bottom: number) => {
    const r = Math.max(0, Math.min(window.innerWidth - 80, right));
    const b = Math.max(0, Math.min(window.innerHeight - 80, bottom));
    wrap.style.right = `${r}px`;
    wrap.style.bottom = `${b}px`;
    return { right: r, bottom: b };
  };
  place(saved.right ?? 28, saved.bottom ?? 30);

  let index = Math.max(0, cfg.characters.findIndex((c) => c.id === saved.char));
  let char: OverlayCharacter = cfg.characters[index]!;
  let switchedAt = saved.switchedAt ?? Date.now();
  let pose: PetState = "idle";
  let poseTimer: ReturnType<typeof setTimeout> | undefined;
  let bubbleTimer: ReturnType<typeof setTimeout> | undefined;
  let lastActive = Date.now();
  let pokes: number[] = [];

  const asleep = () => pose === "sleeping";

  function setPose(next: PetState, holdMs = 0) {
    clearTimeout(poseTimer);
    pose = next;
    img.src = url(char.frames[next]);
    wrap.className = wrap.className.replace(/\bpose-\S+/g, "").trim();
    wrap.classList.add(`pose-${next}`);
    if (holdMs > 0) poseTimer = setTimeout(() => setPose("idle"), holdMs);
  }

  function say(line: string, ms = 5000) {
    clearTimeout(bubbleTimer);
    bubble.textContent = line.replace(/`/g, "");
    bubble.classList.add("show");
    bubbleTimer = setTimeout(() => bubble.classList.remove("show"), ms);
  }

  function showCharacter(c: OverlayCharacter) {
    char = c;
    bg.style.backgroundImage = c.background ? `url("${url(c.background)}")` : "none";
    bg.style.opacity = c.background ? String(cfg.backgroundOpacity) : "0";
    setPose("idle");
  }

  function nextCharacter() {
    if (cfg.characters.length < 2) return;
    wrap.classList.add("fading");
    bg.style.opacity = "0";
    setTimeout(() => {
      index = (index + 1) % cfg.characters.length;
      switchedAt = Date.now();
      save({ char: cfg.characters[index]!.id, switchedAt });
      showCharacter(cfg.characters[index]!);
      wrap.classList.remove("fading");
      setPose("happy", 1600);
      say(char.hello);
    }, 650);
  }

  function wake() {
    setPose("idle");
    say("唔…早安~");
  }

  function touch(zone: TouchZone) {
    const now = Date.now();
    pokes = [...pokes.filter((t) => now - t < POKE_WINDOW_MS), now];
    if (pokes.length >= POKES_TO_ANNOY) {
      pokes = [];
      setPose("sulking", 3500);
      say(annoyedLine(Math.random));
      return;
    }
    setPose("happy", 2200);
    say(touchLine(zone, Math.random));
  }

  // ── pointer: drag to move, click to pat, right-click for the next character ──

  let press: { x: number; y: number; right: number; bottom: number; moved: boolean } | null = null;
  img.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const r = wrap.getBoundingClientRect();
    press = { x: e.clientX, y: e.clientY, right: window.innerWidth - r.right, bottom: window.innerHeight - r.bottom, moved: false };
  });
  window.addEventListener("mousemove", (e) => {
    lastActive = Date.now();
    if (!press) return;
    const dx = e.clientX - press.x;
    const dy = e.clientY - press.y;
    if (!press.moved && Math.hypot(dx, dy) < 4) return;
    press.moved = true;
    wrap.classList.add("dragging");
    place(press.right - dx, press.bottom - dy);
  });
  window.addEventListener("mouseup", (e) => {
    if (!press) return;
    const p = press;
    press = null;
    wrap.classList.remove("dragging");
    if (p.moved) {
      const r = wrap.getBoundingClientRect();
      save(place(window.innerWidth - r.right, window.innerHeight - r.bottom));
      say(pick(["放這裡嗎?", "好,我待在這邊~", "嘿咻!"]), 2500);
      return;
    }
    if (asleep()) return wake();
    const box = img.getBoundingClientRect();
    const fy = (e.clientY - box.top) / Math.max(1, box.height);
    const fx = Math.abs((e.clientX - box.left) / Math.max(1, box.width) - 0.5);
    touch(fy < 0.24 ? "head" : fy < 0.42 && fx < 0.3 ? "cheek" : "body");
  });
  img.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    nextCharacter();
  });

  let lastGreet = 0;
  img.addEventListener("mouseenter", () => {
    const now = Date.now();
    if (asleep() || now - lastGreet < 30_000 || Math.random() > 0.5) return;
    lastGreet = now;
    say(pick(["主人在看我嗎?", "嗨~", "要摸摸頭嗎?", "被抓到在偷懶了…"]), 3000);
  });

  // ── keyboard: types along with you ──

  let lastKey = 0;
  window.addEventListener(
    "keydown",
    () => {
      const now = Date.now();
      lastActive = now;
      if (asleep()) return wake();
      if (now - lastKey < 300) return;
      lastKey = now;
      if (pose === "idle" || pose === "typing") setPose("typing", 1500);
    },
    { capture: true, passive: true },
  );

  // ── time: sleep when you're away, mumble now and then, take turns ──

  let nextMumble = Date.now() + 60_000 + Math.random() * 120_000;
  setInterval(() => {
    const now = Date.now();
    if (!asleep() && now - lastActive > SLEEP_AFTER_MS) {
      setPose("sleeping");
      say("Zzz…", 4000);
    }
    if (!asleep() && pose === "idle" && now >= nextMumble) {
      nextMumble = now + 90_000 + Math.random() * 150_000;
      say(pick(char.mumbles));
    }
    if (cfg.rotateMinutes > 0 && now - switchedAt >= cfg.rotateMinutes * 60_000 && !press) nextCharacter();
  }, 5000);

  window.addEventListener("resize", () => {
    const r = wrap.getBoundingClientRect();
    place(window.innerWidth - r.right, window.innerHeight - r.bottom);
  });

  showCharacter(char);
  setTimeout(() => say(char.hello), 2500);
}

// Never let the pet break the editor: any failure just means no pet.
try {
  const cfg = window.__ACP_PET__;
  if (cfg?.characters.length) {
    if (document.body) start(cfg);
    else window.addEventListener("DOMContentLoaded", () => start(cfg), { once: true });
  }
} catch (err) {
  console.error("[acp-pet] overlay failed", err);
}
