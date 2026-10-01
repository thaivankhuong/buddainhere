interface Props {
  queueIds: number[];
  focusId: number | null;
  doneSet: Set<number>;
  onSelect: (id: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  disabled?: boolean;
  /** Compact mode for overlay (hide prev/next labels). */
  compact?: boolean;
  /** goal = đang trong mục tiêu hôm nay; continue = đã xong mục tiêu, học tiếp */
  phase?: "goal" | "continue";
  /** Verse id when continuing beyond today's goal (for label). */
  continueVerseId?: number | null;
  memorizedToday?: number;
  todayTotal?: number;
  memorizedTotal?: number;
  totalVerses?: number;
}

/** Clickable chips for today's learning queue + optional prev/next nav. */
export default function DhammapadaTodayQueue({
  queueIds,
  focusId,
  doneSet,
  onSelect,
  onPrev,
  onNext,
  disabled = false,
  compact = false,
  phase = "goal",
  continueVerseId = null,
  memorizedToday,
  todayTotal,
  memorizedTotal,
  totalVerses,
}: Props) {
  if (queueIds.length === 0) return null;

  const showMeta =
    memorizedToday != null &&
    todayTotal != null &&
    memorizedTotal != null &&
    totalVerses != null;

  return (
    <div className={`dhamma-queue-bar ${compact ? "dhamma-queue-bar-compact" : ""}`}>
      <div
        className="dhamma-queue-chips"
        role="tablist"
        aria-label="Mục tiêu học hôm nay"
      >
        {queueIds.map((id) => {
          const isDone = doneSet.has(id);
          const isActive = focusId === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={disabled}
              className={`dhamma-queue-chip ${
                isActive ? "dhamma-queue-chip-active" : ""
              } ${isDone ? "dhamma-queue-chip-done" : ""}`}
              onClick={() => onSelect(id)}
            >
              {isDone ? (
                <span className="dhamma-queue-chip-check" aria-hidden>
                  ✓
                </span>
              ) : null}
              <span>Kệ {id}</span>
            </button>
          );
        })}
      </div>

      {phase === "continue" && continueVerseId != null && (
        <p className="dhamma-continue-label">
          Tiếp tục: Kệ {continueVerseId}
        </p>
      )}

      {(onPrev || onNext || showMeta) && (
        <div className="dhamma-queue-nav">
          {onPrev && (
            <button
              type="button"
              className="dhamma-queue-nav-btn"
              disabled={disabled || queueIds.length < 2}
              onClick={onPrev}
              aria-label="Kệ trước"
            >
              ‹{compact ? "" : " Trước"}
            </button>
          )}
          {showMeta && (
            <div className="dhamma-progress-meta">
              <span>
                Mục tiêu {memorizedToday}/{todayTotal} đã nhớ
              </span>
              <span>
                Tổng {memorizedTotal}/{totalVerses}
              </span>
            </div>
          )}
          {onNext && (
            <button
              type="button"
              className="dhamma-queue-nav-btn"
              disabled={disabled || queueIds.length < 2}
              onClick={onNext}
              aria-label="Kệ sau"
            >
              {compact ? "" : "Sau "}›
            </button>
          )}
        </div>
      )}
    </div>
  );
}
