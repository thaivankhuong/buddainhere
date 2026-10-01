import { convertFileSrc, invoke } from "@tauri-apps/api/core";

export function toAssetUrl(filePath: string): string {
  return convertFileSrc(filePath);
}

async function fallbackDataUrl(
  label: string,
  load: () => Promise<string | null>,
): Promise<string | null> {
  try {
    const url = await load();
    if (url) {
      console.warn(`[${label}] dùng data URL fallback`);
    }
    return url;
  } catch (err) {
    console.error(`[${label}] data URL fallback thất bại:`, err);
    return null;
  }
}

/** Gallery image: asset URL ưu tiên, data URL fallback. */
export async function resolveGalleryImageSrc(
  signal: AbortSignal,
): Promise<string | null> {
  if (signal.aborted) return null;
  try {
    const filePath = await invoke<string>("next_image_display_path");
    if (!filePath) return null;
    return toAssetUrl(filePath);
  } catch (err) {
    console.error("[gallery] asset path thất bại:", err);
    if (signal.aborted) return null;
    return fallbackDataUrl("gallery", () =>
      invoke<string>("next_image_display_data_url"),
    );
  }
}

/** Verse illustration: asset URL ưu tiên, data URL fallback. */
export async function resolveVerseImageSrc(
  imageId: number,
  signal: AbortSignal,
): Promise<string | null> {
  if (signal.aborted) return null;
  try {
    const filePath = await invoke<string | null>(
      "get_dhammapada_verse_image_display_path",
      { imageId },
    );
    if (!filePath) return null;
    return toAssetUrl(filePath);
  } catch (err) {
    console.error(`[verse-${imageId}] asset path thất bại:`, err);
    if (signal.aborted) return null;
    return fallbackDataUrl(`verse-${imageId}`, () =>
      invoke<string | null>("get_dhammapada_verse_image_display_data_url", {
        imageId,
      }),
    );
  }
}
