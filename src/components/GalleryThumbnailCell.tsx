import DharmaSpinner from "./DharmaSpinner";
import { useThumbnail } from "../hooks/useThumbnailCache";

interface Props {
  path: string;
  checked: boolean;
  disabled?: boolean;
  removing?: boolean;
  compact?: boolean;
  onToggle: () => void;
  onRemove: () => void;
}

function fileName(path: string) {
  return path.split(/[/\\]/).pop() ?? path;
}

export default function GalleryThumbnailCell({
  path,
  checked,
  disabled,
  removing,
  compact,
  onToggle,
  onRemove,
}: Props) {
  const { src, loading } = useThumbnail(path);

  if (compact) {
    if (!src && !loading && !removing) {
      return null;
    }

    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled || removing}
        title={fileName(path)}
        className={`relative aspect-square w-full overflow-hidden rounded-lg border-2 transition-opacity ${
          checked ? "border-amber-500 ring-1 ring-amber-300" : "border-stone-200 opacity-60"
        } ${removing ? "pointer-events-none opacity-40" : ""}`}
      >
        {src ? (
          <img src={src} alt={fileName(path)} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-stone-100">
            {loading || removing ? (
              <DharmaSpinner size={18} />
            ) : (
              <span className="text-[10px] text-stone-400">Lỗi</span>
            )}
          </div>
        )}
        {checked && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] text-white">
            ✓
          </span>
        )}
        {removing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <DharmaSpinner size={18} />
          </div>
        )}
      </button>
    );
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border-2 transition-opacity ${
        checked ? "border-amber-500" : "border-stone-200 opacity-60"
      } ${removing ? "pointer-events-none opacity-40" : ""}`}
    >
      <div className="relative aspect-square bg-stone-100">
        {src ? (
          <img src={src} alt={fileName(path)} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {loading || removing ? (
              <DharmaSpinner size={22} />
            ) : (
              <span className="text-xs text-stone-400">Lỗi tải</span>
            )}
          </div>
        )}
        {removing && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <DharmaSpinner size={24} />
          </div>
        )}
      </div>
      <p className="truncate bg-white px-2 py-1 text-xs text-stone-600" title={fileName(path)}>
        {fileName(path)}
      </p>
      <div className="flex items-center justify-between bg-stone-50 px-2 py-1.5">
        <label className="flex cursor-pointer items-center gap-1 text-xs text-stone-700">
          <input type="checkbox" checked={checked} onChange={onToggle} disabled={disabled || removing} />
          Hiển thị
        </label>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled || removing}
          className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          Xóa
        </button>
      </div>
    </div>
  );
}
