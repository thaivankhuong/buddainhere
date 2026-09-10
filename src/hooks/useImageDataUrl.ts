import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export function useImageThumbnail(path: string | null) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!path) {
      setSrc(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    invoke<string>("get_image_thumbnail", { path })
      .then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl);
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
