import { useState, type KeyboardEvent } from "react";
import type { AppConfig, HotkeyField } from "../types/config";
import { eventToShortcutString, shortcutToDisplayLabel } from "../utils/hotkeyFormat";

interface Props {
  config: Pick<AppConfig, HotkeyField>;
  onChange: (partial: Partial<Pick<AppConfig, HotkeyField>>) => void;
}

const HOTKEY_ROWS: { field: HotkeyField; label: string }[] = [
  { field: "hotkeyPause", label: "Tạm dừng" },
  { field: "hotkeyResume", label: "Tiếp tục" },
  { field: "hotkeyNextImage", label: "Ảnh tiếp theo" },
  { field: "hotkeyToggleOverlay", label: "Bật/Tắt overlay (tùy chọn)" },
];

export default function HotkeySettings({ config, onChange }: Props) {
  const [capturing, setCapturing] = useState<HotkeyField | null>(null);

  const assigned = HOTKEY_ROWS.map((r) => config[r.field]).filter((v): v is string => v !== null);
  const duplicates = new Set(assigned.filter((v, i) => assigned.indexOf(v) !== i));

  function handleKeyDown(field: HotkeyField, event: KeyboardEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (event.key === "Escape") {
      setCapturing(null);
      return;
    }
    const shortcut = eventToShortcutString(event.nativeEvent);
    if (!shortcut) return;
    onChange({ [field]: shortcut });
    setCapturing(null);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-stone-500">
        Phím tắt hoạt động toàn hệ thống, kể cả khi cửa sổ cài đặt đang ẩn. Cần kèm Ctrl/Alt/Shift/Win
        (trừ F1–F12).
      </p>

      <ul className="space-y-2">
        {HOTKEY_ROWS.map(({ field, label }) => {
          const value = config[field];
          const isCapturing = capturing === field;
          const isDuplicate = value !== null && duplicates.has(value);
          return (
            <li key={field} className="flex items-center justify-between gap-3">
              <span className="text-sm text-stone-700">{label}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCapturing(field)}
                  onKeyDown={isCapturing ? (e) => handleKeyDown(field, e) : undefined}
                  onBlur={() => isCapturing && setCapturing(null)}
                  className={`min-w-[170px] rounded-lg border px-3 py-1.5 text-sm ${
                    isCapturing
                      ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-300"
                      : isDuplicate
                        ? "border-red-400 bg-red-50 text-red-700"
                        : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  {isCapturing
                    ? "Nhấn tổ hợp phím..."
                    : value
                      ? shortcutToDisplayLabel(value)
                      : "Chưa đặt"}
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ [field]: null })}
                  disabled={value === null}
                  className="rounded border border-stone-300 px-2 py-0.5 text-[11px] text-stone-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                >
                  Xóa
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {duplicates.size > 0 && (
        <p className="text-xs text-red-600">Có phím tắt bị gán cho nhiều hành động — hãy đổi trước khi lưu.</p>
      )}
    </div>
  );
}
