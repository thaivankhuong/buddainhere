import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import DharmaSpinner from "./DharmaSpinner";
import GalleryThumbnailCell from "./GalleryThumbnailCell";
import { invalidateThumbnail } from "../hooks/useThumbnailCache";

interface Props {
  images: string[];
  selectedImages: string[];
  onSelectedChange: (selected: string[]) => void;
  onImagesChange: (images: string[]) => void;
  onSelectedImagesPrune: (path: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

function isSelected(path: string, selectedImages: string[]) {
  if (selectedImages.length === 0) return true;
  return selectedImages.includes(path);
}

export default function ImageGalleryGrid({
  images,
  selectedImages,
  onSelectedChange,
  onImagesChange,
  onSelectedImagesPrune,
  disabled,
  compact,
}: Props) {
  const [importing, setImporting] = useState(false);
  const [removingPath, setRemovingPath] = useState<string | null>(null);

  const effectiveSelected =
    selectedImages.length === 0 ? images : selectedImages.filter((p) => images.includes(p));

  async function handleImport() {
    const selected = await open({
      multiple: true,
      filters: [{ name: "Ảnh", extensions: ["jpg", "jpeg", "png", "webp", "bmp", "gif"] }],
    });
    if (!selected) return;

    const paths = Array.isArray(selected) ? selected : [selected];
    setImporting(true);
    try {
      const imported = await invoke<string[]>("import_images", { paths });
      onImagesChange([...images, ...imported].sort());
    } finally {
      setImporting(false);
    }
  }

  async function handleRemove(path: string) {
    const name = path.split(/[/\\]/).pop() ?? path;
    if (!confirm(`Xóa ảnh "${name}" khỏi kho?`)) return;

    setRemovingPath(path);
    const nextImages = images.filter((p) => p !== path);
    onImagesChange(nextImages);
    onSelectedImagesPrune(path);
    invalidateThumbnail(path);

    try {
      await invoke("remove_image", { path });
    } catch {
      onImagesChange(images);
    } finally {
      setRemovingPath(null);
    }
  }

  function toggleImage(path: string) {
    const currentlySelected = isSelected(path, selectedImages);

    if (selectedImages.length === 0) {
      onSelectedChange(images.filter((p) => p !== path));
      return;
    }

    if (currentlySelected) {
      const next = selectedImages.filter((p) => p !== path);
      onSelectedChange(next.length === images.length ? [] : next);
    } else {
      const next = [...selectedImages, path];
      onSelectedChange(next.length === images.length ? [] : next);
    }
  }

  if (compact) {
    return (
      <div>
        {images.length === 0 ? (
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 text-sm text-stone-500">
            {importing ? <DharmaSpinner label="Đang import..." /> : "Kho trống"}
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((path) => (
              <GalleryThumbnailCell
                key={path}
                path={path}
                checked={isSelected(path, selectedImages)}
                disabled={disabled}
                removing={removingPath === path}
                compact
                onToggle={() => toggleImage(path)}
                onRemove={() => handleRemove(path)}
              />
            ))}
            <button
              type="button"
              onClick={handleImport}
              disabled={disabled || importing}
              className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/50 text-xs text-amber-800 hover:bg-amber-50 disabled:opacity-60"
            >
              {importing ? <DharmaSpinner size={18} /> : <span className="text-lg leading-none">+</span>}
              Import
            </button>
          </div>
        )}
        {images.length === 0 && (
          <button
            type="button"
            onClick={handleImport}
            disabled={disabled || importing}
            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-300 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-50 disabled:opacity-60"
          >
            {importing && <DharmaSpinner size={16} />}
            {importing ? "Đang import..." : "Import ảnh"}
          </button>
        )}
        <p className="mt-2 text-xs text-stone-500">
          {effectiveSelected.length} / {images.length} ảnh được chọn · Nhấn ảnh để bật/tắt
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleImport}
          disabled={disabled || importing}
          className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          {importing && <DharmaSpinner size={18} />}
          {importing ? "Đang import..." : "Import ảnh"}
        </button>
        <span className="text-sm text-stone-600">
          {effectiveSelected.length} / {images.length} ảnh được chọn hiển thị
        </span>
      </div>

      {images.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-xl bg-stone-100 text-stone-500">
          {importing ? <DharmaSpinner label="Đang import ảnh..." /> : "Kho trống — nhấn Import ảnh để thêm"}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((path) => (
            <GalleryThumbnailCell
              key={path}
              path={path}
              checked={isSelected(path, selectedImages)}
              disabled={disabled}
              removing={removingPath === path}
              onToggle={() => toggleImage(path)}
              onRemove={() => handleRemove(path)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
