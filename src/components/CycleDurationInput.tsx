import { useEffect, useState } from "react";

const MIN_SECS = 1;
const MAX_SECS = 86400;

interface Preset {
  label: string;
  value: number;
}

interface Props {
  label: string;
  value: number;
  presets: Preset[];
  onChange: (value: number) => void;
  compact?: boolean;
}

function clampSecs(n: number): number {
  if (!Number.isFinite(n)) return MIN_SECS;
  return Math.min(MAX_SECS, Math.max(MIN_SECS, Math.round(n)));
}

export default function CycleDurationInput({ label, value, presets, onChange, compact }: Props) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commitInput(raw: string) {
    const parsed = clampSecs(Number(raw));
    setText(String(parsed));
    onChange(parsed);
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-stone-600">{label}</label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={MIN_SECS}
          max={MAX_SECS}
          step={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => commitInput(text)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitInput(text);
          }}
          className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
        />
        <span className="shrink-0 text-xs text-stone-500">giây</span>
      </div>
      <div className={`mt-1.5 flex flex-wrap gap-1 ${compact ? "" : "gap-2"}`}>
        {presets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            className={`rounded border px-2 py-0.5 text-[11px] transition-colors ${
              value === preset.value
                ? "border-amber-500 bg-amber-100 text-amber-900"
                : "border-stone-300 bg-stone-50 text-stone-600 hover:bg-amber-50"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
