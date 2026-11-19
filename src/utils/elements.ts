import { ELEMENT_LIMITS, PLACEHOLDER_ASPECT } from '@/constants/elements';
import { toCssFont, getFont } from '@/constants/fonts';
import type { CanvasElement, CellRect, Size, StickerElement, TextAlign } from '@/types';
import { clamp } from './math';

/** Sticker height for a given width, using the placeholder shape until a picture is set. */
export const stickerHeight = (sticker: StickerElement, width = sticker.width): number =>
  sticker.src && sticker.naturalWidth > 0
    ? (width * sticker.naturalHeight * sticker.crop.h) / (sticker.naturalWidth * sticker.crop.w)
    : width / PLACEHOLDER_ASPECT;

/** Where the anchor sits horizontally: 0 = left edge, 0.5 = centre, 1 = right edge. */
export const anchorFraction = (el: CanvasElement): number => {
  const align: TextAlign = el.type === 'text' ? el.align : 'center';
  return align === 'left' ? 0 : align === 'right' ? 1 : 0.5;
};

/** Returns the change that resizes an element by `factor` (text/badge font, sticker width). */
export function scaleElement(el: CanvasElement, factor: number): Partial<CanvasElement> {
  if (el.type === 'sticker') {
    const { min, max } = ELEMENT_LIMITS.stickerWidth;
    return { width: clamp(el.width * factor, min, max) };
  }
  const { min, max } = ELEMENT_LIMITS.fontSize;
  return { fontSize: clamp(el.fontSize * factor, min, max) };
}

/** Short name for lists. */
export function describeElement(el: CanvasElement): string {
  if (el.type === 'sticker') return el.src ? (el.file?.name ?? 'Picture') : `${el.label} (empty)`;
  return el.text.split('\n')[0]?.trim() || 'Empty text';
}

/** All CSS fonts the elements use, so exports can wait for them to load. */
export const elementFonts = (elements: CanvasElement[]): string[] => [
  ...new Set(
    elements.flatMap((el) => (el.type === 'sticker' ? [] : [toCssFont(getFont(el.fontId), 64)])),
  ),
];

/**
 * Applies a new crop to a sticker so the part that stays is exactly where it was on
 * screen: same scale, same position (also when rotated). `design` is the canvas size
 * in design units; `rect` is the new crop in fractions of the full picture.
 */
export function cropSticker(
  sticker: StickerElement,
  rect: CellRect,
  design: Size,
): Partial<StickerElement> {
  const old = sticker.crop;
  // Size of the whole (uncropped) picture on the canvas, in design units.
  const fullW = sticker.width / old.w;
  const fullH = (fullW * sticker.naturalHeight) / sticker.naturalWidth;

  // Move from the old crop's centre to the new one, in the picture's own (rotated) axes.
  const dx = (rect.x + rect.w / 2 - (old.x + old.w / 2)) * fullW;
  const dy = (rect.y + rect.h / 2 - (old.y + old.h / 2)) * fullH;
  const a = (sticker.rotation * Math.PI) / 180;
  const rx = dx * Math.cos(a) - dy * Math.sin(a);
  const ry = dx * Math.sin(a) + dy * Math.cos(a);

  return {
    crop: rect,
    width: fullW * rect.w,
    x: sticker.x + rx / design.width,
    y: sticker.y + ry / design.height,
  };
}
