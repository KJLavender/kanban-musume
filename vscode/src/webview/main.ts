// Runs inside the sidebar webview. Draws the pet the same way the desktop
// renderer does (pixel chick, Codex atlas, or one picture per pose) and
// reports clicks and permission answers to the extension.

import type { PetSnapshot, PetState } from "../../../src/core/events.js";
import { lookCell, lookIndex } from "../../../src/core/look.js";
import type { Skin } from "../../../src/core/skins.js";
import { drawPet, LOGICAL_H, LOGICAL_W } from "../../../src/renderer/sprite.js";

declare function acquireVsCodeApi(): { postMessage(m: unknown): void };
const vscode = acquireVsCodeApi();

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const art = $("art");
const canvas = $<HTMLCanvasElement>("pet");
const petImg = $<HTMLImageElement>("pet-img");
const badge = $("badge");
const progress = $("progress");
const bubble = $("bubble");
const sign = $("sign");
const status = $("status");
const ctx = canvas.getContext("2d")!;

let snap: PetSnapshot | null = null;
let skin: Skin | null = null;
let atlasImg: HTMLImageElement | null = null;
let lookAt: number | null = null;

const PIXEL_SCALE = 5;

const BADGES: Partial<Record<PetState, string>> = {
  thinking: "💡", reading: "📖", typing: "⌨️", hammering: "🔨", peeking: "🔭", tugging: "🪧",
  happy: "💛", levelup: "✨", sick: "🤒", sulking: "😤", sleeping: "💤", bored: "💭",
};

function applySkin(next: Skin) {
  skin = next;
  art.dataset.type = next.type;
  canvas.classList.toggle("hidden", next.type === "images");
  petImg.classList.toggle("hidden", next.type !== "images");
  petImg.removeAttribute("src");
  atlasImg = null;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (next.type === "pixel") {
    canvas.width = LOGICAL_W * PIXEL_SCALE;
    canvas.height = LOGICAL_H * PIXEL_SCALE;
    ctx.imageSmoothingEnabled = false;
    ctx.scale(PIXEL_SCALE, PIXEL_SCALE);
  } else if (next.type === "atlas") {
    canvas.width = next.cellWidth;
    canvas.height = next.cellHeight;
    const img = new Image();
    img.src = next.sheet;
    atlasImg = img;
  }
  art.classList.toggle("pixelated", next.type !== "pixel" && next.pixelated);
  // a quick fade so a character change is noticeable
  art.classList.remove("swap");
  void art.offsetWidth;
  art.classList.add("swap");
  if (snap) renderPose(snap);
}

function renderPose(s: PetSnapshot) {
  art.className = art.className.replace(/\bpose-\S+/g, "").trim();
  art.classList.add(`pose-${s.state}`);
  const generic = skin?.type === "atlas" || (skin?.type === "images" && skin.generic.includes(s.state));
  art.classList.toggle("generic", generic);
  const show = generic && BADGES[s.state];
  badge.textContent = show ? BADGES[s.state]! : "";
  badge.classList.toggle("hidden", !show);
  if (skin?.type === "images") {
    const src = skin.frames[s.state] ?? skin.frames.idle!;
    if (petImg.getAttribute("src") !== src) petImg.setAttribute("src", src);
  }
}

function cycle(durations: number[], t: number) {
  let at = t % durations.reduce((a, b) => a + b, 0);
  let f = 0;
  while (f < durations.length - 1 && at >= durations[f]!) at -= durations[f++]!;
  return f;
}

