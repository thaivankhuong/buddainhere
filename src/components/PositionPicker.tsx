import { IMAGE_POSITIONS, type ImagePosition } from "../types/config";

interface Props {
  value: ImagePosition;
  onChange: (value: ImagePosition) => void;
}

function positionIcon(value: ImagePosition): string {
  const v = value.includes("top") ? "↑" : value.includes("bottom") ? "↓" : "•";
  const h = value.includes("Left") ? "←" : value.includes("Right") ? "→" : "";
  return `${v}${h}`;
}

export default function PositionPicker({ value, onChange }: Props) {
  return (
    <div className="inline-grid grid-cols-3 gap-1">
      {IMAGE_POSITIONS.map((pos) => (
        <button
          key={pos.value}
          type="button"
          onClick={() => onChange(pos.value)}
          title={pos.label}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition-colors ${
            value === pos.value
              ? "border-amber-500 bg-amber-100 text-amber-900 ring-1 ring-amber-400"
              : "border-stone-300 bg-stone-50 text-stone-600 hover:border-amber-300 hover:bg-amber-50"
          }`}
        >
          {positionIcon(pos.value)}
        </button>
      ))}
    </div>
  );
}
