// Opens the extension in a separate copy of VS Code (downloaded once into
// .vscode-test/, or VSCODE_BIN if set) with a throwaway profile, workspace
// and save folder, runs test/vscode/suite.cjs, then exits.
//   npm run vscode:test
import { downloadAndUnzipVSCode } from "@vscode/test-electron";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// A separate copy, so the test never collides with the VS Code you have open (or its updater).
const code = process.env.VSCODE_BIN ?? (await downloadAndUnzipVSCode("stable"));
const tmp = mkdtempSync(join(tmpdir(), "acp-pet-vscode-"));
mkdirSync(join(tmp, "workspace"));
const env = { ...process.env, ACP_PET_HOME: join(tmp, "home") };
delete env.ELECTRON_RUN_AS_NODE;

const r = spawnSync(
  code,
  [
    join(tmp, "workspace"),
    `--extensionDevelopmentPath=${resolve("vscode")}`,
    `--extensionTestsPath=${resolve("test/vscode/suite.cjs")}`,
    `--user-data-dir=${join(tmp, "user")}`,
    `--extensions-dir=${join(tmp, "extensions")}`,
    "--disable-extensions",
    "--disable-workspace-trust",
    "--skip-welcome",
    "--skip-release-notes",
  ],
  { env, stdio: "inherit", timeout: 180_000 },
);
process.exit(r.status ?? 1);
