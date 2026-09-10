import {
  ANIMATION_IN_OPTIONS,
  ANIMATION_OUT_OPTIONS,
  type AnimationIn,
  type AnimationOut,
} from "../types/config";

interface Props {
  animationIn: AnimationIn;
  animationOut: AnimationOut;
  fadeMs: number;
  onAnimationInChange: (value: AnimationIn) => void;
  onAnimationOutChange: (value: AnimationOut) => void;
  onFadeMsChange: (value: number) => void;
}

export default function AnimationPicker({
  animationIn,
  animationOut,
  fadeMs,
  onAnimationInChange,
  onAnimationOutChange,
  onFadeMsChange,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Hiệu ứng xuất hiện</label>
          <select
            value={animationIn}
            onChange={(e) => onAnimationInChange(e.target.value as AnimationIn)}
            className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
          >
            {ANIMATION_IN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Hiệu ứng biến mất</label>
          <select
            value={animationOut}
            onChange={(e) => onAnimationOutChange(e.target.value as AnimationOut)}
            className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
          >
            {ANIMATION_OUT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs font-medium text-stone-600">
          <span>Thời gian chuyển đổi</span>
          <span className="text-amber-800">{(fadeMs / 1000).toFixed(1)}s</span>
        </div>
        <input
          type="range"
          min={500}
          max={5000}
          step={100}
          value={fadeMs}
          onChange={(e) => onFadeMsChange(Number(e.target.value))}
          className="range-amber w-full"
        />
        <div className="mt-0.5 flex justify-between text-[10px] text-stone-400">
          <span>0.5s</span>
          <span>5.0s</span>
        </div>
      </div>
    </div>
  );
}
