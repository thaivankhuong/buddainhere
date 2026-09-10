import { useCallback, useEffect, useRef, useState } from "react";
import {
  animEnterClass,
  animExitClass,
  type AppConfig,
  type ImagePosition,
} from "../types/config";

const PREVIEW_POSITION: Record<ImagePosition, string> = {
  topLeft: "items-start justify-start p-2",
  topCenter: "items-start justify-center p-2",
  topRight: "items-start justify-end p-2",
  centerLeft: "items-center justify-start p-2",
  center: "items-center justify-center p-2",
  centerRight: "items-center justify-end p-2",
  bottomLeft: "items-end justify-start p-2",
  bottomCenter: "items-end justify-center p-2",
  bottomRight: "items-end justify-end p-2",
};
import { useImageThumbnail } from "../hooks/useImageDataUrl";
import DharmaSpinner from "./DharmaSpinner";
import SettingsSectionCard from "./SettingsSectionCard";
import { IconPreview } from "./SettingsIcons";

type Phase = "idle" | "entering" | "visible" | "exiting";

interface Props {
  config: AppConfig;
  previewImage: string | null;
}

export default function SettingsPreview({ config, previewImage }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const timerRef = useRef<number | null>(null);
  const { src: previewSrc, loading } = useImageThumbnail(previewImage);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  function runPreview() {
    clearTimer();
    setPhase("entering");
    timerRef.current = window.setTimeout(() => {
      setPhase("visible");
      timerRef.current = window.setTimeout(() => {
        setPhase("exiting");
        timerRef.current = window.setTimeout(() => setPhase("idle"), config.fadeMs);
      }, 1500);
    }, config.fadeMs);
  }

  const animClass =
    phase === "entering"
      ? animEnterClass(config.animationIn)
      : phase === "exiting"
        ? animExitClass(config.animationOut)
        : "";

  const showImage = phase !== "idle" && previewSrc;

  return (
    <SettingsSectionCard icon={<IconPreview />} title="Xem trước">
      <div className={`preview-desktop flex w-full max-w-full ${PREVIEW_POSITION[config.imagePosition]}`}>
        {showImage ? (
          <img
            src={previewSrc}
            alt="Xem trước"
            className={`preview-mockup-image overlay-image-animated drop-shadow-lg ${animClass}`}
            style={{ animationDuration: `${config.fadeMs}ms` }}
          />
        ) : previewSrc ? (
          <img
            src={previewSrc}
            alt="Xem trước"
            className="preview-mockup-image drop-shadow-lg opacity-90"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-stone-400">
            {loading ? (
              <DharmaSpinner label="Đang tải preview..." />
            ) : previewImage ? (
              "Chưa có preview"
            ) : (
              "Chưa có ảnh trong kho"
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runPreview}
          disabled={!previewImage || loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-50 disabled:opacity-50"
        >
          <span aria-hidden="true">▶</span>
          Xem thử
        </button>
        <p className="text-xs text-stone-500">
          Vị trí: <span className="text-stone-700">{config.imagePosition}</span>
          {" · "}
          Vào: <span className="text-stone-700">{config.animationIn}</span>
          {" · "}
          Ra: <span className="text-stone-700">{config.animationOut}</span>
        </p>
      </div>
    </SettingsSectionCard>
  );
}
