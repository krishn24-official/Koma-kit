/**
 * Logo shapes (circle, hexagon, …) and zooming a logo inside its shape.
 * The preview clips with CSS clip-path and the download with a canvas path; both use
 * the same outlines.
 */
import type { CellRect, StickerElement, StickerShape } from '@/types';
import { clamp } from './math';

export const SHAPES: ReadonlyArray<{ id: StickerShape; label: string }> = [
  { id: 'none', label: 'Original' },
  { id: 'square', label: 'Square' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'circle', label: 'Circle' },
  { id: 'hexagon', label: 'Hexagon' },
  { id: 'diamond', label: 'Diamond' },
];

/** Polygon corners as fractions of the box. */
const POLYGONS: Partial<Record<StickerShape, ReadonlyArray<readonly [number, number]>>> = {
  hexagon: [
    [0.25, 0],
    [0.75, 0],
    [1, 0.5],
    [0.75, 1],
    [0.25, 1],
    [0, 0.5],
  ],
  diamond: [
    [0.5, 0],
    [1, 0.5],
    [0.5, 1],
    [0, 0.5],
  ],
};

/** Rounded corners: share of the shorter side. */
const ROUNDNESS = 0.2;

/** CSS clip-path for a box of `w` × `h` pixels, or undefined for no clipping. */
export function shapeClipPath(shape: StickerShape, w: number, h: number): string | undefined {
  if (shape === 'circle') return 'ellipse(50% 50% at 50% 50%)';
  if (shape === 'rounded') return `inset(0 round ${ROUNDNESS * Math.min(w, h)}px)`;
  const points = POLYGONS[shape];
  if (!points) return undefined;
  return `polygon(${points.map(([x, y]) => `${x * 100}% ${y * 100}%`).join(', ')})`;
}

/** Clips the canvas to the shape over a box at 0,0 of `w` × `h`. No-op for none/square. */
export function clipToShape(
  ctx: CanvasRenderingContext2D,
  shape: StickerShape,
  w: number,
  h: number,
): void {
  if (shape === 'none' || shape === 'square') return;
  ctx.beginPath();
  if (shape === 'circle') ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (shape === 'rounded') ctx.roundRect(0, 0, w, h, ROUNDNESS * Math.min(w, h));
  else {
    POLYGONS[shape]?.forEach(([x, y], i) =>
      i === 0 ? ctx.moveTo(x * w, y * h) : ctx.lineTo(x * w, y * h),
    );
    ctx.closePath();
  }
  ctx.clip();
}

/** Shapes that look best square: picking one crops the logo to a square. */
const SQUARE_SHAPES: ReadonlySet<StickerShape> = new Set([
  'square',
  'rounded',
  'circle',
  'hexagon',
  'diamond',
]);

/** Keeps the crop inside the picture. */
const fitCrop = (rect: CellRect): CellRect => {
  const w = clamp(rect.w, 0.02, 1);
  const h = clamp(rect.h, 0.02, 1);
  return { x: clamp(rect.x, 0, 1 - w), y: clamp(rect.y, 0, 1 - h), w, h };
};

/**
 * Changes a logo's shape. Square shapes crop the picture to the biggest square around
 * the current crop's centre, keeping the logo's on-screen width.
 */
export function setStickerShape(
  sticker: StickerElement,
  shape: StickerShape,
): Partial<StickerElement> {
  if (!SQUARE_SHAPES.has(shape) || !sticker.naturalWidth) return { shape };
  const { crop, naturalWidth: nw, naturalHeight: nh } = sticker;
  // Side of the square in pixels: the shorter side of the current crop.
  const side = Math.min(crop.w * nw, crop.h * nh);
  const w = side / nw;
  const h = side / nh;
  const cx = crop.x + crop.w / 2;
  const cy = crop.y + crop.h / 2;
  return { shape, crop: fitCrop({ x: cx - w / 2, y: cy - h / 2, w, h }) };
}

/**
 * Zooms the picture inside the logo's frame: `factor` > 1 shows a smaller part (zoom
 * in), < 1 a bigger part (zoom out, up to the whole picture). The frame keeps its size,
 * shape and place.
 */
export function zoomSticker(sticker: StickerElement, factor: number): Partial<StickerElement> {
  const { crop } = sticker;
  let w = crop.w / factor;
  let h = crop.h / factor;
  // Zooming out stops at the whole picture (keeping the frame's shape).
  const over = Math.max(w, h);
  if (over > 1) {
    w /= over;
    h /= over;
  }
  // Zooming in stops at 5% of the picture.
  const under = Math.min(w, h);
  if (under < 0.05) {
    w *= 0.05 / under;
    h *= 0.05 / under;
  }
  const cx = crop.x + crop.w / 2;
  const cy = crop.y + crop.h / 2;
  // Same width on screen; the height follows, since the crop keeps its shape.
  return { crop: fitCrop({ x: cx - w / 2, y: cy - h / 2, w, h }) };
}
