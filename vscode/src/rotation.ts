// Which character comes on next. Pure, so it can be unit-tested without VS Code.

/**
 * The entry after `current` in `list`, skipping ids that aren't installed.
 * Falls back to the first installed one; null when none of them are.
 */
export function nextCharacter(list: readonly string[], current: string | undefined, installed: ReadonlySet<string>): string | null {
  const usable = list.filter((id) => installed.has(id));
  if (usable.length === 0) return null;
  const at = current === undefined ? -1 : usable.indexOf(current);
  return usable[(at + 1) % usable.length]!;
}

/** Lines a character says when it takes over. */
export const HELLO: Record<string, string> = {
  hikari: "換我值班了。",
  nozomi: "輪到ノゾミ啦~",
  deepseek: "主人,換我來服侍你了!",
  flandre: "姊姊說換我陪你玩!",
  remilia: "接下來由紅魔館的主人陪你。",
};
export const helloFor = (id: string) => HELLO[id.replace(/-.*$/, "")] ?? "換我來陪你了~";
