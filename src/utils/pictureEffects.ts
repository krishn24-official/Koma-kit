/**
 * Picture effects (edge fades, glow, shadow, color) for pictures on the canvas and for
 * grid boxes. The preview uses CSS
 * (mask + filters); the download draws the same thing on a canvas. Both follow the same
 * rules, so they match:
 *  - colors are adjusted first, then the edges fade out,
 *  - the glow follows the faded outline,
 *  - the shadow is cast by the picture together with its glow.
 * Fades, glow and shadow follow a picture's rotation.
 */
import type { CSSProperties } from 'react';
import type { PictureEffects, StickerAdjust, StickerElement, StickerFade } from '@/types';
import { hexToRgba } from './background';
import { stickerHeight } from './elements';
import { clipToShape, shapePath, strokeShapeBorder } from './stickerShape';

const SIDES = ['top', 'bottom', 'left', 'right'] as const;
/** CSS gradient direction that starts at each side. */
const CSS_DIRECTION: Record<(typeof SIDES)[number], string> = {
  top: 'to bottom',
  bottom: 'to top',
  left: 'to right',
  right: 'to left',
};

export const hasFade = (fade: StickerFade): boolean => SIDES.some((side) => fade[side] > 0);

export const hasAdjust = (a: StickerAdjust): boolean =>
  a.brightness !== 1 || a.contrast !== 1 || a.saturation !== 1;

const shadowColor = (strength: number) => `rgba(0, 0, 0, ${strength})`;

/** Mask for the edge fades (on the picture's clipping box), or nothing. */
export function fadeMaskStyle(fade: StickerFade): CSSProperties {
  const layers = SIDES.filter((side) => fade[side] > 0).map(
    (side) => `linear-gradient(${CSS_DIRECTION[side]}, transparent 0%, #000 ${fade[side] * 100}%)`,
  );
  if (layers.length === 0) return {};
  const image = layers.join(', ');
  // Several masks multiply (intersect), like the canvas version.
  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskComposite: 'intersect',
    WebkitMaskComposite: 'source-in',
  };
}

/** Color filter for the picture itself. */
export const adjustFilter = (a: StickerAdjust): string | undefined =>
  hasAdjust(a)
    ? `brightness(${a.brightness}) contrast(${a.contrast}) saturate(${a.saturation})`
    : undefined;

/** Glow and shadow as CSS drop-shadows (blur radius = canvas shadowBlur). */
export function outlineFilter(
  { glow, shadow }: Pick<PictureEffects, 'glow' | 'shadow'>,
  unit: number,
): string | undefined {
  const parts: string[] = [];
  if (glow.strength > 0) {
    parts.push(`drop-shadow(0 0 ${glow.size * unit}px ${hexToRgba(glow.color, glow.strength)})`);
  }
  if (shadow.strength > 0) {
    const d = shadow.distance * unit;
    parts.push(
      `drop-shadow(${d}px ${d}px ${shadow.blur * unit}px ${shadowColor(shadow.strength)})`,
    );
  }
  return parts.length ? parts.join(' ') : undefined;
}

// ─── Canvas ──────────────────────────────────────────────────────────────────

const clampByte = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Same math as CSS brightness() → contrast() → saturate(), clamped after each step. */
export function applyAdjust(ctx: CanvasRenderingContext2D, w: number, h: number, a: StickerAdjust) {
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  const s = a.saturation;
  const m = [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
  ] as const; // prettier-ignore
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    let r = d[i]!;
    let g = d[i + 1]!;
    let b = d[i + 2]!;
    r = clampByte(r * a.brightness);
    g = clampByte(g * a.brightness);
    b = clampByte(b * a.brightness);
    r = clampByte((r - 127.5) * a.contrast + 127.5);
    g = clampByte((g - 127.5) * a.contrast + 127.5);
    b = clampByte((b - 127.5) * a.contrast + 127.5);
    d[i] = clampByte(m[0] * r + m[1] * g + m[2] * b);
    d[i + 1] = clampByte(m[3] * r + m[4] * g + m[5] * b);
    d[i + 2] = clampByte(m[6] * r + m[7] * g + m[8] * b);
  }
  ctx.putImageData(image, 0, 0);
}

