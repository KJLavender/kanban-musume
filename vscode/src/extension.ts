// ACP Pet for VS Code: the same brain, permission gate and acpx runner as the
// desktop app (src/core), shown in a sidebar webview instead of an Electron
// window. Characters take turns every few minutes.

import { join } from "node:path";
import * as vscode from "vscode";
import { AcpSource, assertSafeWorkspace } from "../../src/core/acp-source.js";
import { PetController } from "../../src/core/controller.js";
import type { PetSnapshot, PetState } from "../../src/core/events.js";
import type { TouchZone } from "../../src/core/lines.js";
import { listSkins, loadSkin, type Skin } from "../../src/core/skins.js";
import { loadSave } from "../../src/core/store.js";
import { petHome, skinsDir } from "../../src/main/config.js";
import { watchEditor } from "./editor-watch.js";
import { helloFor, nextCharacter } from "./rotation.js";
import { registerOverlayCommands } from "./overlay/commands.js";
import { PetViewProvider } from "./view.js";

const CURRENT_KEY = "acpPet.current";
const cfg = () => vscode.workspace.getConfiguration("acpPet");

export async function activate(context: vscode.ExtensionContext) {
  const out = vscode.window.createOutputChannel("ACP Pet");
  const log = (m: string) => out.appendLine(`[${new Date().toLocaleTimeString()}] ${m}`);
  context.subscriptions.push(out);

  const dirs = [join(context.extensionPath, "pets"), skinsDir()];
  const savePath = join(petHome(), "vscode-save.json");
  let snapshot: PetSnapshot | null = null;

  const controller = new PetController({
    save: await loadSave(savePath),
    savePath,
    permissionTimeoutMs: Math.max(5, cfg().get<number>("permissionTimeoutSec", 60)) * 1000,
    onLog: log,
    onSnapshot: (s) => {
      snapshot = s;
      view.post({ type: "snapshot", snapshot: s });
    },
    createRunner: ({ emit, ask }) => {
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) throw new Error("open a folder first: the agent works inside it");
      const cwd = assertSafeWorkspace(folder.uri.fsPath);
      const agent = cfg().get<string>("agent", "claude");
      log(`starting ${agent} in ${cwd}`);
      return new AcpSource({ agent, cwd, stateDir: join(petHome(), "acpx", "vscode"), emit, ask });
    },
  });

  // ── characters ─────────────────────────────────────────────────────────

  let skin: Skin | null = null;
  /** How many times the webview script loaded and said hello (the integration test checks it). */
  let viewReady = 0;
  let switchedAt = Date.now();

  async function show(id: string, greet: boolean) {
    try {
      skin = await loadSkin(dirs, id, log);
    } catch (err) {
      log(`skin ${id}: ${err instanceof Error ? err.message : err}`);
      return;
    }
    switchedAt = Date.now();
    await context.globalState.update(CURRENT_KEY, skin.id);
    view.post({ type: "skin", skin });
    if (greet) {
      controller.brain.say(helloFor(skin.id));
      controller.tick();
    }
  }

  async function next(greet = true) {
    const installed = new Set((await listSkins(dirs)).map((s) => s.id));
    const id = nextCharacter(cfg().get<string[]>("characters", []), skin?.id, installed);
    if (id && id !== skin?.id) await show(id, greet);
  }

  // Rotate on a timer, but never in the middle of a task or a permission sign.
  const rotation = setInterval(() => {
    const minutes = cfg().get<number>("rotateMinutes", 5);
    const s = controller.brain.snapshot();
    if (minutes > 0 && Date.now() - switchedAt >= minutes * 60_000 && !controller.busy && !s.permission) void next();
  }, 15_000);

  // ── view ───────────────────────────────────────────────────────────────

  const view = new PetViewProvider(context.extensionUri, {
    ready: () => {
      viewReady++;
      if (skin) view.post({ type: "skin", skin });
      if (snapshot) view.post({ type: "snapshot", snapshot });
    },
    touch: (zone: TouchZone) => controller.interact("pet", zone),
    wake: () => controller.interact("wake"),
    answer: (id, decision) => controller.answer(id, decision),
    feed: () => void vscode.commands.executeCommand("acpPet.feed"),
    menu: () => void menu(),
  });

  async function feed() {
    const text = await vscode.window.showInputBox({
      title: "ACP Pet",
      prompt: controller.busy ? "牠還在忙上一個任務" : "餵牠一個任務 (/demo 試演、/fail 失敗示範、/flow a >> b 接力)",
      placeHolder: "例如:幫我修好壞掉的測試",
    });
    if (!text?.trim()) return;
    if (!text.trim().startsWith("/") && !vscode.workspace.workspaceFolders?.length) {
      void vscode.window.showWarningMessage("ACP Pet:先開一個資料夾,agent 會在那個資料夾裡工作。");
      return;
    }
    if (controller.busy) {
      void vscode.window.showInformationMessage("ACP Pet:牠還在忙,等這個任務做完再餵。");
      return;
    }
    void vscode.commands.executeCommand("acpPet.view.focus");
    await controller.feed(text);
    await controller.persist();
  }

  async function pick() {
    const skins = await listSkins(dirs);
    const choice = await vscode.window.showQuickPick(
      skins.map((s) => ({ label: s.name, description: s.id, picked: s.id === skin?.id })),
      { title: "ACP Pet:選擇角色" },
    );
    if (choice) await show(choice.description, true);
  }

  async function menu() {
    const items: [string, string][] = [
      ["$(comment) 餵任務…", "acpPet.feed"],
      ["$(arrow-right) 換下一個角色", "acpPet.next"],
      ["$(person) 選擇角色…", "acpPet.pick"],
      ...(controller.busy ? ([["$(stop) 取消目前任務", "acpPet.cancel"]] as [string, string][]) : []),
      ["$(gear) 設定…", "workbench.action.openSettings"],
    ];
    const choice = await vscode.window.showQuickPick(items.map(([label]) => label), { title: "ACP Pet" });
    const command = items.find(([label]) => label === choice)?.[1];
    if (command === "workbench.action.openSettings") void vscode.commands.executeCommand(command, "acpPet");
    else if (command) void vscode.commands.executeCommand(command);
  }

  const mirror = (state: PetState, line: string | null, holdMs?: number) => {
    controller.brain.mirror(state, line, Date.now(), holdMs);
    controller.tick();
  };

  const ticker = setInterval(() => controller.tick(), 250);
  const saver = setInterval(() => void controller.persist(), 30_000);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("acpPet.view", view, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.commands.registerCommand("acpPet.feed", feed),
    vscode.commands.registerCommand("acpPet.cancel", () => controller.cancel()),
    vscode.commands.registerCommand("acpPet.next", () => next()),
    vscode.commands.registerCommand("acpPet.pick", pick),
    registerOverlayCommands(context, dirs, log),
    watchEditor(mirror, () => cfg().get<boolean>("reactToEditor", true)),
    {
      dispose: () => {
        clearInterval(rotation);
        clearInterval(ticker);
        clearInterval(saver);
      },
    },
  );

  disposeController = () => controller.dispose(); // also saves

  const saved = context.globalState.get<string>(CURRENT_KEY);
  if (saved) await show(saved, false);
  if (!skin) await next(false);

  // Exposed for the integration test (test/vscode/suite.cjs).
  return { controller, current: () => skin?.id, next: () => next(), lastSnapshot: () => snapshot, viewReady: () => viewReady };
}

let disposeController: (() => Promise<void>) | null = null;
export async function deactivate() {
  await disposeController?.();
}
