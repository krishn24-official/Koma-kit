/**
 * Cut-outs: keep only the part of a picture inside an outline drawn on the canvas.
 * The kept part stays exactly where it was on screen; everything outside is removed.
 *
 * Works for pictures on the canvas (stickers, also rotated or mirrored) and for a
 * picture in a layout box (it becomes a separate cut-out piece).
 */
import { createSticker, FULL_CROP } from '@/constants/elements';
import type { CellMedia, CellRect, PixelRect, Size, StickerElement } from '@/types';
import { stickerHeight } from './elements';
import { getImageRect, getImageSize } from './imageTransform';
import { clamp } from './math';

type Point = [number, number];

/** An outline in local pixels of a shown picture area (0…w, 0…h), clamped to it. */
interface LocalOutline {
  points: Point[];
  w: number;
  h: number;
}

/**
 * Bounding box of the outline, the crop of that box inside the picture's current crop,
 * and the corners relative to the box. Null if the outline is too small.
 */
function fitOutline(outline: LocalOutline, crop: CellRect, mirrored: boolean) {
  const xs = outline.points.map(([x]) => x);
  const ys = outline.points.map(([, y]) => y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  if (x1 - x0 < 4 || y1 - y0 < 4) return null;
  const u0 = mirrored ? 1 - x1 / outline.w : x0 / outline.w;
  const u1 = mirrored ? 1 - x0 / outline.w : x1 / outline.w;
  return {
    x0,
    y0,
    width: x1 - x0,
    height: y1 - y0,
    crop: {
      x: crop.x + u0 * crop.w,
      y: crop.y + (y0 / outline.h) * crop.h,
      w: (u1 - u0) * crop.w,
      h: ((y1 - y0) / outline.h) * crop.h,
    },
    points: outline.points.map(([x, y]) => [(x - x0) / (x1 - x0), (y - y0) / (y1 - y0)] as Point),
  };
}

/**
 * Cuts a picture on the canvas down to the outline (`points` are fractions of the
 * canvas, `design` the canvas size in design units). Returns the change, or null.
 */
export function cutOutSticker(
  sticker: StickerElement,
  points: Point[],
  design: Size,
): Partial<StickerElement> | null {
  if (!sticker.src) return null;
  const w = sticker.width;
  const h = stickerHeight(sticker);
  const cx = sticker.x * design.width;
  const cy = sticker.y * design.height;
  const a = (sticker.rotation * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);

  // Canvas → the picture's own (unrotated) box, then clamp to it.
  const local = points.map(([fx, fy]): Point => {
    const dx = fx * design.width - cx;
    const dy = fy * design.height - cy;
    return [clamp(dx * cos + dy * sin + w / 2, 0, w), clamp(-dx * sin + dy * cos + h / 2, 0, h)];
  });
  const fit = fitOutline({ points: local, w, h }, sticker.crop, sticker.flipX);
  if (!fit) return null;

  // New centre, back on the canvas (rotated like the picture).
  const mx = fit.x0 + fit.width / 2 - w / 2;
  const my = fit.y0 + fit.height / 2 - h / 2;
  return {
    shape: 'custom',
    points: fit.points,
    crop: fit.crop,
    width: fit.width,
    slotAspect: fit.width / fit.height,
    x: (cx + mx * cos - my * sin) / design.width,
    y: (cy + mx * sin + my * cos) / design.height,
  };
}

/**
 * Cuts a box's picture down to the outline, as a new piece on the canvas in the same
 * place. `cell` is the box in design units. Returns null if the outline misses it.
 */
export function cutOutCellPicture(
  item: CellMedia,
  cell: PixelRect,
  points: Point[],
  design: Size,
): StickerElement | null {
  if (item.kind !== 'image') return null;
  const drawn = getImageRect(getImageSize(item), cell, item.transform);
  // The picture is only visible inside the box: keep the outline inside both.
  const left = Math.max(0, -drawn.x);
  const top = Math.max(0, -drawn.y);
  const right = Math.min(drawn.width, cell.width - drawn.x);
  const bottom = Math.min(drawn.height, cell.height - drawn.y);
  const local = points.map(([fx, fy]): Point => [
    clamp(fx * design.width - cell.x - drawn.x, left, right),
    clamp(fy * design.height - cell.y - drawn.y, top, bottom),
  ]);
  const fit = fitOutline({ points: local, w: drawn.width, h: drawn.height }, item.crop, false);
  if (!fit) return null;

  return createSticker({
    label: 'Cut-out',
    src: URL.createObjectURL(item.file),
    file: item.file,
    naturalWidth: item.naturalWidth,
    naturalHeight: item.naturalHeight,
    crop: fit.crop.w > 0 && fit.crop.h > 0 ? fit.crop : { ...FULL_CROP },
    shape: 'custom',
    points: fit.points,
    width: fit.width,
    slotAspect: fit.width / fit.height,
    x: (cell.x + drawn.x + fit.x0 + fit.width / 2) / design.width,
    y: (cell.y + drawn.y + fit.y0 + fit.height / 2) / design.height,
  });
}

/**
 * Freehand traces have many points: drop the ones that barely change the outline
 * (Ramer–Douglas–Peucker, `tolerance` in the same units as the points).
 */
export function simplifyOutline(points: Point[], tolerance: number): Point[] {
  if (points.length <= 3) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    const [ax, ay] = points[s]!;
    const [bx, by] = points[e]!;
    const len = Math.hypot(bx - ax, by - ay);
    let far = -1;
    let farDist = tolerance;
    for (let i = s + 1; i < e; i++) {
      const [px, py] = points[i]!;
      // Distance to the line a–b; when a and b are the same point (a closed loop, where
      // the trace ends where it began), the distance to that point.
      const d =
        len < 1e-6
          ? Math.hypot(px - ax, py - ay)
          : Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / len;
      if (d > farDist) {
        far = i;
        farDist = d;
      }
    }
    if (far >= 0) {
      keep[far] = 1;
      stack.push([s, far], [far, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** True if the canvas point (fractions) is on a sticker's picture (rotation included). */
export function stickerContains(
  sticker: StickerElement,
  fx: number,
  fy: number,
  design: Size,
): boolean {
  const w = sticker.width;
  const h = stickerHeight(sticker);
  const a = (sticker.rotation * Math.PI) / 180;
  const dx = fx * design.width - sticker.x * design.width;
  const dy = fy * design.height - sticker.y * design.height;
  const lx = dx * Math.cos(a) + dy * Math.sin(a);
  const ly = -dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(lx) <= w / 2 && Math.abs(ly) <= h / 2;
}
