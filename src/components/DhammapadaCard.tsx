import type { DhammapadaChapter, DhammapadaVerse } from "../utils/dhammapada";
import type { DhammapadaPlayMode } from "../types/config";
import DhammapadaTodayQueue from "./DhammapadaTodayQueue";
import DhammapadaVerseLayout from "./DhammapadaVerseLayout";

export type DhammapadaCardAction = "memorized" | "skip" | "timeout";

interface Props {
  verse: DhammapadaVerse;
  chapter: DhammapadaChapter | undefined;
  fontScale: number;
  todayLeft: number;
  todayTotal: number;
  memorized: number;
  total: number;
  source: string;
  fadeMs: number;
  phase: "entering" | "visible" | "exiting";
  playMode?: DhammapadaPlayMode;
  showVerseImage?: boolean;
  verseImageSrc?: string | null;
  /** Full today's queue (ordered, includes memorized). */
  queueIds?: number[];
  doneSet?: Set<number>;
  /** Whether current verse is part of today's goal. */
  isTodayGoal?: boolean;
  onMemorized: () => void;
  onSkip: () => void;
  onSelectVerse?: (id: number) => void;
  onPrevVerse?: () => void;
  onNextVerse?: () => void;
}

export default function DhammapadaCard({
  verse,
  chapter,
  fontScale,
  todayLeft,
  todayTotal,
  memorized,
  total,
  source,
  fadeMs,
  phase,
  playMode = "learning",
  showVerseImage = false,
  verseImageSrc = null,
  queueIds = [],
  doneSet,
  isTodayGoal = true,
  onMemorized,
  onSkip,
  onSelectVerse,
  onPrevVerse,
  onNextVerse,
}: Props) {
  const isRandom = playMode === "random";
  const doneToday = Math.max(0, todayTotal - todayLeft);
  const resolvedDone = doneSet ?? new Set<number>();
  const queuePhase =
    doneToday >= todayTotal && todayTotal > 0 && !isTodayGoal
      ? "continue"
      : "goal";
  const animClass =
    phase === "entering"
      ? "dhamma-card-enter"
      : phase === "exiting"
        ? "dhamma-card-exit"
        : "";

  return (
    <div
      className={`dhamma-stage ${isRandom ? "pointer-events-none" : "pointer-events-auto"}`}
    >
      <div className="dhamma-vignette" aria-hidden />
      <div
        className={`dhamma-card ${showVerseImage ? "dhamma-card-with-image" : ""} ${animClass}`}
        style={{
          animationDuration: `${fadeMs}ms`,
          ["--dhamma-font-scale" as string]: String(fontScale),
        }}
      >
        <header className="dhamma-card-header">
          <span className="dhamma-card-chapter">
            {chapter
              ? `Phẩm ${chapter.id} · ${chapter.name}`
              : `Phẩm ${verse.chapterId}`}
          </span>
          <span className="dhamma-card-verse-no">Kệ {verse.id}/{total}</span>
        </header>

        {!isRandom && queueIds.length > 0 && onSelectVerse && (
          <DhammapadaTodayQueue
            queueIds={queueIds}
            focusId={isTodayGoal ? verse.id : null}
            doneSet={resolvedDone}
            onSelect={onSelectVerse}
            onPrev={onPrevVerse}
            onNext={onNextVerse}
            compact
            phase={queuePhase}
            continueVerseId={queuePhase === "continue" ? verse.id : null}
            memorizedToday={doneToday}
            todayTotal={todayTotal}
            memorizedTotal={memorized}
            totalVerses={total}
          />
        )}

        <DhammapadaVerseLayout
          verse={verse}
          showImage={showVerseImage}
          verseImageSrc={verseImageSrc}
        />

        {isRandom ? (
          <div className="dhamma-progress-meta dhamma-random-meta">
            <span>Ngẫu nhiên · {total} kệ</span>
          </div>
        ) : (
          <div className="dhamma-card-actions">
            <button type="button" className="dhamma-btn dhamma-btn-ghost" onClick={onSkip}>
              Học lại sau
            </button>
            <button type="button" className="dhamma-btn dhamma-btn-primary" onClick={onMemorized}>
              Đã nhớ
            </button>
          </div>
        )}

        <footer className="dhamma-card-source">{source}</footer>
      </div>
    </div>
  );
}

interface DoneProps {
  kind: "day" | "journey";
  memorized: number;
  total: number;
  fadeMs: number;
  phase: "entering" | "visible" | "exiting";
  source: string;
}

export function DhammapadaDoneCard({
  kind,
  memorized,
  total,
  fadeMs,
  phase,
  source,
}: DoneProps) {
  const animClass =
    phase === "entering"
      ? "dhamma-card-enter"
      : phase === "exiting"
        ? "dhamma-card-exit"
        : "";

  return (
    <div className="dhamma-stage pointer-events-none">
      <div className="dhamma-vignette" aria-hidden />
      <div
        className={`dhamma-card dhamma-card-done ${animClass}`}
        style={{ animationDuration: `${fadeMs}ms` }}
      >
        <p className="dhamma-done-eyebrow">Kinh Pháp Cú</p>
        <h2 className="dhamma-done-title">
          {kind === "journey" ? "Đã thuộc đủ 423 kệ" : "Hôm nay đã thuộc đủ"}
        </h2>
        <p className="dhamma-done-body">
          {kind === "journey"
            ? "Lộ trình học thuộc đã hoàn thành. An lạc."
            : "Mai lại tiếp tục những kệ kế tiếp."}
        </p>
        <p className="dhamma-done-stats">
          {memorized}/{total} kệ
        </p>
        <footer className="dhamma-card-source">{source}</footer>
      </div>
    </div>
  );
}
