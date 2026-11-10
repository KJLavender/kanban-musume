# Kanban Musume for VS Code

**English** | [繁體中文](README.zh-TW.md)

An anime character who lives in your editor. She stands in the bottom-right corner over a faded illustration of herself, walks along the bottom edge of the window, types along while you type, and reacts when you click her. Every few minutes the next character takes over.

This is the VS Code part of [Kanban Musume](https://github.com/KJLavender/kanban-musume).

## Getting started

1. Install `kanban-musume-vscode-0.2.0.vsix` from the [latest release](https://github.com/KJLavender/kanban-musume/releases/latest): Extensions view, `...`, "Install from VSIX...". Or `code --install-extension kanban-musume-vscode-0.2.0.vsix`.
2. `Ctrl+Shift+P`, run "Kanban Musume: 把角色放進編輯器" (put the character in the editor), click 繼續, then 重新載入視窗 (reload window).

## Playing with her

- Click her head for a pat, poke her cheek. Five clicks in a few seconds and she sulks.
- Drag her anywhere; she remembers the spot. Right-click her for the next character.
- She falls asleep after 10 minutes without keyboard or mouse, and wakes up when you're back. Now and then she says something.

Characters: DeepSeek-tan, Flandre and Remilia (Touhou Project), Hikari and Nozomi (Blue Archive). Each comes with her own background; put `~/.acp-pet/backgrounds/<id>.png` to use your own. They are AI-generated fan art for non-commercial use; see ASSETS-LICENSE.md.

## Giving tasks to a coding agent (optional)

"Kanban Musume: 餵任務給寵物" sends a task to a coding agent through [acpx](https://github.com/openclaw/acpx) (Claude Code by default; it must be installed and logged in). The agent works in the first folder you have open. When it wants to edit a file or run a command, you get a notification with 准 (allow) and 不准 (deny); nothing happens until you allow it, and no answer within 60 seconds counts as deny.

## Settings

Search for `acpPet` in Settings. After changing one, VS Code asks whether to update the character; click 更新 (update) and reload.

- `acpPet.characters`: which characters take turns, in order.
- `acpPet.rotateMinutes`: minutes between switches (default 5). `0` keeps the current one.
- `acpPet.editor.backgroundOpacity` (default 0.12) and `acpPet.editor.height` (default 220): how strongly the background shows, and her size.
- `acpPet.agent`, `acpPet.reactToEditor`, `acpPet.permissionTimeoutSec`: the agent for tasks, reactions in the sidebar panel, and the permission timeout.

## How it works, and removing it

Like doki-theme, this changes one of VS Code's own files (`workbench.html`) and updates its checksum, so VS Code doesn't report a corrupt install. After a VS Code update the change is gone and the extension offers to put it back. Before uninstalling, run "Kanban Musume: 把角色從編輯器移除" to restore the original file.

The package is built on Windows and includes Windows-only files from acpx's dependencies.
