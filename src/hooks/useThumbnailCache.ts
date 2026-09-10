import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

const globalCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

async function fetchThumbnail(path: string): Promise<string> {
  const cached = globalCache.get(path);
  if (cached) return cached;

  const pending = inflight.get(path);
  if (pending) return pending;

  const promise = invoke<string>("get_image_thumbnail", { path }).then((url) => {
    globalCache.set(path, url);
    inflight.delete(path);
    return url;
  });

  inflight.set(path, promise);
  return promise;
}

export function invalidateThumbnail(path: string) {
  globalCache.delete(path);
  inflight.delete(path);
}

export function clearThumbnailCache() {
  globalCache.clear();
  inflight.clear();
}

export function useThumbnail(path: string | null) {
  const [src, setSrc] = useState<string | null>(() =>
    path ? globalCache.get(path) ?? null : null,
  );
  const [loading, setLoading] = useState(() =>
    Boolean(path && !globalCache.has(path)),
  );

  useEffect(() => {
    if (!path) {
      setSrc(null);
      setLoading(false);
      return;
    }

    const cached = globalCache.get(path);
    if (cached) {
      setSrc(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchThumbnail(path)
      .then((url) => {
        if (!cancelled) setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return { src, loading };
}

export function useThumbnailLoader() {
  const preload = useCallback(async (paths: string[]) => {
    await Promise.allSettled(paths.map((path) => fetchThumbnail(path)));
  }, []);

  return { preload, invalidateThumbnail, clearThumbnailCache };
}
