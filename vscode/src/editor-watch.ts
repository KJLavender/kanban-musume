// Turns what you do in the editor into poses: typing, saving, new errors,
// tasks and debug sessions. The agent always wins (brain.mirror() ignores
// these while a turn or a permission sign is up).

import * as vscode from "vscode";
import type { PetState } from "../../src/core/events.js";

export type Mirror = (state: PetState, line: string | null, holdMs?: number) => void;

const errorCount = () =>
  vscode.languages.getDiagnostics().reduce(
    (n, [, list]) => n + list.filter((d) => d.severity === vscode.DiagnosticSeverity.Error).length,
    0,
  );

export function watchEditor(mirror: Mirror, enabled: () => boolean): vscode.Disposable {
  let lastTyping = 0;
  let errors = errorCount();
  const subs: vscode.Disposable[] = [];
  const on = <T>(event: vscode.Event<T>, fn: (e: T) => void) =>
    subs.push(event((e) => enabled() && fn(e)));

  on(vscode.workspace.onDidChangeTextDocument, (e) => {
    // Only real files you are editing; not output panels, git views or settings.
    if (e.contentChanges.length === 0 || e.document.uri.scheme !== "file") return;
    if (vscode.window.activeTextEditor?.document !== e.document) return;
    const now = Date.now();
    if (now - lastTyping < 400) return;
    lastTyping = now;
    mirror("typing", null, 2500);
  });

  on(vscode.workspace.onDidSaveTextDocument, () => {
    if (Math.random() < 0.25) mirror("happy", "存好了!", 0);
  });

  on(vscode.languages.onDidChangeDiagnostics, () => {
    const next = errorCount();
    if (next > errors && errors === 0) mirror("sick", next === 1 ? "出現一個錯誤…" : `出現 ${next} 個錯誤…`, 0);
    else if (next === 0 && errors > 0) mirror("happy", "錯誤都清掉了!✨", 0);
    errors = next;
  });

  on(vscode.tasks.onDidStartTask, (e) => mirror("hammering", `跑 \`${e.execution.task.name}\`…`, 10 * 60_000));
  on(vscode.tasks.onDidEndTaskProcess, (e) => {
    if (e.exitCode === undefined) return;
    if (e.exitCode === 0) mirror("happy", `\`${e.execution.task.name}\` 跑完了!`, 0);
    else mirror("sick", `\`${e.execution.task.name}\` 失敗了(${e.exitCode})`, 0);
  });

  on(vscode.debug.onDidStartDebugSession, (e) => mirror("peeking", `偵錯 \`${e.name}\` 中 🔭`, 60 * 60_000));
  on(vscode.debug.onDidTerminateDebugSession, () => mirror("idle", null, 0));

  return vscode.Disposable.from(...subs);
}
