/**
 * Picture shapes (circle, hexagon, star, drawn by hand, …), frames, and zooming a
 * picture inside its shape.
 *
 * Every shape is one SVG path for a box of w × h pixels. The preview clips with CSS
 * `clip-path: path(…)` and draws the border as an SVG stroke; the download uses the
 * same path through Path2D. So preview and download always match.
 */
import { createSticker } from '@/constants/elements';
import type { CellRect, StickerElement, StickerShape } from '@/types';
import { clamp } from './math';

export const SHAPES: ReadonlyArray<{ id: Exclude<StickerShape, 'custom'>; label: string }> = [
  { id: 'none', label: 'Original' },
  { id: 'square', label: 'Square' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'circle', label: 'Circle' },
  { id: 'hexagon', label: 'Hexagon' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'pentagon', label: 'Pentagon' },
  { id: 'star', label: 'Star' },
  { id: 'heart', label: 'Heart' },
];

type Points = ReadonlyArray<readonly [number, number]>;

/** A five-pointed star's 10 corners. */
const STAR: Points = Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 === 0 ? 0.5 : 0.2;
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  return [0.5 + r * Math.cos(a), 0.55 + r * Math.sin(a) * 1.05] as const;
});

/** Polygon corners as fractions of the box. */
const POLYGONS: Partial<Record<StickerShape, Points>> = {
  // Flat top and bottom, points left and right (fits a honeycomb).
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
  triangle: [
    [0.5, 0],
    [1, 1],
    [0, 1],
  ],
  pentagon: [
    [0.5, 0],
    [1, 0.38],
    [0.81, 1],
    [0.19, 1],
    [0, 0.38],
  ],
  star: STAR,
};

/**
 * Natural shape of each outline (width / height) when it's picked: e.g. a regular
 * hexagon is wider than tall. Missing = keep the picture's own shape.
 */
const ASPECT: Partial<Record<StickerShape, number>> = {
  square: 1,
  rounded: 1,
  circle: 1,
  hexagon: 2 / Math.sqrt(3),
  diamond: 1,
  triangle: 2 / Math.sqrt(3),
  pentagon: 1.05,
  star: 1,
  heart: 1.1,
};

/** Rounded corners: share of the shorter side. */
const ROUNDNESS = 0.2;

const n = (v: number) => Math.round(v * 100) / 100;

/** A box with rounded corners (radius in pixels, limited to half the shorter side). */
export function roundedRectPath(w: number, h: number, radius: number): string {
  const r = n(Math.max(0, Math.min(radius, w / 2, h / 2)));
  const W = n(w);
  const H = n(h);
  if (r === 0) return `M0 0 H${W} V${H} H0 Z`;
  return `M${r} 0 H${n(W - r)} A${r} ${r} 0 0 1 ${W} ${r} V${n(H - r)} A${r} ${r} 0 0 1 ${n(W - r)} ${H} H${r} A${r} ${r} 0 0 1 0 ${n(H - r)} V${r} A${r} ${r} 0 0 1 ${r} 0 Z`;
}

const polygonPath = (points: Points, w: number, h: number) =>
  points.map(([x, y], i) => `${i ? 'L' : 'M'}${n(x * w)} ${n(y * h)}`).join(' ') + ' Z';

/**
 * The outline as an SVG path for a box of `w` × `h` pixels. 'none' and 'square' are the
 * box itself. `points` is used for 'custom'.
 */
export function shapePath(
  shape: StickerShape,
  w: number,
  h: number,
  points?: StickerElement['points'],
): string {
  if (shape === 'circle') {
    const rx = n(w / 2);
    const ry = n(h / 2);
    return `M0 ${ry} A${rx} ${ry} 0 1 0 ${n(w)} ${ry} A${rx} ${ry} 0 1 0 0 ${ry} Z`;
  }
  if (shape === 'rounded') return roundedRectPath(w, h, ROUNDNESS * Math.min(w, h));
  if (shape === 'heart') {
    const p = (x: number, y: number) => `${n(x * w)} ${n(y * h)}`;
    return (
      `M${p(0.5, 0.22)} C${p(0.5, 0.08)} ${p(0.35, 0)} ${p(0.24, 0)} ` +
      `C${p(0.1, 0)} ${p(0, 0.12)} ${p(0, 0.3)} C${p(0, 0.55)} ${p(0.25, 0.75)} ${p(0.5, 1)} ` +
      `C${p(0.75, 0.75)} ${p(1, 0.55)} ${p(1, 0.3)} C${p(1, 0.12)} ${p(0.9, 0)} ${p(0.76, 0)} ` +
      `C${p(0.65, 0)} ${p(0.5, 0.08)} ${p(0.5, 0.22)} Z`
    );
  }
  const polygon = shape === 'custom' ? points : POLYGONS[shape];
  if (polygon && polygon.length >= 3) return polygonPath(polygon, w, h);
  return `M0 0 H${n(w)} V${n(h)} H0 Z`;
}

