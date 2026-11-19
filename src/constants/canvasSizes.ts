import type { AspectRatio, CanvasPreset, CanvasSize } from '@/types';
import { clamp } from '@/utils/math';

/** Every canvas is 1080 design units wide; gaps, text and blur are stored in these units. */
export const DESIGN_WIDTH = 1080;

/** Limits for typed or dragged sizes. */
export const MIN_SIDE = 100;
export const MAX_SIDE = 4096;
/** Widest / tallest allowed shape (4:1 and 1:4). */
export const MAX_RATIO = 4;

const ratio = (id: string, w: number, h: number, hint: string): CanvasPreset => ({
  id,
  label: id,
  hint,
  group: 'ratio',
  width: w,
  height: h,
});

const platform = (id: string, label: string, w: number, h: number): CanvasPreset => ({
  id,
  label,
  hint: `${w} × ${h}`,
  group: 'platform',
  width: w,
  height: h,
});

export const RATIO_PRESETS: CanvasPreset[] = [
  ratio('4:5', 1080, 1350, 'Feed'),
  ratio('1:1', 1080, 1080, 'Square'),
  ratio('3:4', 1080, 1440, 'Portrait'),
  ratio('2:3', 1080, 1620, 'Tall'),
  ratio('16:9', 1920, 1080, 'Wide'),
  ratio('9:16', 1080, 1920, 'Story'),
];

/** Recommended upload sizes per platform. */
export const PLATFORM_PRESETS: CanvasPreset[] = [
  platform('x-tall', 'X post · tall', 1080, 1350),
  platform('x-wide', 'X post · wide', 1600, 900),
  platform('x-header', 'X header', 1500, 500),
  platform('ig-post', 'Instagram post', 1080, 1350),
  platform('ig-square', 'Instagram square', 1080, 1080),
  platform('story', 'Story · Reels · TikTok', 1080, 1920),
  platform('yt-thumb', 'YouTube thumbnail', 1280, 720),
  platform('pinterest', 'Pinterest pin', 1000, 1500),
];

const ALL_PRESETS = [...RATIO_PRESETS, ...PLATFORM_PRESETS];

export const fromPreset = (preset: CanvasPreset): CanvasSize => ({
  presetId: preset.id,
  width: preset.width,
  height: preset.height,
  exact: preset.group === 'platform',
});

export const DEFAULT_CANVAS_SIZE: CanvasSize = fromPreset(RATIO_PRESETS[0]!);

export const getCanvasPreset = (id: string | null): CanvasPreset | undefined =>
  ALL_PRESETS.find((p) => p.id === id);

/** Canvas in design units (1080 wide). */
export const toDesignSize = (size: CanvasSize): AspectRatio => ({
  width: DESIGN_WIDTH,
  height: (DESIGN_WIDTH * size.height) / size.width,
});

/** Export scale that produces exactly the chosen pixel size. */
export const getExactScale = (size: CanvasSize): number => size.width / DESIGN_WIDTH;

/** A typed size, kept inside the limits. */
export function customSize(width: number, height: number): CanvasSize {
  let w = clamp(Math.round(width), MIN_SIDE, MAX_SIDE);
  let h = clamp(Math.round(height), MIN_SIDE, MAX_SIDE);
  if (w / h > MAX_RATIO) w = Math.round(h * MAX_RATIO);
  if (h / w > MAX_RATIO) h = Math.round(w * MAX_RATIO);
  return { presetId: null, width: w, height: h, exact: true };
}

/** How close (relative) a dragged shape must be to a ratio preset to snap to it. */
const SNAP = 0.025;

/**
 * Size for a dragged shape (width / height). Snaps to the ratio presets when close,
 * so it's easy to land exactly on 1:1, 4:5 and so on.
 */
export function sizeForRatio(shape: number, baseWidth: number, snap = true): CanvasSize {
  const r = clamp(shape, 1 / MAX_RATIO, MAX_RATIO);
  const snapped =
    snap && RATIO_PRESETS.find((p) => Math.abs(p.width / p.height / r - 1) < SNAP);
  if (snapped) return fromPreset(snapped);

  let width = baseWidth;
  let height = Math.round(width / r);
  if (height > MAX_SIDE) {
    height = MAX_SIDE;
    width = Math.round(height * r);
  }
  return { presetId: null, width, height, exact: false };
}

/** "4:5", "16:9", or "1.85:1" for odd shapes. */
export function describeRatio(width: number, height: number): string {
  const preset = RATIO_PRESETS.find((p) => Math.abs(p.width / p.height - width / height) < 0.002);
  if (preset) return preset.label;
  const r = width / height;
  return r >= 1 ? `${r.toFixed(2)}:1` : `1:${(1 / r).toFixed(2)}`;
}
