import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { resolveVerseImageId } from "../utils/dhammapada";
import { toAssetUrl } from "../utils/imageAssetUrl";

export function useDhammapadaVerseImage(verseId: number | null) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (verseId == null) {
      setSrc(null);
      setLoading(false);
      return;
    }

    const imageId = resolveVerseImageId(verseId);
    if (imageId == null) {
      setSrc(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setSrc(null);
    setLoading(true);

    invoke<string | null>("get_dhammapada_verse_image_display_path", {
      imageId,
    })
      .then(async (filePath) => {
        if (cancelled) return;
        if (filePath) {
          setSrc(toAssetUrl(filePath));
          return;
        }
        const dataUrl = await invoke<string | null>(
          "get_dhammapada_verse_image_display_data_url",
          { imageId },
        );
        if (!cancelled) setSrc(dataUrl);
      })
      .catch(async (err) => {
        console.error(`[verse-${imageId}] load failed:`, err);
        if (cancelled) return;
        try {
          const dataUrl = await invoke<string | null>(
            "get_dhammapada_verse_image_display_data_url",
            { imageId },
          );
          if (!cancelled) setSrc(dataUrl);
        } catch {
          if (!cancelled) setSrc(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [verseId]);

  return { src, loading };
}
