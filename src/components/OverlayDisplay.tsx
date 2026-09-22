import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { playMusicFromPath } from "../hooks/useMusicPlayer";
import DhammapadaCard, { DhammapadaDoneCard } from "./DhammapadaCard";
import {
  animEnterClass,
  animExitClass,
  POSITION_CLASSES,
  type AppConfig,
  type ScheduleSlot,
  musicPath,
} from "../types/config";
import { fireKey, msUntil, nextOccurrence, parseTimeToMinutes } from "../utils/schedule";
import {
  DHAMMAPADA,
  activeTodayQueue,
  clampFontScale,
  ensureTodayQueue,
  getChapter,
  markMemorized,
  nextVerseInQueue,
  progressStats,
  randomVerse,
  resolveVerseImageId,
  type DhammapadaVerse,
} from "../utils/dhammapada";

const overlayWindow = getCurrentWindow();

type Phase = "hidden" | "entering" | "visible" | "exiting";
type CardAction = "memorized" | "skip" | "timeout";

async function showOverlayWindow() {
  await overlayWindow.show();
}

async function setClickThrough(ignore: boolean) {
  await overlayWindow.setIgnoreCursorEvents(ignore);
}

async function hideOverlayWindow() {
  await setClickThrough(true);
  await overlayWindow.hide();
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new Error("aborted"));
      },
      { once: true },
    );
  });
}

function waitForAction(
  durationMs: number,
  signal: AbortSignal,
  actionRef: { current: ((a: CardAction) => void) | null },
): Promise<CardAction> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("aborted"));
      return;
    }

    const timer = window.setTimeout(() => {
      actionRef.current = null;
      resolve("timeout");
    }, durationMs);

    const onAbort = () => {
      window.clearTimeout(timer);
      actionRef.current = null;
      reject(new Error("aborted"));
    };

    signal.addEventListener("abort", onAbort, { once: true });

    actionRef.current = (action) => {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      actionRef.current = null;
      resolve(action);
    };
  });
}

function preloadImage(src: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("aborted"));
      return;
    }

    const img = new Image();
    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(new Error("aborted"));
    };

    img.onload = () => {
      cleanup();
      resolve();
    };
    img.onerror = () => {
      cleanup();
      reject(new Error("Không tải được ảnh hiển thị"));
    };

    signal.addEventListener("abort", onAbort, { once: true });
    img.src = src;
  });
}

/** Load illustration for a Dhammapada verse (shared-map aware). */
async function loadVerseImage(
  verseId: number,
  signal: AbortSignal,
): Promise<string | null> {
  const imageId = resolveVerseImageId(verseId);
  if (imageId == null) return null;
  try {
    const dataUrl = await invoke<string | null>(
      "get_dhammapada_verse_image_display_data_url",
      { imageId },
    );
    if (signal.aborted || !dataUrl) return null;
    await preloadImage(dataUrl, signal);
    return dataUrl;
  } catch {
    return null;
  }
}

/** Load next Buddha gallery image for overlay background. */
async function loadGalleryImage(signal: AbortSignal): Promise<string | null> {
  try {
    const dataUrl = await invoke<string>("next_image_display_data_url");
    if (signal.aborted || !dataUrl) return null;
    await preloadImage(dataUrl, signal);
    return dataUrl;
  } catch {
    return null;
  }
}

function slotKeyDate(slot: ScheduleSlot, now: Date = new Date()): Date {
  const total = parseTimeToMinutes(slot.time) ?? 0;
  const date = new Date(now);
  date.setHours(Math.floor(total / 60), total % 60, 0, 0);
  return date;
}

async function persistConfig(cfg: AppConfig) {
  await invoke("save_app_config", { config: cfg });
}

