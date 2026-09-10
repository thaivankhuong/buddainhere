import { invoke } from "@tauri-apps/api/core";

const musicCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

async function loadMusicDataUrl(path: string): Promise<string> {
  const cached = musicCache.get(path);
  if (cached) return cached;

  const pending = inflight.get(path);
  if (pending) return pending;

  const promise = invoke<string>("get_music_data_url", { path }).then((url) => {
    musicCache.set(path, url);
    inflight.delete(path);
    return url;
  });

  inflight.set(path, promise);
  return promise;
}

export function invalidateMusicCache(path?: string) {
  if (path) {
    musicCache.delete(path);
    inflight.delete(path);
  } else {
    musicCache.clear();
    inflight.clear();
  }
}

export async function playMusicFromPath(
  audio: HTMLAudioElement,
  path: string,
  volume: number,
  loop = false,
): Promise<void> {
  const dataUrl = await loadMusicDataUrl(path);
  audio.src = dataUrl;
  audio.volume = volume;
  audio.loop = loop;
  audio.load();
  await audio.play();
}
