import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { playMusicFromPath } from "../hooks/useMusicPlayer";
import {
  animEnterClass,
  animExitClass,
  POSITION_CLASSES,
  type AppConfig,
  musicPath,
} from "../types/config";

const overlayWindow = getCurrentWindow();

type Phase = "hidden" | "entering" | "visible" | "exiting";

async function showOverlayWindow() {
  await overlayWindow.show();
  await overlayWindow.setIgnoreCursorEvents(true);
}

async function hideOverlayWindow() {
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

export default function OverlayDisplay() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("hidden");
  const [fadeMs, setFadeMs] = useState(1500);
  const [position, setPosition] = useState<AppConfig["imagePosition"]>("center");
  const [animIn, setAnimIn] = useState<AppConfig["animationIn"]>("fadeIn");
  const [animOut, setAnimOut] = useState<AppConfig["animationOut"]>("fadeOut");
  const cycleRef = useRef(0);
  const activeController = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const runCycle = useCallback(async (signal: AbortSignal) => {
    const cycleId = ++cycleRef.current;

    while (!signal.aborted && cycleId === cycleRef.current) {
      try {
        const cfg = await invoke<AppConfig>("get_config");
        if (signal.aborted || cycleId !== cycleRef.current) break;

        setFadeMs(cfg.fadeMs);
        setPosition(cfg.imagePosition);
        setAnimIn(cfg.animationIn);
        setAnimOut(cfg.animationOut);

        if (!cfg.overlayEnabled) {
          setPhase("hidden");
          setImageSrc(null);
          stopMusic();
          await hideOverlayWindow();
          await sleep(500, signal);
          continue;
        }

        const dataUrl = await invoke<string>("next_image_display_data_url");
        if (signal.aborted || cycleId !== cycleRef.current) break;

        await preloadImage(dataUrl, signal);
        if (signal.aborted || cycleId !== cycleRef.current) break;

        setImageSrc(dataUrl);
        setPhase("hidden");
        await sleep(80, signal);

        await showOverlayWindow();
        setPhase("entering");
        await playMusic(cfg);
        await sleep(cfg.fadeMs, signal);
        setPhase("visible");
        await sleep(cfg.visibleSecs * 1000, signal);

        setPhase("exiting");
        await sleep(cfg.fadeMs, signal);
        stopMusic();
        setPhase("hidden");
        await hideOverlayWindow();
        await sleep(cfg.hiddenSecs * 1000, signal);
      } catch (err) {
        if (signal.aborted || cycleId !== cycleRef.current) break;
        console.error("Overlay cycle error:", err);
        setPhase("hidden");
        setImageSrc(null);
        stopMusic();
        await hideOverlayWindow().catch(() => undefined);
        try {
          await sleep(3000, signal);
        } catch {
          break;
        }
      }
    }
  }, [playMusic, stopMusic]);

  const restartCycle = useCallback(() => {
    activeController.current?.abort();
    setPhase("hidden");
    stopMusic();
    hideOverlayWindow().catch(() => undefined);
    const controller = new AbortController();
    activeController.current = controller;
    void runCycle(controller.signal);
  }, [runCycle, stopMusic]);

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

    const cleanups: Array<() => void> = [];

    listen("config-changed", () => restartCycle())
      .then((fn) => cleanups.push(fn))
      .catch(() => undefined);

    listen("overlay-next", () => restartCycle())
      .then((fn) => cleanups.push(fn))
      .catch(() => undefined);

    return () => {
      cycleRef.current += 1;
      activeController.current?.abort();
      stopMusic();
      cleanups.forEach((fn) => fn());
    };
  }, [restartCycle, stopMusic]);

  const animClass =
    phase === "entering"
      ? animEnterClass(animIn)
      : phase === "exiting"
        ? animExitClass(animOut)
        : "";

  const showImage = phase !== "hidden";

  return (
    <>
      <audio ref={audioRef} className="hidden" />
      <div
        className={`overlay-shell pointer-events-none fixed inset-0 flex ${POSITION_CLASSES[position]}`}
      >
        {imageSrc && showImage && (
          <img
            src={imageSrc}
            alt=""
            draggable={false}
            className={`overlay-image overlay-image-animated max-h-[92vh] max-w-[92vw] object-contain drop-shadow-2xl ${animClass}`}
            style={{ animationDuration: `${fadeMs}ms` }}
          />
        )}
      </div>
    </>
  );
}
