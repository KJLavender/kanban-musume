# ACP Pet for VS Code

**English** | [繁體中文](README.zh-TW.md)

A small pet in your Explorer sidebar. It acts out what you are doing in the editor, and what your coding agent is doing when you give it a task. Several characters take turns: every few minutes the next one comes on and says hello.

This is the VS Code version of [acp-pet](https://github.com/KJLavender/acp-pet), a desktop pet for coding agents that speak ACP (the Agent Client Protocol).

## What it does

- Types along while you type. Gets sick when new errors show up, and cheers when they are all fixed.
- Hammers while a task runs, then cheers or looks sick depending on how it ended. Looks through a telescope while you debug.
- Give it a task with "ACP Pet: 餵任務給寵物" in the Command Palette, or double-click the pet. The agent works in the first folder you have open. When it wants to edit a file or run a command, the pet holds up a sign in the panel, and nothing happens until you click 准 (allow). No answer within 60 seconds counts as 不准 (deny).
- Click the pet to pet it: a pat on the head, a poke on the cheek. Five clicks in a few seconds and it sulks. Right-click for a menu.

Characters: Hikari and Nozomi (Blue Archive), DeepSeek-tan, Flandre and Remilia (Touhou Project), plus code-drawn chicks. They are fan art for non-commercial use; see ASSETS-LICENSE.md.

## The character in the editor

Run "ACP Pet: 把角色放進編輯器" and reload the window: the character stands in the bottom-right corner of the editor over a faded background illustration, like doki-theme. Click her, drag her, right-click for the next one. She types along with you, falls asleep when you're away, and the characters take turns every few minutes. Backgrounds come from `~/.acp-pet/backgrounds/<id>.jpg`.

This changes VS Code's `workbench.html` (and its checksum, so there's no "corrupt" warning). Run "ACP Pet: 把角色從編輯器移除" before uninstalling. After a VS Code update the extension offers to put it back.

## Settings

Search for `acpPet` in Settings.

- `acpPet.characters`: which characters take turns, in order. Folders in `~/.acp-pet/skins` work too.
- `acpPet.rotateMinutes`: minutes between switches (default 5). `0` keeps the current one.
- `acpPet.agent`: the agent for tasks (default `claude`, also `codex`, `gemini` and others that [acpx](https://github.com/openclaw/acpx) supports). It must already be installed and logged in. Reload the window after changing it.
- `acpPet.reactToEditor`: turn off the reactions to your own editing.
- `acpPet.permissionTimeoutSec`: seconds before an unanswered sign counts as deny.
- `acpPet.editor.backgroundOpacity` (default 0.12) and `acpPet.editor.height` (default 220): the editor character's background strength and size.

## Install

Build the package from the acp-pet repo with `npm run vscode:package`, then install the `.vsix` file:

```bash
code --install-extension vscode/acp-pet-vscode-0.1.0.vsix
```

The package is built on Windows and includes Windows-only binaries from acpx's dependencies, so build it on the platform you use.
