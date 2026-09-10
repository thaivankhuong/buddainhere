import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { AppConfig, ImageGroup } from "../types/config";
import { newId } from "../types/config";
import SettingsSectionCard from "./SettingsSectionCard";
import GalleryThumbnailCell from "./GalleryThumbnailCell";
import DharmaSpinner from "./DharmaSpinner";
import { IconGallery } from "./SettingsIcons";
import { invalidateThumbnail } from "../hooks/useThumbnailCache";

interface Props {
  config: AppConfig;
  images: string[];
  disabled?: boolean;
  onUpdate: (partial: Partial<AppConfig>) => void;
  onImagesChange: (images: string[]) => void;
  onStatus: (msg: string) => void;
}

function isSelected(path: string, selectedImages: string[]) {
  if (selectedImages.length === 0) return true;
  return selectedImages.includes(path);
}

function groupImages(
  images: string[],
  groups: ImageGroup[],
  assignments: Record<string, string>,
) {
  const byGroup: Record<string, string[]> = {};
  for (const g of groups) byGroup[g.id] = [];
  const ungrouped: string[] = [];

  for (const path of images) {
    const groupId = assignments[path];
    if (groupId && byGroup[groupId]) byGroup[groupId].push(path);
    else ungrouped.push(path);
  }

  return { byGroup, ungrouped };
}

