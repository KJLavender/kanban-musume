// Builds the VS Code extension into vscode/dist and copies the bundled pets
// next to it. Run from the repo root: npm run vscode:build
import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

await rm("vscode/dist", { recursive: true, force: true });
await rm("vscode/pets", { recursive: true, force: true });
await mkdir("vscode/dist/webview", { recursive: true });

const common = { bundle: true, sourcemap: true, logLevel: "warning" };

await Promise.all([
  build({
    ...common,
    entryPoints: ["vscode/src/extension.ts"],
    outfile: "vscode/dist/extension.cjs",
    platform: "node",
    format: "cjs",
    target: "node20",
    // acpx is ESM-only and stays in node_modules; it is loaded with import() on first task.
    external: ["vscode", "acpx", "acpx/*"],
  }),
  build({
    ...common,
    // Runs inside VS Code's own window once the overlay is installed.
    entryPoints: ["vscode/src/overlay/overlay.ts"],
    outfile: "vscode/dist/overlay.js",
    platform: "browser",
    format: "iife",
    target: "chrome120",
    sourcemap: false,
  }),
  build({
    ...common,
    entryPoints: ["vscode/src/webview/main.ts"],
    outfile: "vscode/dist/webview/main.js",
    platform: "browser",
    format: "iife",
    target: "chrome120",
  }),
  cp("vscode/src/webview/style.css", "vscode/dist/webview/style.css"),
  cp("pets", "vscode/pets", { recursive: true }),
]);
console.log("built vscode/dist/");
