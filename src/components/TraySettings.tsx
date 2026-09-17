import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  HIDDEN_OPTIONS,
  VISIBLE_OPTIONS,
  type AppConfig,
} from "../types/config";
import SettingsPreview from "./SettingsPreview";
import GalleryTab from "./GalleryTab";
import MusicLibrary from "./MusicLibrary";
import MonitorPicker from "./MonitorPicker";
import PositionPicker from "./PositionPicker";
import AnimationPicker from "./AnimationPicker";
import CycleDurationInput from "./CycleDurationInput";
import DharmaSpinner from "./DharmaSpinner";
import SettingsSectionCard from "./SettingsSectionCard";
import ToggleSwitch from "./ToggleSwitch";
import { IconEffects, IconLotus, IconMonitor, IconPosition, IconSound } from "./SettingsIcons";

type SettingsTab = "settings" | "gallery";

function normalizeConfig(cfg: AppConfig): AppConfig {
  return {
    ...cfg,
    imageGroups: cfg.imageGroups ?? [],
    imageGroupAssignments: cfg.imageGroupAssignments ?? {},
    musicTracks: cfg.musicTracks ?? [],
    activeMusicId: cfg.activeMusicId ?? null,
    overlayMonitorId: cfg.overlayMonitorId ?? null,
  };
}

