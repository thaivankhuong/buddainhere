import data from "../data/dhammapada.json";
import imageMapData from "../data/dhammapada-image-map.json";
import type { AppConfig } from "../types/config";

interface DhammapadaImageMap {
  shared: Record<string, number>;
  noImage: number[];
}

const IMAGE_MAP = imageMapData as DhammapadaImageMap;
const NO_IMAGE_SET = new Set(IMAGE_MAP.noImage ?? []);

export interface DhammapadaChapter {
  id: number;
  name: string;
  paliName?: string;
}

export interface DhammapadaVerse {
  id: number;
  chapterId: number;
  lines: string[];
}

export interface DhammapadaData {
  source: string;
  sourceNote: string;
  totalVerses: number;
  chapters: DhammapadaChapter[];
  verses: DhammapadaVerse[];
}

export const DHAMMAPADA = data as DhammapadaData;
export const DHAMMAPADA_TOTAL = DHAMMAPADA.verses.length;

export function todayDateString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getVerse(id: number): DhammapadaVerse | undefined {
  return DHAMMAPADA.verses.find((v) => v.id === id);
}

export function getChapter(id: number): DhammapadaChapter | undefined {
  return DHAMMAPADA.chapters.find((c) => c.id === id);
}

export function memorizedSet(cfg: AppConfig): Set<number> {
  return new Set(cfg.dhammapadaMemorizedIds ?? []);
}

export function unmemorizedIds(cfg: AppConfig): number[] {
  const done = memorizedSet(cfg);
  return DHAMMAPADA.verses.map((v) => v.id).filter((id) => !done.has(id));
}

export function activeTodayQueue(cfg: AppConfig): number[] {
  const done = memorizedSet(cfg);
  return (cfg.dhammapadaTodayQueue ?? []).filter((id) => !done.has(id));
}

/** Roll a new daily queue when the calendar day changes. */
export function ensureTodayQueue(cfg: AppConfig, now: Date = new Date()): AppConfig {
  const today = todayDateString(now);
  const quota = Math.min(10, Math.max(1, Math.round(cfg.dhammapadaDailyQuota || 3)));

  if (cfg.dhammapadaLearningDate === today && Array.isArray(cfg.dhammapadaTodayQueue)) {
    // Keep existing queue; drop already-memorized for active use elsewhere.
    return cfg;
  }

  const remaining = unmemorizedIds(cfg);
  const queue = remaining.slice(0, quota);

  return {
    ...cfg,
    dhammapadaDailyQuota: quota,
    dhammapadaLearningDate: today,
    dhammapadaTodayQueue: queue,
  };
}

export function nextVerseInQueue(
  cfg: AppConfig,
  afterId: number | null = null,
): DhammapadaVerse | null {
  const queue = activeTodayQueue(cfg);
  if (queue.length === 0) return null;

  if (afterId == null) {
    return getVerse(queue[0]) ?? null;
  }

  const idx = queue.indexOf(afterId);
  const nextId = idx === -1 ? queue[0] : queue[(idx + 1) % queue.length];
  return getVerse(nextId) ?? null;
}

/** Pick a random verse from the full collection (for overlay random mode). */
export function randomVerse(excludeId: number | null = null): DhammapadaVerse | null {
  const verses = DHAMMAPADA.verses;
  if (verses.length === 0) return null;
  if (verses.length === 1) return verses[0];

  let pick = verses[Math.floor(Math.random() * verses.length)];
  if (excludeId != null && pick.id === excludeId) {
    pick = verses[Math.floor(Math.random() * verses.length)];
  }
  return pick;
}

export function markMemorized(cfg: AppConfig, id: number): AppConfig {
  const ids = new Set(cfg.dhammapadaMemorizedIds ?? []);
  ids.add(id);
  return {
    ...cfg,
    dhammapadaMemorizedIds: Array.from(ids).sort((a, b) => a - b),
  };
}

export function resetProgress(cfg: AppConfig): AppConfig {
  return {
    ...cfg,
    dhammapadaMemorizedIds: [],
    dhammapadaLearningDate: null,
    dhammapadaTodayQueue: [],
  };
}

export function progressStats(cfg: AppConfig) {
  const memorized = (cfg.dhammapadaMemorizedIds ?? []).length;
  const total = DHAMMAPADA_TOTAL;
  const todayLeft = activeTodayQueue(cfg).length;
  const todayTotal = (cfg.dhammapadaTodayQueue ?? []).length || cfg.dhammapadaDailyQuota || 3;
  const percent = total === 0 ? 0 : Math.round((memorized / total) * 100);
  return {
    memorized,
    total,
    todayLeft,
    todayTotal,
    percent,
    complete: memorized >= total,
    dayComplete: cfg.dhammapadaLearningDate === todayDateString() && todayLeft === 0,
  };
}

export function clampFontScale(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(1.4, Math.max(0.85, Math.round(n * 100) / 100));
}

/**
 * Resolve which PNG file id to load for a verse.
 * Returns null when the verse has no illustration (e.g. crop_failed 135, 145).
 * Shared verses map to the primary verse's image (e.g. 4 → 3 → 003.png).
 */
export function resolveVerseImageId(verseId: number): number | null {
  if (!Number.isFinite(verseId) || verseId < 1 || verseId > DHAMMAPADA_TOTAL) {
    return null;
  }
  if (NO_IMAGE_SET.has(verseId)) return null;
  const shared = IMAGE_MAP.shared[String(verseId)];
  if (typeof shared === "number" && shared > 0) return shared;
  return verseId;
}