/** True if the shape cuts the picture (everything except the plain box). */
export const clipsPicture = (shape: StickerShape): boolean =>
  shape !== 'none' && shape !== 'square';

/** CSS clip-path for a box of `w` × `h` pixels, or undefined for no clipping. */
export const shapeClipPath = (
  shape: StickerShape,
  w: number,
  h: number,
  points?: StickerElement['points'],
): string | undefined =>
  clipsPicture(shape) && w > 0 && h > 0 ? `path('${shapePath(shape, w, h, points)}')` : undefined;

/** Clips the canvas to the shape over a box at 0,0 of `w` × `h`. No-op for none/square. */
export function clipToShape(
  ctx: CanvasRenderingContext2D,
  sticker: Pick<StickerElement, 'shape' | 'points'>,
  w: number,
  h: number,
): void {
  if (!clipsPicture(sticker.shape)) return;
  ctx.clip(new Path2D(shapePath(sticker.shape, w, h, sticker.points)));
}

/**
 * Draws the border just inside the shape's edge (a stroke twice as wide, clipped to the
 * shape). `width` is in pixels.
 */
export function strokeShapeBorder(
  ctx: CanvasRenderingContext2D,
  path: string,
  width: number,
  color: string,
): void {
  if (width <= 0) return;
  const p = new Path2D(path);
  ctx.save();
  ctx.clip(p);
  ctx.lineWidth = width * 2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.stroke(p);
  ctx.restore();
}

// ─── Crops ───────────────────────────────────────────────────────────────────

/** Keeps the crop inside the picture. */
const fitCrop = (rect: CellRect): CellRect => {
  const w = clamp(rect.w, 0.02, 1);
  const h = clamp(rect.h, 0.02, 1);
  return { x: clamp(rect.x, 0, 1 - w), y: clamp(rect.y, 0, 1 - h), w, h };
};

/**
 * The biggest part of a picture with shape `aspect` (width / height) inside `within`
 * (default: the whole picture), centred on it. The picture fills the shape (cover).
 */
export function coverCrop(
  naturalWidth: number,
  naturalHeight: number,
  aspect: number,
  within: CellRect = { x: 0, y: 0, w: 1, h: 1 },
): CellRect {
  const availW = within.w * naturalWidth;
  const availH = within.h * naturalHeight;
  const pxW = Math.min(availW, availH * aspect);
  const pxH = pxW / aspect;
  const w = pxW / naturalWidth;
  const h = pxH / naturalHeight;
  const cx = within.x + within.w / 2;
  const cy = within.y + within.h / 2;
  return fitCrop({ x: cx - w / 2, y: cy - h / 2, w, h });
}

/**
 * Changes a picture's shape. Shapes with a natural form (circle, hexagon, …) refit the
 * picture to that form around the current crop's centre; the on-screen width stays.
 */
export function setStickerShape(
  sticker: StickerElement,
  shape: StickerShape,
): Partial<StickerElement> {
  const aspect = ASPECT[shape];
  if (!aspect) return { shape };
  if (!sticker.src || !sticker.naturalWidth) return { shape, slotAspect: aspect };
  return {
    shape,
    slotAspect: aspect,
    crop: coverCrop(sticker.naturalWidth, sticker.naturalHeight, aspect, sticker.crop),
  };
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

// ─── Frames ──────────────────────────────────────────────────────────────────

/** Frames are shaped picture slots: a new picture fills the frame's shape. */
export const FRAME_LABEL = 'Frame';
export const isFrame = (el: { type: string; label?: string }): boolean =>
  el.type === 'sticker' && el.label === FRAME_LABEL;

export const DEFAULT_FRAME_BORDER = { width: 8, color: '#ffffff' } as const;

/** An empty frame in the middle of the canvas. */
export const createFrame = (patch: Partial<StickerElement> = {}): StickerElement => {
  const shape = patch.shape ?? 'circle';
  return createSticker({
    label: FRAME_LABEL,
    shape,
    slotAspect: ASPECT[shape] ?? 1,
    width: 360,
    border: { ...DEFAULT_FRAME_BORDER },
    shadow: { strength: 0.5, blur: 30, distance: 8 },
    ...patch,
  });
};

/** Natural width / height of a shape (1 when it has none). */
export const shapeAspect = (shape: StickerShape): number => ASPECT[shape] ?? 1;
