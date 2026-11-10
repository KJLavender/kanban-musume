// The sidebar panel: a webview that draws the pet (webview/main.ts) and sends
// clicks and permission answers back here.

import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import type { PermissionDecision } from "../../src/core/events.js";
import type { TouchZone } from "../../src/core/lines.js";

export type ViewHandlers = {
  ready(): void;
  touch(zone: TouchZone): void;
  wake(): void;
  answer(id: string, decision: PermissionDecision): void;
  feed(): void;
  menu(): void;
};

type FromView =
  | { type: "ready" | "wake" | "feed" | "menu" }
  | { type: "touch"; zone: TouchZone }
  | { type: "answer"; id: string; decision: PermissionDecision };

const ZONES: ReadonlySet<string> = new Set(["head", "cheek", "body"]);

export class PetViewProvider implements vscode.WebviewViewProvider {
  private view: vscode.WebviewView | null = null;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly on: ViewHandlers,
  ) {}

  /** Send to the webview if it exists; it asks for the current state on "ready". */
  post(message: unknown) {
    void this.view?.webview.postMessage(message);
  }

  resolveWebviewView(view: vscode.WebviewView) {
    this.view = view;
    const media = vscode.Uri.joinPath(this.extensionUri, "dist", "webview");
    view.webview.options = { enableScripts: true, localResourceRoots: [media] };
    view.webview.html = this.html(view.webview, media);
    view.webview.onDidReceiveMessage((m: FromView) => {
      switch (m.type) {
        case "ready":
          return this.on.ready();
        case "wake":
          return this.on.wake();
        case "feed":
          return this.on.feed();
        case "menu":
          return this.on.menu();
        case "touch":
          return ZONES.has(m.zone) && this.on.touch(m.zone);
        case "answer":
          return this.on.answer(String(m.id), m.decision === "allow" ? "allow" : "reject");
      }
    });
    view.onDidDispose(() => (this.view = null));
  }

  private html(webview: vscode.Webview, media: vscode.Uri): string {
    const nonce = randomBytes(16).toString("base64");
    const src = (f: string) => webview.asWebviewUri(vscode.Uri.joinPath(media, f)).toString();
    return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${src("style.css")}">
</head>
<body>
<div id="stage">
  <div id="bubble" class="hidden"></div>
  <div id="sign" class="hidden">
    <div class="sign-title">牠想做這件事,可以嗎?</div>
    <div id="sign-what"></div>
    <code id="sign-detail"></code>
    <div class="sign-row">
      <button id="allow">准</button>
      <button id="reject" class="secondary">不准</button>
      <span id="sign-timer"></span>
    </div>
  </div>
  <div id="art" title="點一下摸摸、雙擊餵任務、右鍵開選單">
    <canvas id="pet"></canvas>
    <img id="pet-img" class="hidden" alt="" draggable="false">
    <span id="badge" class="hidden"></span>
    <span id="progress" class="hidden"></span>
  </div>
  <div id="status"></div>
</div>
<script nonce="${nonce}" src="${src("main.js")}"></script>
</body>
</html>`;
  }
}
