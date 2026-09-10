import { useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { invalidateMusicCache, playMusicFromPath } from "../hooks/useMusicPlayer";
import type { AppConfig, MusicTrack } from "../types/config";
import ToggleSwitch from "./ToggleSwitch";
import { IconSound } from "./SettingsIcons";

interface Props {
  config: AppConfig;
  disabled?: boolean;
  onUpdate: (partial: Partial<AppConfig>) => void;
  onStatus: (msg: string) => void;
}

export default function MusicLibrary({ config, disabled, onUpdate, onStatus }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function handleImport() {
    const selected = await open({
      multiple: true,
      filters: [{ name: "Nhạc", extensions: ["mp3", "wav", "ogg", "m4a", "flac"] }],
    });
    if (!selected) return;

    const paths = Array.isArray(selected) ? selected : [selected];
    const newTracks: MusicTrack[] = [];

    for (const path of paths) {
      try {
        invalidateMusicCache();
        const track = await invoke<MusicTrack>("import_music", { path, displayName: null });
        newTracks.push(track);
      } catch (err) {
        onStatus(String(err));
      }
    }

    if (newTracks.length === 0) return;

    const cfg = await invoke<AppConfig>("get_config");
    onUpdate({
      musicTracks: cfg.musicTracks,
      activeMusicId: cfg.activeMusicId ?? newTracks[0]?.id ?? null,
      musicEnabled: true,
    });
    onStatus(`Đã import ${newTracks.length} file nhạc.`);
  }

  async function handleRename(track: MusicTrack) {
    const next = window.prompt("Tên hiển thị:", track.displayName);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed) {
      onStatus("Tên nhạc không được để trống.");
      return;
    }
    try {
      const updated = await invoke<MusicTrack>("rename_music_track", {
        id: track.id,
        displayName: trimmed,
      });
      onUpdate({
        musicTracks: config.musicTracks.map((t) => (t.id === updated.id ? updated : t)),
      });
    } catch (err) {
      onStatus(String(err));
    }
  }

  async function handleRemove(track: MusicTrack) {
    if (!confirm(`Xóa "${track.displayName}" khỏi thư viện?`)) return;
    try {
      invalidateMusicCache();
      await invoke("remove_music_track", { id: track.id });
      const nextTracks = config.musicTracks.filter((t) => t.id !== track.id);
      const nextActive =
        config.activeMusicId === track.id ? (nextTracks[0]?.id ?? null) : config.activeMusicId;
      onUpdate({ musicTracks: nextTracks, activeMusicId: nextActive });
    } catch (err) {
      onStatus(String(err));
    }
  }

  async function handlePreview(track: MusicTrack) {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await playMusicFromPath(audio, track.path, config.musicVolume, false);
    } catch (err) {
      onStatus(`Không phát được nhạc: ${err}`);
    }
  }

  return (
    <div>
      <audio ref={audioRef} className="hidden" />

      <div className="flex flex-wrap items-center gap-3">
        <ToggleSwitch
          id="music-enabled"
          checked={config.musicEnabled}
          disabled={disabled}
          onChange={(musicEnabled) => onUpdate({ musicEnabled })}
          label="Bật âm thanh"
        />
        <button
          type="button"
          onClick={handleImport}
          disabled={disabled}
          className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-50 disabled:opacity-60"
        >
          Import nhạc
        </button>
      </div>

      {config.musicTracks.length > 0 && (
        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-stone-600">Track đang phát</label>
          <select
            value={config.activeMusicId ?? ""}
            onChange={(e) => onUpdate({ activeMusicId: e.target.value || null })}
            disabled={disabled}
            className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
          >
            {config.musicTracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.displayName}
              </option>
            ))}
          </select>
        </div>
      )}

      {config.musicTracks.length === 0 ? (
        <p className="mt-3 text-xs text-stone-500">Chưa có nhạc — nhấn Import để thêm.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {config.musicTracks.map((track) => (
            <li
              key={track.id}
              className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1.5"
            >
              <input
                type="radio"
                name="active-music"
                checked={config.activeMusicId === track.id}
                onChange={() => onUpdate({ activeMusicId: track.id })}
                disabled={disabled}
                title="Chọn track active"
              />
              <span className="min-w-0 flex-1 truncate text-sm text-stone-800">{track.displayName}</span>
              <button
                type="button"
                onClick={() => handlePreview(track)}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-stone-300 hover:bg-white"
                title="Nghe thử"
              >
                <IconSound />
              </button>
              <button
                type="button"
                onClick={() => handleRename(track)}
                disabled={disabled}
                className="shrink-0 text-xs text-amber-800 hover:underline disabled:opacity-50"
              >
                Sửa tên
              </button>
              <button
                type="button"
                onClick={() => handleRemove(track)}
                disabled={disabled}
                className="shrink-0 text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                Xóa
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-xs font-medium text-stone-600">
          <span>Âm lượng</span>
          <span>{Math.round(config.musicVolume * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={config.musicVolume}
          onChange={(e) => onUpdate({ musicVolume: Number(e.target.value) })}
          disabled={disabled}
          className="range-amber w-full"
        />
      </div>
    </div>
  );
}