export function applyFade(ctx: CanvasRenderingContext2D, w: number, h: number, fade: StickerFade) {
  ctx.globalCompositeOperation = 'destination-in';
  for (const side of SIDES) {
    const reach = fade[side];
    if (reach <= 0) continue;
    const g =
      side === 'top'
        ? ctx.createLinearGradient(0, 0, 0, h * reach)
        : side === 'bottom'
          ? ctx.createLinearGradient(0, h, 0, h * (1 - reach))
          : side === 'left'
            ? ctx.createLinearGradient(0, 0, w * reach, 0)
            : ctx.createLinearGradient(w, 0, w * (1 - reach), 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.globalCompositeOperation = 'source-over';
}

export function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  return { canvas, ctx: canvas.getContext('2d')! };
}

/**
 * Adds the glow, then the shadow (cast by picture + glow), around what `source` holds.
 * Returns a bigger canvas when needed; `offset` is where the source's top-left sits in it.
 */
export function addOutline(
  source: HTMLCanvasElement,
  { glow, shadow }: Pick<PictureEffects, 'glow' | 'shadow'>,
  unit: number,
): { canvas: HTMLCanvasElement; offset: number } {
  const glowOn = glow.strength > 0;
  const shadowOn = shadow.strength > 0;
  if (!glowOn && !shadowOn) return { canvas: source, offset: 0 };

  // Room for the blur (3 sigma = 1.5 × blur radius) and the shadow offset.
  const m = Math.ceil(
    ((glowOn ? glow.size * 1.5 : 0) + (shadowOn ? shadow.blur * 1.5 + shadow.distance : 0)) * unit,
  );
  const w = source.width + 2 * m;
  const h = source.height + 2 * m;
  let current = source;
  let offset = 0; // where the source's top-left sits inside `current`

  if (glowOn) {
    const next = makeCanvas(w, h);
    next.ctx.shadowColor = hexToRgba(glow.color, glow.strength);
    next.ctx.shadowBlur = glow.size * unit;
    next.ctx.drawImage(current, m - offset, m - offset);
    current = next.canvas;
    offset = m;
  }
  if (shadowOn) {
    const next = makeCanvas(w, h);
    next.ctx.shadowColor = shadowColor(shadow.strength);
    next.ctx.shadowBlur = shadow.blur * unit;
    next.ctx.shadowOffsetX = shadow.distance * unit;
    next.ctx.shadowOffsetY = shadow.distance * unit;
    next.ctx.drawImage(current, m - offset, m - offset);
    current = next.canvas;
    offset = m;
  }
  return { canvas: current, offset };
}

export const hasOutline = (e: Pick<PictureEffects, 'glow' | 'shadow'>): boolean =>
  e.glow.strength > 0 || e.shadow.strength > 0;

export const hasEffects = (e: PictureEffects): boolean =>
  e.border.width > 0 || hasFade(e.fade) || hasAdjust(e.adjust) || hasOutline(e);

/** A sticker drawn with all its effects, and where its top-left goes relative to its centre. */
export interface StickerLayer {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
}

/** Rendered layers per sticker object (stickers don't change between video frames). */
const cache = new WeakMap<
  StickerElement,
  { unit: number; image: CanvasImageSource; layer: StickerLayer }
>();

/** Draws a sticker with its effects on its own canvas, in the sticker's own (unrotated) frame. */
export function renderStickerLayer(
  sticker: StickerElement,
  image: CanvasImageSource,
  unit: number,
): StickerLayer {
  const hit = cache.get(sticker);
  if (hit && hit.unit === unit && hit.image === image) return hit.layer;

  const w = Math.max(1, Math.round(sticker.width * unit));
  const h = Math.max(1, Math.round(stickerHeight(sticker) * unit));
  const { crop, naturalWidth: nw, naturalHeight: nh } = sticker;

  const base = makeCanvas(w, h);
  base.ctx.imageSmoothingQuality = 'high';
  clipToShape(base.ctx, sticker, w, h);
  if (sticker.flipX) {
    base.ctx.translate(w, 0);
    base.ctx.scale(-1, 1);
  }
  base.ctx.drawImage(image, crop.x * nw, crop.y * nh, crop.w * nw, crop.h * nh, 0, 0, w, h);
  base.ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (hasAdjust(sticker.adjust)) applyAdjust(base.ctx, w, h, sticker.adjust);
  if (hasFade(sticker.fade)) applyFade(base.ctx, w, h, sticker.fade);
  // The border isn't faded: it's drawn after the fade, just inside the shape's edge.
  strokeShapeBorder(
    base.ctx,
    shapePath(sticker.shape, w, h, sticker.points),
    sticker.border.width * unit,
    sticker.border.color,
  );

  const outlined = addOutline(base.canvas, sticker, unit);
  const layer = {
    canvas: outlined.canvas,
    x: -w / 2 - outlined.offset,
    y: -h / 2 - outlined.offset,
  };

  cache.set(sticker, { unit, image, layer });
  return layer;
}
