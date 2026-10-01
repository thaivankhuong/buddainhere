import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { resolveVerseImageId, type DhammapadaVerse } from "../utils/dhammapada";

interface Props {
  verse: DhammapadaVerse;
  showImage?: boolean;
  verseImageSrc?: string | null;
  verseImageLoading?: boolean;
}

/** Shared 2-column layout: verse text left, illustration right. */
export default function DhammapadaVerseLayout({
  verse,
  showImage = false,
  verseImageSrc = null,
  verseImageLoading = false,
}: Props) {
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFallbackSrc(null);
    setLoaded(false);
    setFailed(false);
  }, [verseImageSrc, verse.id]);

  const displaySrc = failed ? null : (fallbackSrc ?? verseImageSrc);
  const pending = Boolean(displaySrc) && !loaded;
  const showImageCol = showImage && !failed && (Boolean(displaySrc) || verseImageLoading);

  async function handleImageError() {
    setLoaded(false);
    const imageId = resolveVerseImageId(verse.id);
    if (!displaySrc || displaySrc.startsWith("data:") || fallbackSrc || imageId == null) {
      setFailed(true);
      return;
    }
    try {
      const dataUrl = await invoke<string | null>(
        "get_dhammapada_verse_image_display_data_url",
        { imageId },
      );
      if (dataUrl) setFallbackSrc(dataUrl);
      else setFailed(true);
    } catch (err) {
      console.error(`[verse-${verse.id}] onError fallback thất bại:`, err);
      setFailed(true);
    }
  }

  return (
    <div
      className={`dhamma-card-main ${showImageCol ? "" : "dhamma-card-main-text-only"}`}
    >
      <div className="dhamma-card-text-col">
        <div className="dhamma-card-body">
          {verse.lines.map((line, i) => (
            <p key={`${verse.id}-${i}`} className="dhamma-line">
              {line}
            </p>
          ))}
        </div>
      </div>
      {showImageCol && (
        <div
          className="dhamma-card-image-col dhamma-verse-illustration-wrap"
          aria-label={`Minh họa kệ ${verse.id}`}
        >
          {(!displaySrc || pending) && (
            <div className="dhamma-verse-illustration-loading">Đang tải ảnh…</div>
          )}
          {displaySrc && (
            <img
              key={displaySrc}
              src={displaySrc}
              alt=""
              className={`dhamma-verse-illustration ${pending ? "is-pending" : ""}`}
              draggable={false}
              onLoad={() => setLoaded(true)}
              onError={() => void handleImageError()}
            />
          )}
        </div>
      )}
    </div>
  );
}
