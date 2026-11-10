// "Is the user gaming / typing right now?" decided from plain samples, so the
// Electron side only has to collect them and the rules stay unit-testable.

/**
 * Windows SHQueryUserNotificationState results that mean something owns the
 * whole screen: 2 = QUNS_BUSY (a full-screen app), 3 = QUNS_RUNNING_D3D_FULL_SCREEN
 * (a full-screen game), 4 = QUNS_PRESENTATION_MODE.
 */
const FULL_SCREEN_STATES = new Set([2, 3, 4]);

export type GameSample = {
  /** SHQueryUserNotificationState value, or 0 when unknown. */
  notificationState: number;
  /** Name of a running process from the user's game list, or "" if none. */
  gameProcess: string;
};

export const looksLikeGaming = (s: GameSample) => FULL_SCREEN_STATES.has(s.notificationState) || s.gameProcess !== "";

/** "Genshin.exe", " genshin " → "genshin" (how Get-Process wants names). */
export const processName = (name: string) => name.trim().replace(/\.exe$/i, "").toLowerCase();

/**
 * Turns a stream of yes/no samples into a steady on/off: switch on at the
 * first positive, off only after `offAfter` negatives in a row, so a loading
 * screen or alt-tab doesn't make the pets pop back for a moment.
 */
export class Debounce {
  private on = false;
  private misses = 0;

  constructor(private readonly offAfter = 2) {}

  get value() {
    return this.on;
  }

  /** Returns true when the steady value changed. */
  push(sample: boolean): boolean {
    if (sample) {
      this.misses = 0;
      if (this.on) return false;
      this.on = true;
      return true;
    }
    if (!this.on) return false;
    if (++this.misses < this.offAfter) return false;
    this.on = false;
    this.misses = 0;
    return true;
  }
}

/**
 * Typing = the system saw input in the last second while the mouse stayed put.
 * Feed one sample per second; stays true for `holdSec` after the last one so
 * a pause to think doesn't count as stopping.
 */
export class TypingDetector {
  private streak = 0;
  private lastTypingAt = -Infinity;
  private lastCursor: { x: number; y: number } | null = null;

  constructor(
    private readonly needSec = 3,
    private readonly holdSec = 8,
  ) {}

  push(idleSec: number, cursor: { x: number; y: number }, nowSec: number): boolean {
    const still = this.lastCursor !== null && this.lastCursor.x === cursor.x && this.lastCursor.y === cursor.y;
    this.lastCursor = cursor;
    this.streak = idleSec === 0 && still ? this.streak + 1 : 0;
    if (this.streak >= this.needSec) this.lastTypingAt = nowSec;
    return nowSec - this.lastTypingAt <= this.holdSec;
  }
}
