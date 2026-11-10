// Packs vscode/ into acp-pet-vscode-<version>.vsix (run from the repo root:
// npm run vscode:package). acpx is the only runtime dependency; it is
// installed into vscode/node_modules so the package carries it.
import { execSync } from "node:child_process";
import { copyFile } from "node:fs/promises";

await copyFile("LICENSE", "vscode/LICENSE");
await copyFile("ASSETS-LICENSE.md", "vscode/ASSETS-LICENSE.md");
execSync("npm install --omit=dev --no-audit --no-fund", { cwd: "vscode", stdio: "inherit" });
execSync("npx vsce package --allow-missing-repository", { cwd: "vscode", stdio: "inherit" });
