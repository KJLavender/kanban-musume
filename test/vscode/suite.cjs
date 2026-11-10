// Runs inside a real VS Code (see scripts/test-vscode.mjs). Plain CommonJS
// because VS Code loads --extensionTestsPath with require().
const assert = require("node:assert");
const { writeFileSync } = require("node:fs");
const { join } = require("node:path");
const vscode = require("vscode");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(`PASS ${name}`);
  } catch (err) {
    results.push(`FAIL ${name}: ${err && err.message}`);
  }
}

exports.run = async () => {
  const ext = vscode.extensions.getExtension("KJLavender.acp-pet-vscode");
  const api = await ext.activate();

  await check("a character is showing on start", () => assert.ok(api.current()));

  await check("the sidebar webview loads its script (CSP and paths are right)", async () => {
    await vscode.commands.executeCommand("acpPet.view.focus");
    for (let i = 0; i < 40 && api.viewReady() === 0; i++) await sleep(250);
    assert.ok(api.viewReady() > 0, "webview never said ready");
  });

  await check("next character takes over and says hello", async () => {
    const before = api.current();
    await api.next();
    assert.notStrictEqual(api.current(), before);
    api.controller.tick();
    assert.ok(api.lastSnapshot().line, "no hello line");
  });

  await check("typing in the editor shows the typing pose", async () => {
    const file = join(vscode.workspace.workspaceFolders[0].uri.fsPath, "note.txt");
    writeFileSync(file, "hello\n");
    const editor = await vscode.window.showTextDocument(vscode.Uri.file(file));
    await sleep(4500); // let the hello reaction finish
    await editor.edit((e) => e.insert(new vscode.Position(0, 0), "x"));
    await sleep(300);
    assert.strictEqual(api.lastSnapshot().state, "typing");
  });

  await check("a scripted /demo task runs through the permission sign", async () => {
    const auto = setInterval(() => {
      const p = api.controller.brain.snapshot().permission;
      if (p) api.controller.answer(p.id, "allow");
    }, 100);
    try {
      assert.strictEqual(await api.controller.feed("/demo"), "completed");
    } finally {
      clearInterval(auto);
    }
  });

  console.log(results.join("\n"));
  if (results.some((r) => r.startsWith("FAIL"))) throw new Error("vscode integration test failed");
};
