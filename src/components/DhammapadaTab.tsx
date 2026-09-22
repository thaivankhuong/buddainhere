import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AppConfig, DhammapadaMode, DhammapadaPlayMode } from "../types/config";
import { useDhammapadaVerseImage } from "../hooks/useDhammapadaVerseImage";
import {
  DHAMMAPADA,
  activeTodayQueue,
  clampFontScale,
  ensureTodayQueue,
  getChapter,
  getVerse,
  markMemorized,
  memorizedSet,
  nextVerseInQueue,
  progressStats,
  randomVerse,
  resetProgress,
  type DhammapadaVerse,
} from "../utils/dhammapada";
import DhammapadaVerseLayout from "./DhammapadaVerseLayout";
import SettingsSectionCard from "./SettingsSectionCard";
import ToggleSwitch from "./ToggleSwitch";
import { IconDhamma } from "./SettingsIcons";

interface Props {
  config: AppConfig;
  disabled?: boolean;
  onUpdate: (partial: Partial<AppConfig>) => void;
  onStatus: (msg: string) => void;
}

export default function DhammapadaTab({
  config,
  disabled,
  onUpdate,
  onStatus,
}: Props) {
  const enabled = config.dhammapadaEnabled ?? false;
  const mode = (config.dhammapadaMode ?? "withImage") as DhammapadaMode;
  const playMode = (config.dhammapadaPlayMode ?? "learning") as DhammapadaPlayMode;
  const isRandom = playMode === "random";
  const quota = config.dhammapadaDailyQuota ?? 3;
  const fontScale = clampFontScale(config.dhammapadaFontScale ?? 1);

  const rolled = useMemo(() => ensureTodayQueue(config), [config]);
  const stats = useMemo(() => progressStats(rolled), [rolled]);
  const done = useMemo(() => memorizedSet(rolled), [rolled]);
  const todayQueue = useMemo(() => activeTodayQueue(rolled), [rolled]);

  const [focusVerseId, setFocusVerseId] = useState<number | null>(null);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(1);
  const [savingProgress, setSavingProgress] = useState(false);

  // Sync learning date/queue into draft if day rolled over (config-only, awaiting Save)
  useEffect(() => {
    if (
      rolled.dhammapadaLearningDate !== config.dhammapadaLearningDate ||
      JSON.stringify(rolled.dhammapadaTodayQueue) !==
        JSON.stringify(config.dhammapadaTodayQueue)
    ) {
      onUpdate({
        dhammapadaLearningDate: rolled.dhammapadaLearningDate,
        dhammapadaTodayQueue: rolled.dhammapadaTodayQueue,
        dhammapadaDailyQuota: rolled.dhammapadaDailyQuota,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolled.dhammapadaLearningDate, rolled.dhammapadaTodayQueue]);

  useEffect(() => {
    if (isRandom) {
      if (focusVerseId == null) {
        const v = randomVerse();
        if (v) {
          setFocusVerseId(v.id);
          setExpandedChapter(v.chapterId);
        }
      }
      return;
    }
    if (focusVerseId == null && todayQueue.length > 0) {
      setFocusVerseId(todayQueue[0]);
    }
  }, [todayQueue, focusVerseId, isRandom]);

  const displayVerse: DhammapadaVerse | null = useMemo(() => {
    if (focusVerseId != null) {
      return getVerse(focusVerseId) ?? null;
    }
    return nextVerseInQueue(rolled);
  }, [focusVerseId, rolled]);

  const displayChapter = displayVerse
    ? getChapter(displayVerse.chapterId)
    : undefined;

  const showVerseImage = mode === "withImage";
  const { src: verseImageSrc, loading: verseImageLoading } =
    useDhammapadaVerseImage(showVerseImage ? (displayVerse?.id ?? null) : null);

  const saveProgressNow = useCallback(
    async (
      progress: Pick<
        AppConfig,
        | "dhammapadaMemorizedIds"
        | "dhammapadaLearningDate"
        | "dhammapadaTodayQueue"
      >,
      message: string,
    ) => {
      setSavingProgress(true);
      try {
        const latest = await invoke<AppConfig>("get_config");
        const next: AppConfig = {
          ...latest,
          dhammapadaMemorizedIds: progress.dhammapadaMemorizedIds,
          dhammapadaLearningDate: progress.dhammapadaLearningDate,
          dhammapadaTodayQueue: progress.dhammapadaTodayQueue,
        };
        await invoke("save_app_config", { config: next });
        onUpdate({
          dhammapadaMemorizedIds: next.dhammapadaMemorizedIds,
          dhammapadaLearningDate: next.dhammapadaLearningDate,
          dhammapadaTodayQueue: next.dhammapadaTodayQueue,
        });
        onStatus(message);
      } catch (err) {
        onStatus(String(err));
      } finally {
        setSavingProgress(false);
      }
    },
    [onUpdate, onStatus],
  );

  async function handleMemorized() {
    if (!displayVerse || disabled || savingProgress) return;
    const base = ensureTodayQueue(config);
    const next = markMemorized(base, displayVerse.id);
    const remaining = activeTodayQueue(next);
    await saveProgressNow(
      {
        dhammapadaMemorizedIds: next.dhammapadaMemorizedIds,
        dhammapadaLearningDate: next.dhammapadaLearningDate,
        dhammapadaTodayQueue: next.dhammapadaTodayQueue,
      },
      remaining.length === 0
        ? progressStats(next).complete
          ? "Đã thuộc đủ 423 kệ — lộ trình hoàn thành."
          : "Hôm nay đã thuộc đủ. Mai tiếp tục."
        : `Đã nhớ kệ ${displayVerse.id}.`,
    );
    if (remaining.length > 0) {
      setFocusVerseId(remaining[0]);
    } else {
      setFocusVerseId(null);
    }
  }

  function handleSkip() {
    if (!displayVerse) return;
    const next = nextVerseInQueue(rolled, displayVerse.id);
    if (next) setFocusVerseId(next.id);
  }

  async function handleReset() {
    if (
      !window.confirm(
        "Đặt lại toàn bộ tiến độ học thuộc Pháp Cú? Các kệ đã nhớ sẽ hiện lại từ đầu.",
      )
    ) {
      return;
    }
    const cleared = resetProgress(config);
    await saveProgressNow(
      {
        dhammapadaMemorizedIds: cleared.dhammapadaMemorizedIds,
        dhammapadaLearningDate: cleared.dhammapadaLearningDate,
        dhammapadaTodayQueue: cleared.dhammapadaTodayQueue,
      },
      "Đã đặt lại tiến độ Pháp Cú.",
    );
    setFocusVerseId(null);
  }

  async function handleUnmemorize(id: number) {
    if (disabled || savingProgress) return;
    const ids = (config.dhammapadaMemorizedIds ?? []).filter((x) => x !== id);
    await saveProgressNow(
      {
        dhammapadaMemorizedIds: ids,
        dhammapadaLearningDate: config.dhammapadaLearningDate,
        dhammapadaTodayQueue: config.dhammapadaTodayQueue,
      },
      `Đã bỏ đánh dấu kệ ${id}.`,
    );
  }

  const versesByChapter = useMemo(() => {
    const map = new Map<number, DhammapadaVerse[]>();
    for (const ch of DHAMMAPADA.chapters) map.set(ch.id, []);
    for (const v of DHAMMAPADA.verses) {
      const list = map.get(v.chapterId);
      if (list) list.push(v);
      else map.set(v.chapterId, [v]);
    }
    return map;
  }, []);

  const dayComplete = stats.dayComplete || (todayQueue.length === 0 && stats.memorized > 0);
  const journeyComplete = stats.complete;

  return (
    <div className="dhamma-tab-layout">
      <SettingsSectionCard icon={<IconDhamma />} title="Tiến độ & cài đặt">
        <div className="space-y-3">
          {!isRandom && (
            <div className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2.5">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-amber-900">
                <span>Tiến độ</span>
                <span>
                  {stats.memorized}/{stats.total} · {stats.percent}%
                </span>
              </div>
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-amber-600 transition-all"
                  style={{ width: `${stats.percent}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-600">
                Hôm nay còn {stats.todayLeft}/{stats.todayTotal} kệ
                {journeyComplete ? " · Đã hoàn thành lộ trình" : ""}
              </p>
            </div>
          )}

          <ToggleSwitch
            id="dhammapada-enabled"
            checked={enabled}
            onChange={(dhammapadaEnabled) => onUpdate({ dhammapadaEnabled })}
            label="Bật Pháp Cú trên overlay"
            disabled={disabled}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">
                Cách hiện
              </label>
              <select
                value={playMode}
                disabled={disabled}
                onChange={(e) =>
                  onUpdate({
                    dhammapadaPlayMode: e.target.value as DhammapadaPlayMode,
                  })
                }
                className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              >
                <option value="learning">Học thuộc</option>
                <option value="random">Ngẫu nhiên</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">
                Chế độ overlay
              </label>
              <select
                value={mode}
                disabled={disabled}
                onChange={(e) =>
                  onUpdate({ dhammapadaMode: e.target.value as DhammapadaMode })
                }
                className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
              >
                <option value="withImage">Ảnh + kệ</option>
                <option value="quoteOnly">Chỉ kệ</option>
              </select>
            </div>
            {!isRandom && (
              <div>
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  Kệ mỗi ngày
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={quota}
                  disabled={disabled}
                  onChange={(e) => {
                    const n = Math.min(
                      10,
                      Math.max(1, Math.round(Number(e.target.value) || 3)),
                    );
                    onUpdate({ dhammapadaDailyQuota: n });
                  }}
                  className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                />
              </div>
            )}
            <div className={isRandom ? "col-span-2 sm:col-span-1" : "col-span-2 sm:col-span-3"}>
              <div className="mb-1 flex items-center justify-between text-xs font-medium text-stone-600">
                <span>Cỡ chữ kệ</span>
                <span>{Math.round(fontScale * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.85}
                max={1.4}
                step={0.05}
                value={fontScale}
                disabled={disabled}
                onChange={(e) =>
                  onUpdate({
                    dhammapadaFontScale: clampFontScale(Number(e.target.value)),
                  })
                }
                className="range-amber w-full"
              />
            </div>
          </div>

          {isRandom && (
            <p className="text-xs text-stone-500">
              Overlay mỗi lần hiện một kệ ngẫu nhiên trong 423 kệ — không có nút Đã nhớ / Học lại.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {!isRandom && (
              <button
                type="button"
                onClick={() => void handleReset()}
                disabled={disabled || savingProgress}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50 disabled:opacity-50"
              >
                Đặt lại tiến độ
              </button>
            )}
            <p className="text-[11px] italic text-stone-400">
              {DHAMMAPADA.sourceNote}
            </p>
          </div>
        </div>
      </SettingsSectionCard>

      <div className="dhamma-tab-main">
        <section className="dhamma-tab-reader">
          <h2 className="mb-2 text-sm font-semibold text-amber-900">
            {isRandom ? "Đọc kệ" : "Học hôm nay"}
          </h2>

          {isRandom ? (
            displayVerse ? (
              <div
                className={`dhamma-tab-card ${showVerseImage ? "dhamma-card-with-image" : ""}`}
                style={{
                  ["--dhamma-font-scale" as string]: String(fontScale),
                }}
              >
                <header className="dhamma-card-header">
                  <span className="dhamma-card-chapter">
                    {displayChapter
                      ? `Phẩm ${displayChapter.id} · ${displayChapter.name}`
                      : `Phẩm ${displayVerse.chapterId}`}
                  </span>
                  <span className="dhamma-card-verse-no">
                    Kệ {displayVerse.id}/{stats.total}
                  </span>
                </header>
                <DhammapadaVerseLayout
                  verse={displayVerse}
                  showImage={showVerseImage}
                  verseImageSrc={verseImageSrc}
                  verseImageLoading={verseImageLoading}
                />
                <div className="dhamma-card-actions">
                  <button
                    type="button"
                    className="dhamma-btn dhamma-btn-primary"
                    disabled={disabled}
                    onClick={() => {
                      const v = randomVerse(displayVerse.id);
                      if (v) {
                        setFocusVerseId(v.id);
                        setExpandedChapter(v.chapterId);
                      }
                    }}
                  >
                    Kệ ngẫu nhiên khác
                  </button>
                </div>
                <footer className="dhamma-card-source">{DHAMMAPADA.source}</footer>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-500">
                Chọn một kệ trong danh sách phẩm, hoặc bấm để xem ngẫu nhiên.
              </p>
            )
          ) : journeyComplete ? (
            <div className="dhamma-tab-done">
              <p className="dhamma-done-eyebrow">Kinh Pháp Cú</p>
              <h3 className="dhamma-done-title">Đã thuộc đủ 423 kệ</h3>
              <p className="dhamma-done-body">
                Lộ trình học thuộc đã hoàn thành. An lạc.
              </p>
              <p className="dhamma-done-stats">
                {stats.memorized}/{stats.total} kệ
              </p>
            </div>
          ) : dayComplete && !displayVerse ? (
            <div className="dhamma-tab-done">
              <p className="dhamma-done-eyebrow">Kinh Pháp Cú</p>
              <h3 className="dhamma-done-title">Hôm nay đã thuộc đủ</h3>
              <p className="dhamma-done-body">
                Mai lại tiếp tục những kệ kế tiếp. Bạn vẫn có thể duyệt toàn bộ kinh bên phải.
              </p>
              <p className="dhamma-done-stats">
                {stats.memorized}/{stats.total} kệ
              </p>
            </div>
          ) : displayVerse ? (
            <div
              className={`dhamma-tab-card ${showVerseImage ? "dhamma-card-with-image" : ""}`}
              style={{
                ["--dhamma-font-scale" as string]: String(fontScale),
              }}
            >
              <header className="dhamma-card-header">
                <span className="dhamma-card-chapter">
                  {displayChapter
                    ? `Phẩm ${displayChapter.id} · ${displayChapter.name}`
                    : `Phẩm ${displayVerse.chapterId}`}
                </span>
                <span className="dhamma-card-verse-no">
                  Kệ {displayVerse.id}/{stats.total}
                  {done.has(displayVerse.id) ? " · Đã nhớ" : ""}
                </span>
              </header>

              <DhammapadaVerseLayout
                verse={displayVerse}
                showImage={showVerseImage}
                verseImageSrc={verseImageSrc}
                verseImageLoading={verseImageLoading}
              />

              <div className="dhamma-card-progress">
                <div
                  className="dhamma-dots"
                  aria-label={`Hôm nay ${stats.todayTotal - stats.todayLeft}/${stats.todayTotal}`}
                >
                  {Array.from({ length: Math.max(stats.todayTotal, 1) }).map(
                    (_, i) => {
                      const doneToday = Math.max(
                        0,
                        stats.todayTotal - stats.todayLeft,
                      );
                      return (
                        <span
                          key={i}
                          className={`dhamma-dot ${
                            i < doneToday
                              ? "dhamma-dot-done"
                              : i === doneToday
                                ? "dhamma-dot-current"
                                : ""
                          }`}
                        />
                      );
                    },
                  )}
                </div>
                <div className="dhamma-progress-meta">
                  <span>
                    Hôm nay {Math.max(0, stats.todayTotal - stats.todayLeft)}/
                    {stats.todayTotal}
                  </span>
                  <span>
                    Tổng {stats.memorized}/{stats.total}
                  </span>
                </div>
              </div>

              <div className="dhamma-card-actions">
                {!done.has(displayVerse.id) ? (
                  <>
                    <button
                      type="button"
                      className="dhamma-btn dhamma-btn-primary"
                      disabled={disabled || savingProgress}
                      onClick={() => void handleMemorized()}
                    >
                      {savingProgress ? "Đang lưu..." : "Đã nhớ"}
                    </button>
                    {todayQueue.includes(displayVerse.id) && todayQueue.length > 1 && (
                      <button
                        type="button"
                        className="dhamma-btn dhamma-btn-ghost"
                        disabled={disabled}
                        onClick={handleSkip}
                      >
                        Học lại sau
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    className="dhamma-btn dhamma-btn-ghost"
                    disabled={disabled || savingProgress}
                    onClick={() => void handleUnmemorize(displayVerse.id)}
                  >
                    Bỏ đánh dấu đã nhớ
                  </button>
                )}
              </div>

              <footer className="dhamma-card-source">{DHAMMAPADA.source}</footer>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-500">
              Chọn một kệ trong danh sách phẩm để đọc, hoặc bật học trên overlay.
            </p>
          )}
        </section>

        <aside className="dhamma-chapter-list">
          <h2 className="mb-2 text-sm font-semibold text-amber-900">
            Duyệt theo phẩm
          </h2>
          <div className="dhamma-chapter-scroll">
            {DHAMMAPADA.chapters.map((ch) => {
              const verses = versesByChapter.get(ch.id) ?? [];
              const memorizedInCh = verses.filter((v) => done.has(v.id)).length;
              const open = expandedChapter === ch.id;
              return (
                <div key={ch.id} className="dhamma-chapter-block">
                  <button
                    type="button"
                    className={`dhamma-chapter-btn ${open ? "dhamma-chapter-btn-open" : ""}`}
                    onClick={() =>
                      setExpandedChapter(open ? null : ch.id)
                    }
                  >
                    <span className="min-w-0 flex-1 truncate text-left">
                      {ch.id}. {ch.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-stone-400">
                      {memorizedInCh}/{verses.length}
                    </span>
                  </button>
                  {open && (
                    <ul className="dhamma-verse-list">
                      {verses.map((v) => {
                        const isDone = done.has(v.id);
                        const isActive = focusVerseId === v.id;
                        return (
                          <li key={v.id}>
                            <button
                              type="button"
                              className={`dhamma-verse-item ${
                                isActive ? "dhamma-verse-item-active" : ""
                              } ${isDone ? "dhamma-verse-memorized" : ""}`}
                              onClick={() => {
                                setFocusVerseId(v.id);
                                setExpandedChapter(ch.id);
                              }}
                            >
                              <span className="dhamma-verse-check" aria-hidden>
                                {isDone ? "✓" : ""}
                              </span>
                              <span>Kệ {v.id}</span>
                              <span className="dhamma-verse-snippet">
                                {v.lines[0]?.slice(0, 36) ?? ""}
                                {(v.lines[0]?.length ?? 0) > 36 ? "…" : ""}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
