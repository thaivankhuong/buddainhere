import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { resolveVerseImageId } from "../utils/dhammapada";

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
    setLoading(true);

    invoke<string | null>("get_dhammapada_verse_image_display_data_url", {
      imageId,
    })
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
  }, [verseId]);

  return { src, loading };
}