export default function OverlayDisplay() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [verseImageSrc, setVerseImageSrc] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("hidden");
  const [fadeMs, setFadeMs] = useState(1500);
  const [position, setPosition] = useState<AppConfig["imagePosition"]>("center");
  const [animIn, setAnimIn] = useState<AppConfig["animationIn"]>("fadeIn");
  const [animOut, setAnimOut] = useState<AppConfig["animationOut"]>("fadeOut");
  const [showDhamma, setShowDhamma] = useState(false);
  const [dhammaMode, setDhammaMode] = useState<AppConfig["dhammapadaMode"]>("withImage");
  const [dhammaPlayMode, setDhammaPlayMode] =
    useState<AppConfig["dhammapadaPlayMode"]>("learning");
  const [activeVerse, setActiveVerse] = useState<DhammapadaVerse | null>(null);
  const [doneKind, setDoneKind] = useState<"day" | "journey" | null>(null);
  const [fontScale, setFontScale] = useState(1);
  const [stats, setStats] = useState({
    memorized: 0,
    total: DHAMMAPADA.totalVerses,
    todayLeft: 0,
    todayTotal: 3,
    percent: 0,
  });

  const cycleRef = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const firedKeysRef = useRef<Set<string>>(new Set());
  const scheduleTimersRef = useRef<number[]>([]);
  const scheduleConfigRef = useRef<AppConfig | null>(null);
  const armScheduleTimersRef = useRef<() => Promise<void>>(async () => undefined);
  const restartCycleRef = useRef<() => void>(() => undefined);
  const cardActionRef = useRef<((a: CardAction) => void) | null>(null);
  const currentVerseIdRef = useRef<number | null>(null);
  const configRef = useRef<AppConfig | null>(null);
  const savingRef = useRef(false);
  const skipRestartUntilRef = useRef(0);

  const stopMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const playMusic = useCallback(async (cfg: AppConfig) => {
    const path = musicPath(cfg);
    if (!cfg.musicEnabled || !path) {
      stopMusic();
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await playMusicFromPath(audio, path, cfg.musicVolume, true);
    } catch {
      stopMusic();
    }
  }, [stopMusic]);

  const applyVisuals = useCallback((cfg: AppConfig) => {
    setFadeMs(cfg.fadeMs);
    setPosition(cfg.imagePosition);
    setAnimIn(cfg.animationIn);
    setAnimOut(cfg.animationOut);
    setDhammaMode(cfg.dhammapadaMode ?? "withImage");
    setDhammaPlayMode(cfg.dhammapadaPlayMode ?? "learning");
    setFontScale(clampFontScale(cfg.dhammapadaFontScale ?? 1));
  }, []);

  const syncStats = useCallback((cfg: AppConfig) => {
    const s = progressStats(cfg);
    setStats({
      memorized: s.memorized,
      total: s.total,
      todayLeft: s.todayLeft,
      todayTotal: Math.max(s.todayTotal, cfg.dhammapadaDailyQuota || 3),
      percent: s.percent,
    });
  }, []);

  const saveQuiet = useCallback(async (cfg: AppConfig) => {
    if (savingRef.current) return;
    savingRef.current = true;
    skipRestartUntilRef.current = Date.now() + 800;
    try {
      configRef.current = cfg;
      scheduleConfigRef.current = cfg;
      await persistConfig(cfg);
      syncStats(cfg);
    } finally {
      savingRef.current = false;
    }
  }, [syncStats]);

  const displayImageOnly = useCallback(
    async (cfg: AppConfig, durationSecs: number, signal: AbortSignal) => {
      applyVisuals(cfg);
      setShowDhamma(false);
      setActiveVerse(null);
      setDoneKind(null);
      setVerseImageSrc(null);
      currentVerseIdRef.current = null;

      const dataUrl = await invoke<string>("next_image_display_data_url");
      if (signal.aborted) return;

      await preloadImage(dataUrl, signal);
      if (signal.aborted) return;

      setImageSrc(dataUrl);
      setPhase("hidden");
      await sleep(80, signal);

      await showOverlayWindow();
      await setClickThrough(true);
      setPhase("entering");
      await playMusic(cfg);
      await sleep(cfg.fadeMs, signal);
      setPhase("visible");
      await sleep(durationSecs * 1000, signal);

      setPhase("exiting");
      await sleep(cfg.fadeMs, signal);
      stopMusic();
      setPhase("hidden");
      await hideOverlayWindow();
    },
    [applyVisuals, playMusic, stopMusic],
  );

  const displayDhammaSession = useCallback(
    async (cfgIn: AppConfig, durationSecs: number, signal: AbortSignal) => {
      const playMode = cfgIn.dhammapadaPlayMode ?? "learning";
      const quoteOnly = (cfgIn.dhammapadaMode ?? "withImage") === "quoteOnly";

      // —— Random: one random verse per cycle, no memorize/skip ——
      if (playMode === "random") {
        configRef.current = cfgIn;
        applyVisuals(cfgIn);
        syncStats(cfgIn);

        const verse = randomVerse(currentVerseIdRef.current);
        if (!verse) {
          await displayImageOnly(cfgIn, durationSecs, signal);
          return;
        }

        const galleryUrl = await loadGalleryImage(signal);
        if (signal.aborted) return;

        let verseUrl: string | null = null;
        if (!quoteOnly) {
          verseUrl = await loadVerseImage(verse.id, signal);
          if (signal.aborted) return;
        }

        currentVerseIdRef.current = verse.id;
        setImageSrc(galleryUrl);
        setVerseImageSrc(verseUrl);
        setShowDhamma(true);
        setActiveVerse(verse);
        setDoneKind(null);
        setPhase("hidden");
        await sleep(80, signal);

        await showOverlayWindow();
        await setClickThrough(true);

        setPhase("entering");
        await playMusic(cfgIn);
        await sleep(cfgIn.fadeMs, signal);
        setPhase("visible");
        await sleep(durationSecs * 1000, signal);
        setPhase("exiting");
        await sleep(cfgIn.fadeMs, signal);
        stopMusic();

        currentVerseIdRef.current = null;
        setPhase("hidden");
        setShowDhamma(false);
        setActiveVerse(null);
        setVerseImageSrc(null);
        await hideOverlayWindow();
        return;
      }

      // —— Learning mode ——
      let cfg = ensureTodayQueue(cfgIn);
      if (
        cfg.dhammapadaLearningDate !== cfgIn.dhammapadaLearningDate ||
        JSON.stringify(cfg.dhammapadaTodayQueue) !== JSON.stringify(cfgIn.dhammapadaTodayQueue)
      ) {
        await saveQuiet(cfg);
      }

      configRef.current = cfg;
      applyVisuals(cfg);
      syncStats(cfg);

      const statsNow = progressStats(cfg);

      if (statsNow.complete) {
        const galleryUrl = await loadGalleryImage(signal);
        if (signal.aborted) return;
        setShowDhamma(true);
        setActiveVerse(null);
        setDoneKind("journey");
        setImageSrc(galleryUrl);
        setVerseImageSrc(null);
        setPhase("hidden");
        await sleep(80, signal);
        await showOverlayWindow();
        await setClickThrough(true);
        setPhase("entering");
        await sleep(cfg.fadeMs, signal);
        setPhase("visible");
        await sleep(Math.min(durationSecs, 8) * 1000, signal);
        setPhase("exiting");
        await sleep(cfg.fadeMs, signal);
        setPhase("hidden");
        setShowDhamma(false);
        setDoneKind(null);
        await hideOverlayWindow();
        return;
      }

      let queue = activeTodayQueue(cfg);
      if (queue.length === 0) {
        // Day complete — gallery + done card if quoteOnly, else image-only.
        if (quoteOnly) {
          const galleryUrl = await loadGalleryImage(signal);
          if (signal.aborted) return;
          setShowDhamma(true);
          setActiveVerse(null);
          setDoneKind("day");
          setImageSrc(galleryUrl);
          setVerseImageSrc(null);
          setPhase("hidden");
          await sleep(80, signal);
          await showOverlayWindow();
          await setClickThrough(true);
          setPhase("entering");
          await sleep(cfg.fadeMs, signal);
          setPhase("visible");
          await sleep(Math.min(durationSecs, 6) * 1000, signal);
          setPhase("exiting");
          await sleep(cfg.fadeMs, signal);
          setPhase("hidden");
          setShowDhamma(false);
          setDoneKind(null);
          await hideOverlayWindow();
          return;
        }
        await displayImageOnly(cfg, durationSecs, signal);
        return;
      }

      let verse = nextVerseInQueue(cfg);
      if (!verse) {
        await displayImageOnly(cfg, durationSecs, signal);
        return;
      }

      // Gallery background once per cycle; verse illustration per verse
      const galleryUrl = await loadGalleryImage(signal);
      if (signal.aborted) return;
      setImageSrc(galleryUrl);

      if (!quoteOnly) {
        const verseUrl = await loadVerseImage(verse.id, signal);
        if (signal.aborted) return;
        setVerseImageSrc(verseUrl);
      } else {
        setVerseImageSrc(null);
      }

      setShowDhamma(true);
      setDoneKind(null);
      setPhase("hidden");
      await sleep(80, signal);

      await showOverlayWindow();

      // Rotate through today's queue until timeout path ends one show,
      // or until queue empties via memorize.
      while (!signal.aborted && verse) {
        currentVerseIdRef.current = verse.id;
        setActiveVerse(verse);
        syncStats(cfg);
        await setClickThrough(false);

        setPhase("entering");
        await playMusic(cfg);
        await sleep(cfg.fadeMs, signal);
        setPhase("visible");

        const action = await waitForAction(durationSecs * 1000, signal, cardActionRef);

        setPhase("exiting");
        await sleep(cfg.fadeMs, signal);
        stopMusic();

        if (action === "memorized") {
          cfg = markMemorized(cfg, verse.id);
          await saveQuiet(cfg);
          queue = activeTodayQueue(cfg);
          if (queue.length === 0) {
            setActiveVerse(null);
            currentVerseIdRef.current = null;
            setVerseImageSrc(null);
            setDoneKind(progressStats(cfg).complete ? "journey" : "day");
            setPhase("entering");
            await sleep(cfg.fadeMs, signal);
            setPhase("visible");
            await sleep(3500, signal);
            setPhase("exiting");
            await sleep(cfg.fadeMs, signal);
            break;
          }
          verse = nextVerseInQueue(cfg);
          setPhase("hidden");
          await sleep(120, signal);
          if (verse && !quoteOnly) {
            const verseUrl = await loadVerseImage(verse.id, signal);
            if (signal.aborted) return;
            setVerseImageSrc(verseUrl);
          }
          continue;
        }

        if (action === "skip") {
          verse = nextVerseInQueue(cfg, verse.id);
          setPhase("hidden");
          await sleep(120, signal);
          if (verse && !quoteOnly) {
            const verseUrl = await loadVerseImage(verse.id, signal);
            if (signal.aborted) return;
            setVerseImageSrc(verseUrl);
          }
          continue;
        }

        // timeout — end this display cycle
        break;
      }

      currentVerseIdRef.current = null;
      setPhase("hidden");
      setShowDhamma(false);
      setActiveVerse(null);
      setDoneKind(null);
      setVerseImageSrc(null);
      await hideOverlayWindow();
    },
    [applyVisuals, displayImageOnly, playMusic, saveQuiet, stopMusic, syncStats],
  );

  const displayOnce = useCallback(
    async (cfg: AppConfig, durationSecs: number, signal: AbortSignal) => {
      if (cfg.dhammapadaEnabled) {
        await displayDhammaSession(cfg, durationSecs, signal);
      } else {
        await displayImageOnly(cfg, durationSecs, signal);
      }
    },
    [displayDhammaSession, displayImageOnly],
  );

  const runCycle = useCallback(async (signal: AbortSignal) => {
    const cycleId = ++cycleRef.current;

    while (!signal.aborted && cycleId === cycleRef.current) {
      try {
        let cfg = await invoke<AppConfig>("get_config");
        if (signal.aborted || cycleId !== cycleRef.current) break;

        if (cfg.dhammapadaEnabled && (cfg.dhammapadaPlayMode ?? "learning") === "learning") {
          const rolled = ensureTodayQueue(cfg);
          if (
            rolled.dhammapadaLearningDate !== cfg.dhammapadaLearningDate ||
            JSON.stringify(rolled.dhammapadaTodayQueue) !== JSON.stringify(cfg.dhammapadaTodayQueue)
          ) {
            await saveQuiet(rolled);
            cfg = rolled;
          }
        }

        scheduleConfigRef.current = cfg;
        configRef.current = cfg;
        applyVisuals(cfg);
        syncStats(cfg);

        if (!cfg.overlayEnabled) {
          setPhase("hidden");
          setImageSrc(null);
          setVerseImageSrc(null);
          setShowDhamma(false);
          setActiveVerse(null);
          stopMusic();
          await hideOverlayWindow();
          await sleep(500, signal);
          continue;
        }

        await displayOnce(cfg, cfg.visibleSecs, signal);
        if (signal.aborted || cycleId !== cycleRef.current) break;

        await sleep(cfg.hiddenSecs * 1000, signal);
      } catch (err) {
        if (signal.aborted || cycleId !== cycleRef.current) break;
        console.error("Overlay cycle error:", err);
        setPhase("hidden");
        setImageSrc(null);
        setVerseImageSrc(null);
        setShowDhamma(false);
        stopMusic();
        await hideOverlayWindow().catch(() => undefined);
        try {
          await sleep(3000, signal);
        } catch {
          break;
        }
      }
    }
  }, [applyVisuals, displayOnce, saveQuiet, stopMusic, syncStats]);

  const restartCycle = useCallback(() => {
    activeController.current?.abort();
    cardActionRef.current = null;
    setPhase("hidden");
    setShowDhamma(false);
    setActiveVerse(null);
    setDoneKind(null);
    stopMusic();
    hideOverlayWindow().catch(() => undefined);
    const controller = new AbortController();
    activeController.current = controller;
    void runCycle(controller.signal);
  }, [runCycle, stopMusic]);

  restartCycleRef.current = restartCycle;

  const clearScheduleTimers = useCallback(() => {
    for (const id of scheduleTimersRef.current) {
      window.clearTimeout(id);
    }
    scheduleTimersRef.current = [];
  }, []);

  const fireScheduleSlot = useCallback(
    async (slot: ScheduleSlot) => {
      const key = fireKey(slot, slotKeyDate(slot));
      if (firedKeysRef.current.has(key)) return;
      firedKeysRef.current.add(key);

      if (firedKeysRef.current.size > 200) {
        const entries = Array.from(firedKeysRef.current);
        firedKeysRef.current = new Set(entries.slice(-100));
        firedKeysRef.current.add(key);
      }

      let cfg = scheduleConfigRef.current;
      try {
        cfg = await invoke<AppConfig>("get_config");
        scheduleConfigRef.current = cfg;
      } catch {
        return;
      }

      if (!cfg.overlayEnabled || !cfg.scheduleEnabled || !slot.enabled) return;

      activeController.current?.abort();
      cycleRef.current += 1;
      stopMusic();

      const controller = new AbortController();
      activeController.current = controller;

      try {
        await displayOnce(cfg, slot.durationSecs, controller.signal);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Schedule display error:", err);
        }
      }

      if (!controller.signal.aborted) {
        restartCycle();
      }

      void armScheduleTimersRef.current();
    },
    [displayOnce, restartCycle, stopMusic],
  );

  const armScheduleTimers = useCallback(async () => {
    clearScheduleTimers();

    let cfg: AppConfig;
    try {
      cfg = await invoke<AppConfig>("get_config");
      scheduleConfigRef.current = cfg;
    } catch {
      return;
    }

    if (!cfg.scheduleEnabled || !cfg.overlayEnabled) return;

    const now = new Date();
    for (const slot of cfg.scheduleSlots) {
      if (!slot.enabled) continue;
      const next = nextOccurrence(slot, now);
      if (!next) continue;

      const delay = msUntil(next, now);
      const timerId = window.setTimeout(() => {
        void fireScheduleSlot(slot);
      }, delay);
      scheduleTimersRef.current.push(timerId);
    }
  }, [clearScheduleTimers, fireScheduleSlot]);

  armScheduleTimersRef.current = armScheduleTimers;

  const handleMemorizeCurrent = useCallback(async () => {
    const cfgNow = configRef.current;
    if ((cfgNow?.dhammapadaPlayMode ?? "learning") === "random") return;

    if (cardActionRef.current) {
      cardActionRef.current("memorized");
      return;
    }
    const id = currentVerseIdRef.current;
    let cfg = configRef.current;
    if (!id || !cfg) {
      try {
        cfg = await invoke<AppConfig>("get_config");
      } catch {
        return;
      }
    }
    if (!cfg || !id) return;
    if ((cfg.dhammapadaPlayMode ?? "learning") === "random") return;
    const updated = markMemorized(ensureTodayQueue(cfg), id);
    await saveQuiet(updated);
  }, [saveQuiet]);

  useEffect(() => {
    document.documentElement.classList.add("overlay-root");
    document.body.classList.add("overlay-root");
    hideOverlayWindow().catch(() => undefined);
    return () => {
      document.documentElement.classList.remove("overlay-root");
      document.body.classList.remove("overlay-root");
      hideOverlayWindow().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    restartCycle();
    void armScheduleTimers();

    const cleanups: Array<() => void> = [];

    listen("config-changed", () => {
      if (savingRef.current || Date.now() < skipRestartUntilRef.current) return;
      restartCycleRef.current();
      void armScheduleTimersRef.current();
    })
      .then((fn) => cleanups.push(fn))
      .catch(() => undefined);

    listen("overlay-next", () => restartCycleRef.current())
      .then((fn) => cleanups.push(fn))
      .catch(() => undefined);

    listen("dhammapada-memorize-current", () => {
      void handleMemorizeCurrent();
    })
      .then((fn) => cleanups.push(fn))
      .catch(() => undefined);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void armScheduleTimersRef.current();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cycleRef.current += 1;
      activeController.current?.abort();
      stopMusic();
      clearScheduleTimers();
      document.removeEventListener("visibilitychange", onVisibility);
      cleanups.forEach((fn) => fn());
    };
  }, [armScheduleTimers, clearScheduleTimers, handleMemorizeCurrent, restartCycle, stopMusic]);

  const animClass =
    phase === "entering"
      ? animEnterClass(animIn)
      : phase === "exiting"
        ? animExitClass(animOut)
        : "";

  const showGalleryImage = phase !== "hidden" && Boolean(imageSrc);
  const cardPhase = phase === "hidden" ? "visible" : phase;

  return (
    <>
      <audio ref={audioRef} className="hidden" />
      <div
        className={`overlay-shell pointer-events-none fixed inset-0 flex ${POSITION_CLASSES[position]}`}
      >
        {imageSrc && showGalleryImage && (
          <img
            src={imageSrc}
            alt=""
            draggable={false}
            className={`overlay-image overlay-image-animated max-h-[92vh] max-w-[92vw] object-contain drop-shadow-2xl ${animClass}`}
            style={{ animationDuration: `${fadeMs}ms` }}
          />
        )}
      </div>

      {showDhamma && activeVerse && phase !== "hidden" && (
        <DhammapadaCard
          verse={activeVerse}
          chapter={getChapter(activeVerse.chapterId)}
          fontScale={fontScale}
          todayLeft={stats.todayLeft}
          todayTotal={stats.todayTotal}
          memorized={stats.memorized}
          total={stats.total}
          source={DHAMMAPADA.source}
          fadeMs={fadeMs}
          playMode={dhammaPlayMode}
          showVerseImage={dhammaMode === "withImage"}
          verseImageSrc={verseImageSrc}
          phase={cardPhase === "exiting" ? "exiting" : cardPhase === "entering" ? "entering" : "visible"}
          onMemorized={() => cardActionRef.current?.("memorized")}
          onSkip={() => cardActionRef.current?.("skip")}
        />
      )}

      {showDhamma && doneKind && phase !== "hidden" && !activeVerse && (
        <DhammapadaDoneCard
          kind={doneKind}
          memorized={stats.memorized}
          total={stats.total}
          fadeMs={fadeMs}
          phase={cardPhase === "exiting" ? "exiting" : cardPhase === "entering" ? "entering" : "visible"}
          source={DHAMMAPADA.source}
        />
      )}
    </>
  );
}
