import type { DhammapadaVerse } from "../utils/dhammapada";

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
  const showImageCol =
    showImage && (Boolean(verseImageSrc) || verseImageLoading);

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
        <div className="dhamma-card-image-col">
          {verseImageSrc ? (
            <img
              src={verseImageSrc}
              alt={`Minh họa kệ ${verse.id}`}
              className="dhamma-verse-illustration"
              draggable={false}
            />
          ) : (
            <div className="dhamma-verse-illustration-loading">Đang tải ảnh…</div>
          )}
        </div>
      )}
    </div>
  );
}
