import type { CellRect } from '@/types';

/** Pixels brighter than this (0–255, brightest channel) count as picture, not bar. */
const BRIGHTNESS = 28;
/** A row/column is picture if at least this share of its pixels is bright. */
const MIN_SHARE = 0.03;
/** Work on a smaller copy (longest side in pixels); enough to place edges within ~2 px. */
const SAMPLE_SIZE = 400;

/**
 * Finds the picture area inside black bars (letterboxing/pillarboxing), as fractions
 * of the frame. Returns the full frame when there are no bars or it can't tell.
 */
export function detectContentBounds(
  source: CanvasImageSource,
  width: number,
  height: number,
): CellRect {
  const full = { x: 0, y: 0, w: 1, h: 1 };
  if (width <= 0 || height <= 0) return full;

  const scale = Math.min(1, SAMPLE_SIZE / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return full;

  try {
    ctx.drawImage(source, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const bright = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      return Math.max(data[i]!, data[i + 1]!, data[i + 2]!) > BRIGHTNESS;
    };
    const rowIsPicture = (y: number) => {
      let count = 0;
      for (let x = 0; x < w; x++) if (bright(x, y)) count++;
      return count >= w * MIN_SHARE;
    };
    const colIsPicture = (x: number) => {
      let count = 0;
      for (let y = 0; y < h; y++) if (bright(x, y)) count++;
      return count >= h * MIN_SHARE;
    };

    let top = 0;
    while (top < h && !rowIsPicture(top)) top++;
    let bottom = h - 1;
    while (bottom > top && !rowIsPicture(bottom)) bottom--;
    let left = 0;
    while (left < w && !colIsPicture(left)) left++;
    let right = w - 1;
    while (right > left && !colIsPicture(right)) right--;

    if (top >= bottom || left >= right) return full; // all dark: can't tell

    // The row/column on a bar's edge mixes bar and picture. Step one sample inward on
    // every side that has a bar, so no thin dark line is left.
    if (top > 0) top++;
    if (bottom < h - 1) bottom--;
    if (left > 0) left++;
    if (right < w - 1) right--;
    if (top >= bottom || left >= right) return full;
    return { x: left / w, y: top / h, w: (right - left + 1) / w, h: (bottom - top + 1) / h };
  } catch {
    return full;
  }
}

/** True when bounds cut off something noticeable (more than 1% on any side). */
export const hasBars = (rect: CellRect): boolean =>
  rect.x > 0.01 || rect.y > 0.01 || rect.x + rect.w < 0.99 || rect.y + rect.h < 0.99;
