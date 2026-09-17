export type ImagePosition =
  | "topLeft"
  | "topCenter"
  | "topRight"
  | "centerLeft"
  | "center"
  | "centerRight"
  | "bottomLeft"
  | "bottomCenter"
  | "bottomRight";

export type AnimationIn =
  | "fadeIn"
  | "slideInTop"
  | "slideInBottom"
  | "slideInLeft"
  | "slideInRight"
  | "zoomIn"
  | "zoomInRotate"
  | "bounceIn"
  | "blurIn"
  | "flipInX"
  | "flipInY"
  | "scaleUp";

export type AnimationOut =
  | "fadeOut"
  | "slideOutTop"
  | "slideOutBottom"
  | "slideOutLeft"
  | "slideOutRight"
  | "zoomOut"
  | "zoomOutRotate"
  | "bounceOut"
  | "blurOut"
  | "flipOutX"
  | "flipOutY"
  | "scaleDown";

export interface ImageGroup {
  id: string;
  name: string;
}

export interface MusicTrack {
  id: string;
  path: string;
  displayName: string;
}

export interface AppConfig {
  imageDir: string;
  visibleSecs: number;
  hiddenSecs: number;
  fadeMs: number;
  randomMode: boolean;
  overlayEnabled: boolean;
  imagePosition: ImagePosition;
  animationIn: AnimationIn;
  animationOut: AnimationOut;
  selectedImages: string[];
  musicEnabled: boolean;
  musicPath: string | null;
  musicVolume: number;
  imageGroups: ImageGroup[];
  imageGroupAssignments: Record<string, string>;
  musicTracks: MusicTrack[];
  activeMusicId: string | null;
  overlayMonitorId: string | null;
}

export interface MonitorInfo {
  id: string;
  label: string;
  isPrimary: boolean;
  width: number;
  height: number;
}

export function activeMusicTrack(config: AppConfig): MusicTrack | null {
  if (!config.activeMusicId) return null;
  return config.musicTracks.find((t) => t.id === config.activeMusicId) ?? null;
}

export function musicPath(config: AppConfig): string | null {
  return activeMusicTrack(config)?.path ?? config.musicPath ?? null;
}

export function newId(): string {
  return `${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
}

export const IMAGE_POSITIONS: { value: ImagePosition; label: string }[] = [
  { value: "topLeft", label: "Góc trên trái" },
  { value: "topCenter", label: "Giữa trên" },
  { value: "topRight", label: "Góc trên phải" },
  { value: "centerLeft", label: "Giữa trái" },
  { value: "center", label: "Ở giữa" },
  { value: "centerRight", label: "Giữa phải" },
  { value: "bottomLeft", label: "Góc dưới trái" },
  { value: "bottomCenter", label: "Giữa dưới" },
  { value: "bottomRight", label: "Góc dưới phải" },
];

export const POSITION_CLASSES: Record<ImagePosition, string> = {
  topLeft: "items-start justify-start p-6",
  topCenter: "items-start justify-center p-6",
  topRight: "items-start justify-end p-6",
  centerLeft: "items-center justify-start p-6",
  center: "items-center justify-center",
  centerRight: "items-center justify-end p-6",
  bottomLeft: "items-end justify-start p-6",
  bottomCenter: "items-end justify-center p-6",
  bottomRight: "items-end justify-end p-6",
};

export const ANIMATION_IN_OPTIONS: { value: AnimationIn; label: string }[] = [
  { value: "fadeIn", label: "Fade in (mờ dần hiện)" },
  { value: "slideInTop", label: "Trượt từ trên" },
  { value: "slideInBottom", label: "Trượt từ dưới" },
  { value: "slideInLeft", label: "Trượt từ trái" },
  { value: "slideInRight", label: "Trượt từ phải" },
  { value: "zoomIn", label: "Phóng to" },
  { value: "zoomInRotate", label: "Phóng to + xoay" },
  { value: "bounceIn", label: "Nảy vào" },
  { value: "blurIn", label: "Mờ dần rõ" },
  { value: "flipInX", label: "Lật ngang" },
  { value: "flipInY", label: "Lật dọc" },
  { value: "scaleUp", label: "Phóng lớn dần" },
];

export const ANIMATION_OUT_OPTIONS: { value: AnimationOut; label: string }[] = [
  { value: "fadeOut", label: "Fade out (mờ dần ẩn)" },
  { value: "slideOutTop", label: "Trượt lên" },
  { value: "slideOutBottom", label: "Trượt xuống" },
  { value: "slideOutLeft", label: "Trượt sang trái" },
  { value: "slideOutRight", label: "Trượt sang phải" },
  { value: "zoomOut", label: "Thu nhỏ" },
  { value: "zoomOutRotate", label: "Thu nhỏ + xoay" },
  { value: "bounceOut", label: "Nảy ra" },
  { value: "blurOut", label: "Rõ dần mờ" },
  { value: "flipOutX", label: "Lật ngang ra" },
  { value: "flipOutY", label: "Lật dọc ra" },
  { value: "scaleDown", label: "Thu nhỏ dần" },
];

export const VISIBLE_OPTIONS = [
  { label: "10 giây (test)", value: 10 },
  { label: "30 giây", value: 30 },
  { label: "1 phút", value: 60 },
  { label: "5 phút", value: 300 },
  { label: "30 phút", value: 1800 },
];

export const HIDDEN_OPTIONS = [
  { label: "10 giây (test)", value: 10 },
  { label: "30 giây", value: 30 },
  { label: "1 phút", value: 60 },
  { label: "5 phút", value: 300 },
  { label: "30 phút", value: 1800 },
];

export function animEnterClass(anim: AnimationIn): string {
  return `anim-${anim}-enter`;
}

export function animExitClass(anim: AnimationOut): string {
  return `anim-${anim}-exit`;
}

