// "Put the character into the editor" / "take it out again", plus a nudge to
// re-apply after a VS Code update (updates replace workbench.html).

import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as vscode from "vscode";
import { petHome } from "../../../src/main/config.js";
import { buildOverlay } from "./assets.js";
import { findWorkbench, isPatched, patch, unpatch } from "./patch.js";

const WANTED = "acpPet.overlayWanted";
const cfg = () => vscode.workspace.getConfiguration("acpPet");

export function registerOverlayCommands(
  context: vscode.ExtensionContext,
  skinDirs: string[],
  log: (m: string) => void,
): vscode.Disposable {
  const inst = () => findWorkbench(vscode.env.appRoot);

  async function reloadPrompt(message: string) {
    const choice = await vscode.window.showInformationMessage(message, "重新載入視窗");
    if (choice) void vscode.commands.executeCommand("workbench.action.reloadWindow");
  }

  async function apply(ask: boolean) {
    if (ask) {
      const ok = await vscode.window.showWarningMessage(
        "ACP Pet 會改 VS Code 自己的一個檔案(workbench.html),把角色和背景放進編輯器,做法跟 doki-theme 一樣。" +
          "VS Code 更新後要再執行一次;想移除時請用「ACP Pet: 把角色從編輯器移除」。要繼續嗎?",
        { modal: true },
        "繼續",
      );
      if (ok !== "繼續") return;
    }
    const staging = await mkdtemp(join(tmpdir(), "acp-pet-overlay-"));
    try {
      const config = await buildOverlay(staging, {
        ids: cfg().get<string[]>("characters", []),
        skinDirs,
        backgroundDir: join(petHome(), "backgrounds"),
        rotateMinutes: cfg().get<number>("rotateMinutes", 5),
        backgroundOpacity: cfg().get<number>("editor.backgroundOpacity", 0.12),
        height: cfg().get<number>("editor.height", 220),
        script: await readFile(join(context.extensionPath, "dist", "overlay.js"), "utf8"),
      });
      if (config.characters.length === 0) {
        void vscode.window.showWarningMessage("ACP Pet:acpPet.characters 裡沒有可以用的圖片角色。");
        return;
      }
      await patch(inst(), staging);
      await context.globalState.update(WANTED, true);
      log(`overlay installed: ${config.characters.map((c) => c.id).join(", ")}`);
      await reloadPrompt(`ACP Pet:${config.characters.map((c) => c.name).join("、")} 已經放進編輯器,重新載入視窗後出現。`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`overlay install failed: ${msg}`);
      void vscode.window.showErrorMessage(
        /EPERM|EACCES/.test(msg) ? "ACP Pet:沒有權限改 VS Code 的檔案(可能是裝在 Program Files)。" : `ACP Pet:${msg}`,
      );
    } finally {
      await rm(staging, { recursive: true, force: true });
    }
  }

  async function remove() {
    try {
      await unpatch(inst());
      await context.globalState.update(WANTED, false);
      log("overlay removed");
      await reloadPrompt("ACP Pet:已經從編輯器移除,重新載入視窗後生效。");
    } catch (err) {
      void vscode.window.showErrorMessage(`ACP Pet:${err instanceof Error ? err.message : err}`);
    }
  }

  // After a VS Code update the patch is gone; offer to put it back.
  void (async () => {
    try {
      if (context.globalState.get<boolean>(WANTED) && !(await isPatched(inst()))) {
        const choice = await vscode.window.showInformationMessage("ACP Pet:VS Code 更新後,編輯器裡的角色不見了。要放回去嗎?", "放回去");
        if (choice) await apply(false);
      }
    } catch {
      /* unknown layout: stay quiet */
    }
  })();

  // Settings the overlay bakes in need a re-apply to take effect.
  const watch = vscode.workspace.onDidChangeConfiguration(async (e) => {
    const relevant = ["acpPet.characters", "acpPet.rotateMinutes", "acpPet.editor"].some((k) => e.affectsConfiguration(k));
    if (!relevant || !context.globalState.get<boolean>(WANTED)) return;
    const choice = await vscode.window.showInformationMessage("ACP Pet:設定改了,要更新編輯器裡的角色嗎?", "更新");
    if (choice) await apply(false);
  });

  return vscode.Disposable.from(
    vscode.commands.registerCommand("acpPet.overlay.install", () => apply(true)),
    vscode.commands.registerCommand("acpPet.overlay.remove", remove),
    watch,
  );
}
