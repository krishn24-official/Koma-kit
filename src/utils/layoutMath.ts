import type { CanvasStyle, CellRect, PixelRect, Polygon, ResolvedLayout, Size } from '@/types';

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

/** A box in pixels: its bounding rectangle, and its outline when slanted. */
export interface CellShape extends PixelRect {
  /** Outline corners in pixels, relative to the rectangle's top-left; null = rectangle. */
  polygon: Polygon | null;
}

/**
 * Moves each edge of a convex polygon inward by its own distance and returns the new
 * corners (where neighbouring moved edges meet).
 */
function insetPolygon(points: Polygon, distances: number[]): Polygon {
  const n = points.length;
  // Inward side depends on the corner order (clockwise or not).
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i]!;
    const [x2, y2] = points[(i + 1) % n]!;
    area += x1 * y2 - x2 * y1;
  }
  const inward = area > 0 ? 1 : -1;
  const lines = points.map(([x1, y1], i) => {
    const [x2, y2] = points[(i + 1) % n]!;
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    // Unit normal pointing into the polygon.
    const nx = (-(y2 - y1) / len) * inward;
    const ny = ((x2 - x1) / len) * inward;
    const d = distances[i] ?? 0;
    return { x: x1 + nx * d, y: y1 + ny * d, dx: x2 - x1, dy: y2 - y1 };
  });
  return lines.map((cur, i) => {
    const prev = lines[(i - 1 + n) % n]!;
    const det = prev.dx * cur.dy - prev.dy * cur.dx;
    if (Math.abs(det) < 1e-9) return [cur.x, cur.y] as [number, number];
    const t = ((cur.x - prev.x) * cur.dy - (cur.y - prev.y) * cur.dx) / det;
    return [prev.x + prev.dx * t, prev.y + prev.dy * t] as [number, number];
  });
}

/**
 * Like getCellRects, plus the exact outline of boxes cut by slanted dividers. Gaps are
 * kept even along slanted edges: every inner edge moves in by half the gap.
 */
export function getCellShapes(
  layout: ResolvedLayout,
  canvas: Size,
  style: Pick<CanvasStyle, 'gap' | 'padding'>,
  unit: number,
): CellShape[] {
  const rects = getCellRects(layout.cells, canvas, style, unit);
  if (!layout.polygons.some(Boolean)) return rects.map((r) => ({ ...r, polygon: null }));

  const padding = style.padding * unit;
  const halfGap = (style.gap * unit) / 2;
  const innerWidth = Math.max(0, canvas.width - padding * 2);
  const innerHeight = Math.max(0, canvas.height - padding * 2);
  const onEdge = (v: number) => v < EPSILON || v > 1 - EPSILON;

  return rects.map((rect, i) => {
    const poly = layout.polygons[i];
    if (!poly) return { ...rect, polygon: null };
    // Edges along the outer border keep no gap (the outer border is `padding`).
    const distances = poly.map(([x1, y1], k) => {
      const [x2, y2] = poly[(k + 1) % poly.length]!;
      const outer =
        (onEdge(x1) && Math.abs(x1 - x2) < EPSILON) || (onEdge(y1) && Math.abs(y1 - y2) < EPSILON);
      return outer ? 0 : halfGap;
    });
    const px = insetPolygon(
      poly.map(([x, y]) => [padding + x * innerWidth, padding + y * innerHeight]),
      distances,
    );
    const xs = px.map(([x]) => x);
    const ys = px.map(([, y]) => y);
    const x0 = Math.floor(Math.min(...xs));
    const y0 = Math.floor(Math.min(...ys));
    const x1 = Math.ceil(Math.max(...xs));
    const y1 = Math.ceil(Math.max(...ys));
    return {
      x: x0,
      y: y0,
      width: Math.max(0, x1 - x0),
      height: Math.max(0, y1 - y0),
      polygon: px.map(([x, y]) => [x - x0, y - y0] as [number, number]),
    };
  });
}

/**
 * A box's outline as an SVG path relative to its rectangle: its slanted outline, or the
 * rectangle with rounded corners (`radius` in pixels).
 */
export function cellOutlinePath(shape: CellShape, radius: number): string {
  const r2 = (v: number) => Math.round(v * 100) / 100;
  if (shape.polygon) {
    return shape.polygon.map(([x, y], i) => `${i ? 'L' : 'M'}${r2(x)} ${r2(y)}`).join(' ') + ' Z';
  }
  const { width: w, height: h } = shape;
  const r = r2(Math.max(0, Math.min(radius, w / 2, h / 2)));
  if (r === 0) return `M0 0 H${r2(w)} V${r2(h)} H0 Z`;
  return `M${r} 0 H${r2(w - r)} A${r} ${r} 0 0 1 ${r2(w)} ${r} V${r2(h - r)} A${r} ${r} 0 0 1 ${r2(w - r)} ${r2(h)} H${r} A${r} ${r} 0 0 1 0 ${r2(h - r)} V${r} A${r} ${r} 0 0 1 ${r} 0 Z`;
}