function configsEqual(a: AppConfig, b: AppConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function TraySettings() {
  const [savedConfig, setSavedConfig] = useState<AppConfig | null>(null);
  const [draftConfig, setDraftConfig] = useState<AppConfig | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingsTab>("settings");
  const isDirtyRef = useRef(false);

  const isDirty = useMemo(
    () => savedConfig && draftConfig && !configsEqual(savedConfig, draftConfig),
    [savedConfig, draftConfig],
  );

  isDirtyRef.current = Boolean(isDirty);

  const loadConfig = useCallback(async () => {
    const cfg = normalizeConfig(await invoke<AppConfig>("get_config"));
    setSavedConfig(cfg);
    if (!isDirtyRef.current) {
      setDraftConfig(cfg);
    }
    return cfg;
  }, []);

  const loadImages = useCallback(async () => {
    const imgs = await invoke<string[]>("get_gallery_images");
    setImages(imgs);
    return imgs;
  }, []);

  useEffect(() => {
    Promise.all([loadConfig(), loadImages()])
      .catch((err) => setStatus(String(err)))
      .finally(() => setInitialLoading(false));

    if (!isTauri()) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    listen<AppConfig>("config-changed", (event) => {
      if (disposed) return;
      const cfg = normalizeConfig(event.payload);
      setSavedConfig(cfg);
      if (!isDirtyRef.current) {
        setDraftConfig(cfg);
      } else {
        setDraftConfig((prev) =>
          prev
            ? {
                ...prev,
                musicTracks: cfg.musicTracks,
                activeMusicId: cfg.activeMusicId,
              }
            : prev,
        );
      }
    })
      .then((fn) => {
        if (disposed) fn();
        else cleanup = fn;
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [loadConfig, loadImages]);

  function updateDraft(partial: Partial<AppConfig>) {
    setDraftConfig((prev) => (prev ? { ...prev, ...partial } : prev));
  }

  async function handleSave() {
    if (!draftConfig) return;
    setBusy(true);
    setStatus("");
    try {
      await invoke("save_app_config", { config: draftConfig });
      isDirtyRef.current = false;
      setSavedConfig(draftConfig);
      setStatus("Đã lưu — overlay sẽ hiển thị theo cài đặt mới.");
    } catch (err) {
      setStatus(String(err));
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    if (savedConfig) {
      setDraftConfig(savedConfig);
      setStatus("Đã huỷ thay đổi.");
    }
  }

  if (initialLoading || !draftConfig || !savedConfig) {
    return (
      <div className="settings-shell items-center justify-center">
        <DharmaSpinner size={40} label="Đang tải cài đặt..." />
      </div>
    );
  }

  const previewImage =
    images.find((p) =>
      draftConfig.selectedImages.length === 0
        ? true
        : draftConfig.selectedImages.includes(p),
    ) ?? images[0] ?? null;

  return (
    <div className="settings-shell">
      {busy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
          <div className="rounded-2xl bg-white px-8 py-6 shadow-lg">
            <DharmaSpinner size={36} label="Đang xử lý..." />
          </div>
        </div>
      )}

      <header className="shrink-0 border-b border-amber-200/60 bg-white/80 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-amber-700">
              <IconLotus />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-amber-900">BuddaInHere</h1>
              <p className="text-xs text-stone-500">Cài đặt widget ảnh Phật trên desktop</p>
            </div>
          </div>
          <p className="max-w-[200px] text-right text-xs italic text-stone-500">
            An lạc trong từng khoảnh khắc
          </p>
        </div>

        <nav className="settings-tabs mt-4 flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`settings-tab ${activeTab === "settings" ? "settings-tab-active" : ""}`}
          >
            Cài đặt
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("gallery")}
            className={`settings-tab ${activeTab === "gallery" ? "settings-tab-active" : ""}`}
          >
            Kho hình ảnh
          </button>
        </nav>
      </header>

      {activeTab === "settings" ? (
        <main className="grid min-h-0 flex-1 grid-cols-[1fr_340px] gap-5 px-6 py-4">
          <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
            <SettingsSectionCard icon={<IconMonitor />} title="Màn hình hiển thị">
              <MonitorPicker
                value={draftConfig.overlayMonitorId}
                onChange={(overlayMonitorId) => updateDraft({ overlayMonitorId })}
              />
            </SettingsSectionCard>

            <SettingsSectionCard icon={<IconPosition />} title="Vị trí hiển thị">
              <PositionPicker
                value={draftConfig.imagePosition}
                onChange={(imagePosition) => updateDraft({ imagePosition })}
              />
            </SettingsSectionCard>

            <SettingsSectionCard icon={<IconEffects />} title="Hiệu ứng & Chu kỳ">
              <AnimationPicker
                animationIn={draftConfig.animationIn}
                animationOut={draftConfig.animationOut}
                fadeMs={draftConfig.fadeMs}
                onAnimationInChange={(animationIn) => updateDraft({ animationIn })}
                onAnimationOutChange={(animationOut) => updateDraft({ animationOut })}
                onFadeMsChange={(fadeMs) => updateDraft({ fadeMs })}
              />

              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-stone-100 pt-3">
                <CycleDurationInput
                  label="Thời gian hiện"
                  value={draftConfig.visibleSecs}
                  presets={VISIBLE_OPTIONS}
                  onChange={(visibleSecs) => updateDraft({ visibleSecs })}
                  compact
                />
                <CycleDurationInput
                  label="Thời gian ẩn"
                  value={draftConfig.hiddenSecs}
                  presets={HIDDEN_OPTIONS}
                  onChange={(hiddenSecs) => updateDraft({ hiddenSecs })}
                  compact
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-4 border-t border-stone-100 pt-3">
                <ToggleSwitch
                  id="overlay-enabled"
                  checked={draftConfig.overlayEnabled}
                  onChange={(overlayEnabled) => updateDraft({ overlayEnabled })}
                  label="Bật overlay"
                />
                <ToggleSwitch
                  id="random-mode"
                  checked={draftConfig.randomMode}
                  onChange={(randomMode) => updateDraft({ randomMode })}
                  label="Ngẫu nhiên"
                />
              </div>
            </SettingsSectionCard>

            <SettingsSectionCard icon={<IconSound />} title="Âm thanh">
              <MusicLibrary
                config={draftConfig}
                disabled={busy}
                onUpdate={updateDraft}
                onStatus={setStatus}
              />
            </SettingsSectionCard>

            {status && (
              <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">{status}</p>
            )}
          </div>

          <aside className="sticky top-0 min-w-0 self-start">
            <SettingsPreview config={draftConfig} previewImage={previewImage} />
          </aside>
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-4">
          <GalleryTab
            config={draftConfig}
            images={images}
            disabled={busy}
            onUpdate={updateDraft}
            onImagesChange={setImages}
            onStatus={setStatus}
          />
          {status && (
            <p className="mt-3 shrink-0 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">{status}</p>
          )}
        </main>
      )}

      <footer className="shrink-0 border-t border-amber-200/60 bg-white/90 px-6 py-3 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-stone-600">Hành động</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy || !isDirty}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-50 disabled:opacity-50"
            >
              Huỷ thay đổi
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={busy || !isDirty}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {busy && <DharmaSpinner size={16} className="text-white [&_svg]:text-white" />}
              {busy ? "Đang lưu..." : "Lưu cài đặt"}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
