// Watches for full-screen games (Windows) and for the user typing, and calls
// back when either steady state changes. The rules live in core/game.ts.

import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import { powerMonitor, screen } from "electron";
import { Debounce, looksLikeGaming, processName, TypingDetector } from "../core/game.js";

// One long-lived PowerShell: asks Windows whether something full-screen owns
// the display, and whether any process from the user's game list is running.
// Prints "<state>|<process name or empty>" every 3 seconds.
const WATCH_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
Add-Type -Namespace AcpPet -Name Quns -MemberDefinition '[DllImport("shell32.dll")] public static extern int SHQueryUserNotificationState(out int state);'
$names = @($env:ACP_PET_GAMES -split ';' | Where-Object { $_ })
while ($true) {
  $s = 0
  [void][AcpPet.Quns]::SHQueryUserNotificationState([ref]$s)
  $hit = ''
  if ($names.Count) {
    $p = Get-Process -Name $names | Select-Object -First 1
    if ($p) { $hit = $p.ProcessName }
  }
  [Console]::Out.WriteLine("$s|$hit")
  [Console]::Out.Flush()
  Start-Sleep -Seconds 3
}
`;

export type GameWatch = { stop(): void; readonly gaming: boolean; readonly typing: boolean };

export function startGameWatch(opts: {
  /** Process names from config.gameProcesses (read once at startup). */
  games: string[];
  onGaming: (on: boolean, why: string) => void;
  log: (m: string) => void;
}): GameWatch {
  const gaming = new Debounce(2);
  let typing = false;
  let child: ChildProcess | null = null;
  let stopped = false;

  const launch = () => {
    if (process.platform !== "win32" || stopped) return;
    const gameList = opts.games.map(processName).filter(Boolean).join(";");
    child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", WATCH_SCRIPT], {
      env: { ...process.env, ACP_PET_GAMES: gameList },
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    });
    createInterface({ input: child.stdout! }).on("line", (line) => {
      const [state, proc = ""] = line.trim().split("|");
      const sample = { notificationState: Number(state) || 0, gameProcess: proc };
      if (gaming.push(looksLikeGaming(sample))) {
        opts.onGaming(gaming.value, proc ? `process ${proc}` : `notification state ${state}`);
      }
    });
    child.on("exit", (code) => {
      child = null;
      if (stopped) return;
      opts.log(`game watch exited (${code}); restarting in 30s`);
      setTimeout(launch, 30_000);
    });
  };
  launch();

  const detector = new TypingDetector();
  const typingTimer = setInterval(() => {
    typing = detector.push(powerMonitor.getSystemIdleTime(), screen.getCursorScreenPoint(), Date.now() / 1000);
  }, 1000);

  return {
    get gaming() {
      return gaming.value;
    },
    get typing() {
      return typing;
    },
    stop() {
      stopped = true;
      clearInterval(typingTimer);
      child?.kill();
    },
  };
}
