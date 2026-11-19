import type { CanvasStyle, CellRect, PixelRect, Size } from '@/types';

const EPSILON = 1e-6;

/**
 * Converts fractional layout cells into pixel rectangles.
 *
 * @param cells   layout cells in 0–1 units
 * @param canvas  target canvas size in pixels
 * @param style   gap / padding in design units
 * @param unit    pixels per design unit (preview zoom or export scale)
 *
 * Gaps are only applied on inner edges, so every gap is exactly `gap` wide
 * and the outer border is controlled by `padding` alone.
 */
export function getCellRects(
  cells: CellRect[],
  canvas: Size,
  style: Pick<CanvasStyle, 'gap' | 'padding'>,
  unit: number,
): PixelRect[] {
  const padding = style.padding * unit;
  const halfGap = (style.gap * unit) / 2;
  const innerWidth = Math.max(0, canvas.width - padding * 2);
  const innerHeight = Math.max(0, canvas.height - padding * 2);

  // Edges are snapped to whole pixels. Neighbouring cells then share the exact same
  // edge, so with gap = 0 no anti-aliased hairline of background shows between them.
  return cells.map((cell) => {
    const right = cell.x + cell.w;
    const bottom = cell.y + cell.h;

    const x0 = Math.round(padding + cell.x * innerWidth + (cell.x > EPSILON ? halfGap : 0));
    const x1 = Math.round(padding + right * innerWidth - (right < 1 - EPSILON ? halfGap : 0));
    const y0 = Math.round(padding + cell.y * innerHeight + (cell.y > EPSILON ? halfGap : 0));
    const y1 = Math.round(padding + bottom * innerHeight - (bottom < 1 - EPSILON ? halfGap : 0));

    return {
      x: x0,
      y: y0,
      width: Math.max(0, x1 - x0),
      height: Math.max(0, y1 - y0),
    };
  });
}