function frame(t: number) {
  if (snap && skin?.type === "pixel") drawPet(ctx, snap.state, snap.needs.level, t, skin.palette);
  if (snap && skin?.type === "atlas" && atlasImg?.complete) {
    const { cellWidth: w, cellHeight: h } = skin;
    let row: number;
    let col: number;
    if (skin.look && snap.state === "idle" && lookAt !== null) ({ row, col } = lookCell(lookAt));
    else {
      const r = skin.rows[snap.state];
      row = r.row;
      col = cycle(r.durations, t);
    }
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(atlasImg, col * w, row * h, w, h, 0, 0, w, h);
  }
  if (snap?.permission) {
    const left = Math.max(0, Math.ceil((snap.permission.deadline - Date.now()) / 1000));
    $("sign-timer").textContent = `${left}s 後自動拒絕`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const richLine = (s: string) => escapeHtml(s).replace(/`([^`]+)`/g, "<code>$1</code>");

let lastLine: string | null = null;
let bubbleTimer: ReturnType<typeof setTimeout> | undefined;

function applySnapshot(s: PetSnapshot) {
  const poseChanged = snap?.state !== s.state;
  snap = s;
  if (poseChanged) renderPose(s);
  if (s.line !== lastLine) {
    lastLine = s.line;
    clearTimeout(bubbleTimer);
    bubble.classList.toggle("hidden", !s.line);
    if (s.line) {
      bubble.innerHTML = richLine(s.line);
      bubbleTimer = setTimeout(() => bubble.classList.add("hidden"), 6000);
    }
  }
  if (s.permission) {
    $("sign-what").textContent = s.permission.title;
    $("sign-detail").textContent = s.permission.detail ?? "";
    sign.dataset.id = s.permission.id;
    sign.classList.remove("hidden");
    bubble.classList.add("hidden");
  } else sign.classList.add("hidden");
  progress.textContent = s.progress ? `🏃 ${s.progress.step}/${s.progress.total}` : "";
  progress.classList.toggle("hidden", !s.progress);
  const n = s.needs;
  status.textContent = `${skin?.name ?? ""}・Lv.${n.level}・完成 ${n.tasksDone} 個任務${s.busy ? "・工作中" : ""}`;
}

window.addEventListener("message", (e: MessageEvent) => {
  const m = e.data as { type: string; skin?: Skin; snapshot?: PetSnapshot };
  if (m.type === "skin" && m.skin) applySkin(m.skin);
  else if (m.type === "snapshot" && m.snapshot) applySnapshot(m.snapshot);
});

$("allow").addEventListener("click", () => sign.dataset.id && vscode.postMessage({ type: "answer", id: sign.dataset.id, decision: "allow" }));
$("reject").addEventListener("click", () => sign.dataset.id && vscode.postMessage({ type: "answer", id: sign.dataset.id, decision: "reject" }));

/** Head = top of the drawing, then the face, then the body. */
function touchZone(x: number, y: number) {
  const r = (skin?.type === "images" ? petImg : canvas).getBoundingClientRect();
  const fy = (y - r.top) / Math.max(1, r.height);
  const fx = Math.abs((x - r.left) / Math.max(1, r.width) - 0.5);
  return fy < 0.24 ? "head" : fy < 0.42 && fx < 0.3 ? "cheek" : "body";
}

let clickTimer: ReturnType<typeof setTimeout> | undefined;
art.addEventListener("click", (e) => {
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = undefined;
    vscode.postMessage({ type: "feed" });
    return;
  }
  const zone = touchZone(e.clientX, e.clientY);
  clickTimer = setTimeout(() => {
    clickTimer = undefined;
    vscode.postMessage(snap?.state === "sleeping" ? { type: "wake" } : { type: "touch", zone });
  }, 250);
});
art.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  vscode.postMessage({ type: "menu" });
});

// v2 packs turn their heads to follow the mouse while it is over the panel.
window.addEventListener("mousemove", (e) => {
  const r = art.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height * 0.45);
  lookAt = Math.hypot(dx, dy) < r.width * 0.15 ? null : lookIndex((Math.atan2(dx, -dy) * 180) / Math.PI);
});
document.addEventListener("mouseleave", () => (lookAt = null));

vscode.postMessage({ type: "ready" });
