const MODIFIER_CODES = new Set([
  "ControlLeft",
  "ControlRight",
  "ShiftLeft",
  "ShiftRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
]);

/** Trả về chuỗi Tauri (vd. "Control+Shift+KeyP") hoặc null nếu tổ hợp chưa hợp lệ. */
export function eventToShortcutString(event: KeyboardEvent): string | null {
  if (MODIFIER_CODES.has(event.code)) return null;

  const mods: string[] = [];
  if (event.ctrlKey) mods.push("Control");
  if (event.altKey) mods.push("Alt");
  if (event.shiftKey) mods.push("Shift");
  if (event.metaKey) mods.push("Super");

  // Phím tắt toàn cục không kèm modifier sẽ chặn gõ chữ trong mọi ứng dụng — chỉ cho phép F1–F24.
  if (mods.length === 0 && !/^F\d{1,2}$/.test(event.code)) return null;

  return [...mods, event.code].join("+");
}

export function shortcutToDisplayLabel(shortcut: string): string {
  return shortcut
    .split("+")
    .map((part) => {
      if (part === "Control") return "Ctrl";
      if (part === "Super") return "Win";
      return part.replace(/^(Key|Digit)/, "");
    })
    .join(" + ");
}