export default function GalleryTab({
  config,
  images,
  disabled,
  onUpdate,
  onImagesChange,
  onStatus,
}: Props) {
  const [importing, setImporting] = useState(false);
  const [removingPath, setRemovingPath] = useState<string | null>(null);
  const [pendingImportPaths, setPendingImportPaths] = useState<string[] | null>(null);
  const [importGroupId, setImportGroupId] = useState<string>("");

  const { byGroup, ungrouped } = useMemo(
    () => groupImages(images, config.imageGroups, config.imageGroupAssignments),
    [images, config.imageGroups, config.imageGroupAssignments],
  );

  function createGroup() {
    const name = window.prompt("Tên nhóm ảnh:", "Ảnh Phật A Di Đà");
    if (!name?.trim()) return;
    const group: ImageGroup = { id: newId(), name: name.trim() };
    onUpdate({ imageGroups: [...config.imageGroups, group] });
  }

  function renameGroup(group: ImageGroup) {
    const name = window.prompt("Đổi tên nhóm:", group.name);
    if (!name?.trim()) return;
    onUpdate({
      imageGroups: config.imageGroups.map((g) =>
        g.id === group.id ? { ...g, name: name.trim() } : g,
      ),
    });
  }

  function deleteGroup(group: ImageGroup) {
    const count = byGroup[group.id]?.length ?? 0;
    const msg =
      count > 0
        ? `Xóa nhóm "${group.name}"? ${count} ảnh sẽ chuyển về "Chưa phân loại".`
        : `Xóa nhóm "${group.name}"?`;
    if (!confirm(msg)) return;

    const nextAssignments = { ...config.imageGroupAssignments };
    for (const [path, gid] of Object.entries(nextAssignments)) {
      if (gid === group.id) delete nextAssignments[path];
    }
    onUpdate({
      imageGroups: config.imageGroups.filter((g) => g.id !== group.id),
      imageGroupAssignments: nextAssignments,
    });
  }

  function toggleImage(path: string) {
    const selectedImages = config.selectedImages;
    const currentlySelected = isSelected(path, selectedImages);

    if (selectedImages.length === 0) {
      onUpdate({ selectedImages: images.filter((p) => p !== path) });
      return;
    }

    if (currentlySelected) {
      const next = selectedImages.filter((p) => p !== path);
      onUpdate({ selectedImages: next.length === images.length ? [] : next });
    } else {
      const next = [...selectedImages, path];
      onUpdate({ selectedImages: next.length === images.length ? [] : next });
    }
  }

  function assignImageGroup(path: string, targetGroupId: string) {
    const nextAssignments = { ...config.imageGroupAssignments };
    if (targetGroupId) nextAssignments[path] = targetGroupId;
    else delete nextAssignments[path];
    onUpdate({ imageGroupAssignments: nextAssignments });
  }

  async function handleRemove(path: string) {
    const name = path.split(/[/\\]/).pop() ?? path;
    if (!confirm(`Xóa ảnh "${name}" khỏi kho?`)) return;

    setRemovingPath(path);
    const nextImages = images.filter((p) => p !== path);
    onImagesChange(nextImages);

    const nextSelected = config.selectedImages.filter((p) => p !== path);
    const nextAssignments = { ...config.imageGroupAssignments };
    delete nextAssignments[path];
    onUpdate({ selectedImages: nextSelected, imageGroupAssignments: nextAssignments });
    invalidateThumbnail(path);

    try {
      await invoke("remove_image", { path });
    } catch (err) {
      onImagesChange(images);
      onStatus(String(err));
    } finally {
      setRemovingPath(null);
    }
  }

  async function pickImportPaths() {
    const selected = await open({
      multiple: true,
      filters: [{ name: "Ảnh", extensions: ["jpg", "jpeg", "png", "webp", "bmp", "gif"] }],
    });
    if (!selected) return null;
    return Array.isArray(selected) ? selected : [selected];
  }

  async function startImport() {
    const paths = await pickImportPaths();
    if (!paths) return;

    if (config.imageGroups.length === 0) {
      await runImport(paths, null);
      return;
    }

    setPendingImportPaths(paths);
    setImportGroupId(config.imageGroups[0]?.id ?? "");
  }

  async function startImportForGroup(groupId: string) {
    const paths = await pickImportPaths();
    if (!paths) return;
    await runImport(paths, groupId);
  }

  async function runImport(paths: string[], groupId: string | null) {
    setImporting(true);
    try {
      const imported = await invoke<string[]>("import_images", { paths });
      if (imported.length === 0) {
        onStatus("Không import được ảnh hợp lệ nào.");
        return;
      }

      onImagesChange([...images, ...imported].sort());
      const nextAssignments = { ...config.imageGroupAssignments };
      if (groupId) {
        for (const p of imported) nextAssignments[p] = groupId;
      }
      onUpdate({ imageGroupAssignments: nextAssignments });
      onStatus(`Đã import ${imported.length} ảnh.`);
    } catch (err) {
      onStatus(String(err));
    } finally {
      setImporting(false);
      setPendingImportPaths(null);
    }
  }

  function renderImageGrid(paths: string[], groupId: string | null) {
    if (paths.length === 0 && groupId === null) return null;

    const selectedCount = paths.filter((p) => isSelected(p, config.selectedImages)).length;

    return (
      <div>
        {paths.length > 0 && (
          <p className="mb-2 text-xs text-stone-500">
            {selectedCount}/{paths.length} ảnh được chọn · Nhấn ảnh để bật/tắt hiển thị
          </p>
        )}
        <div className="gallery-grid">
          {paths.map((path) => (
            <div key={path} className="gallery-grid-item">
              <GalleryThumbnailCell
                path={path}
                checked={isSelected(path, config.selectedImages)}
                disabled={disabled}
                removing={removingPath === path}
                compact
                onToggle={() => toggleImage(path)}
                onRemove={() => handleRemove(path)}
              />
              <div className="mt-1 space-y-1">
                <select
                  value={config.imageGroupAssignments[path] ?? ""}
                  onChange={(e) => assignImageGroup(path, e.target.value)}
                  disabled={disabled || config.imageGroups.length === 0}
                  className="gallery-group-select w-full"
                  title="Chuyển sang nhóm"
                >
                  <option value="">Chưa phân loại</option>
                  {config.imageGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleRemove(path)}
                  disabled={disabled || removingPath === path}
                  className="w-full rounded border border-stone-200 py-0.5 text-[10px] text-red-600 hover:bg-red-50 disabled:opacity-50"
                  title="Xóa ảnh"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
          {groupId !== null && (
            <button
              type="button"
              onClick={() => startImportForGroup(groupId)}
              disabled={disabled || importing}
              className="gallery-import-tile"
            >
              {importing ? (
                <DharmaSpinner size={20} />
              ) : (
                <>
                  <span className="text-2xl leading-none text-amber-700">+</span>
                  <span className="text-xs text-amber-800">Import</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={createGroup}
          disabled={disabled}
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          + Tạo nhóm
        </button>
        <button
          type="button"
          onClick={startImport}
          disabled={disabled || importing}
          className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50 disabled:opacity-60"
        >
          {importing && <DharmaSpinner size={16} />}
          Import ảnh
        </button>
        <span className="text-xs text-stone-500">{images.length} ảnh trong kho</span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4 pr-1">
      {config.imageGroups.map((group) => (
        <SettingsSectionCard
          key={group.id}
          icon={<IconGallery />}
          title={group.name}
          extra={
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-500">
                {(byGroup[group.id]?.length ?? 0)} ảnh
              </span>
              <button
                type="button"
                onClick={() => renameGroup(group)}
                className="text-xs text-amber-800 hover:underline"
              >
                Sửa tên
              </button>
              <button
                type="button"
                onClick={() => deleteGroup(group)}
                className="text-xs text-red-600 hover:underline"
              >
                Xóa nhóm
              </button>
            </div>
          }
        >
          {(byGroup[group.id]?.length ?? 0) === 0 ? (
            <div>
              <p className="mb-3 text-xs text-stone-500">Nhóm trống — import ảnh vào nhóm này.</p>
              {renderImageGrid([], group.id)}
            </div>
          ) : (
            renderImageGrid(byGroup[group.id] ?? [], group.id)
          )}
        </SettingsSectionCard>
      ))}

      <SettingsSectionCard
        icon={<IconGallery />}
        title="Chưa phân loại"
        extra={<span className="text-xs text-stone-500">{ungrouped.length} ảnh</span>}
      >
        {ungrouped.length === 0 ? (
          <p className="text-xs text-stone-500">Không có ảnh chưa phân loại.</p>
        ) : (
          renderImageGrid(ungrouped, null)
        )}
      </SettingsSectionCard>
      </div>

      {pendingImportPaths !== null && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20">
          <div className="w-full max-w-sm rounded-xl border border-amber-200 bg-white p-4 shadow-lg">
            <h3 className="mb-3 text-sm font-semibold text-amber-900">Chọn nhóm cho ảnh import</h3>
            <select
              value={importGroupId}
              onChange={(e) => setImportGroupId(e.target.value)}
              className="mb-4 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
            >
              <option value="">Chưa phân loại</option>
              {config.imageGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingImportPaths(null)}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={() =>
                  runImport(pendingImportPaths, importGroupId || null)
                }
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
