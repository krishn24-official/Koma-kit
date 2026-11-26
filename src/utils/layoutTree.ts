/**
 * Pure functions for the layout tree (see `LayoutNode`). All of them return new trees
 * and never mutate their input, so they work directly with the store.
 */
import type { CellRect, LayoutDivider, LayoutNode, ResolvedLayout, SplitDirection } from '@/types';
import { clamp } from './math';

/** Smallest share of its split a box can be dragged down to. */
export const MIN_SPLIT_SIZE = 0.08;

type Split = Extract<LayoutNode, { type: 'split' }>;

const cell = (index: number): LayoutNode => ({ type: 'cell', cell: index });

const otherDirection = (d: SplitDirection): SplitDirection =>
  d === 'horizontal' ? 'vertical' : 'horizontal';

const equalSizes = (n: number) => Array.from({ length: n }, () => 1 / n);

export const split = (
  direction: SplitDirection,
  children: LayoutNode[],
  sizes: number[] = equalSizes(children.length),
): LayoutNode => ({ type: 'split', direction, children, sizes });

/** A row (horizontal) or column (vertical) of `count` new boxes, numbered from `first`. */
const strip = (direction: SplitDirection, count: number, first: number): LayoutNode =>
  count === 1
    ? cell(first)
    : split(
        direction,
        Array.from({ length: count }, (_, i) => cell(first + i)),
      );

export const countCells = (node: LayoutNode): number =>
  node.type === 'cell' ? 1 : node.children.reduce((sum, child) => sum + countCells(child), 0);

/**
 * How many boxes a node spans along a direction, e.g. a 2×3 grid spans 3 horizontally.
 * Used to give new rows/columns the same size as existing ones.
 */
export function span(node: LayoutNode, direction: SplitDirection): number {
  if (node.type === 'cell') return 1;
  const spans = node.children.map((child) => span(child, direction));
  return node.direction === direction ? spans.reduce((a, b) => a + b, 0) : Math.max(...spans);
}

// ─── Geometry ────────────────────────────────────────────────────────────────

type Point = [number, number];

/** A split's tilt per boundary (0 where missing). */
export const tiltsOf = (node: Split): number[] =>
  node.children.slice(1).map((_, i) => node.tilts?.[i] ?? 0);

const isTilted = (t: number) => Math.abs(t) > 1e-6;

/** True if any divider in the tree is slanted. */
export const hasTilts = (node: LayoutNode): boolean =>
  node.type === 'split' && (tiltsOf(node).some(isTilted) || node.children.some(hasTilts));

/** Start and end of divider `i` of a split over `area` (fractions of the inner canvas). */
function dividerLine(node: Split, area: CellRect, offset: number, tilt: number): [Point, Point] {
  if (node.direction === 'horizontal') {
    const p = area.x + offset * area.w;
    return [
      [p - (tilt / 2) * area.w, area.y],
      [p + (tilt / 2) * area.w, area.y + area.h],
    ];
  }
  const p = area.y + offset * area.h;
  return [
    [area.x, p - (tilt / 2) * area.h],
    [area.x + area.w, p + (tilt / 2) * area.h],
  ];
}

const cross = (a: Point, b: Point, p: Point) =>
  (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

/** Keeps the part of `poly` on one side of the line a→b (side = sign of the cross product). */
function clipPolygon(poly: Point[], a: Point, b: Point, side: 1 | -1): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % poly.length]!;
    const dp = cross(a, b, p) * side;
    const dq = cross(a, b, q) * side;
    if (dp >= 0) out.push(p);
    if (dp >= 0 !== dq >= 0) {
      const t = dp / (dp - dq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

const boundsOf = (poly: Point[]): CellRect => {
  const xs = poly.map(([x]) => x);
  const ys = poly.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};

function walk(
  node: LayoutNode,
  area: CellRect,
  poly: Point[],
  path: number[],
  visit: (node: LayoutNode, area: CellRect, path: number[], poly: Point[]) => void,
): void {
  visit(node, area, path, poly);
  if (node.type === 'cell') return;

  const tilts = tiltsOf(node);
  const slanted = tilts.some(isTilted);
  // Lines between children: straight dividers give the usual rectangles.
  let offset = 0;
  const lines = node.children.slice(1).map((_, i) => {
    offset += node.sizes[i] ?? 0;
    return dividerLine(node, area, offset, tilts[i] ?? 0);
  });

  offset = 0;
  node.children.forEach((child, i) => {
    const size = node.sizes[i] ?? 0;
    // Child i lies after line i-1 and before line i.
    let childPoly = poly;
    const before = lines[i - 1];
    const after = lines[i];
    const horizontal = node.direction === 'horizontal';
    if (before) childPoly = clipPolygon(childPoly, before[0], before[1], horizontal ? -1 : 1);
    if (after) childPoly = clipPolygon(childPoly, after[0], after[1], horizontal ? 1 : -1);
    const childArea = slanted
      ? boundsOf(childPoly)
      : horizontal
        ? { x: area.x + offset * area.w, y: area.y, w: size * area.w, h: area.h }
        : { x: area.x, y: area.y + offset * area.h, w: area.w, h: size * area.h };
    walk(child, childArea, childPoly, [...path, i], visit);
    offset += size;
  });
}

const FULL: CellRect = { x: 0, y: 0, w: 1, h: 1 };
const FULL_POLY: Point[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];
const resolvedCache = new WeakMap<LayoutNode, ResolvedLayout>();

/** True if the polygon is just its bounding rectangle (no slanted edge). */
const isRectangle = (poly: Point[], box: CellRect) =>
  poly.every(
    ([x, y]) =>
      (Math.abs(x - box.x) < 1e-6 || Math.abs(x - box.x - box.w) < 1e-6) &&
      (Math.abs(y - box.y) < 1e-6 || Math.abs(y - box.y - box.h) < 1e-6),
  );

/**
 * Flattens a tree into per-cell rectangles and (for slanted dividers) outlines, indexed
 * by cell number. Cached per tree object, so the same tree always returns the same
 * result and React selectors stay stable.
 */
export function resolveLayout(root: LayoutNode): ResolvedLayout {
  const cached = resolvedCache.get(root);
  if (cached) return cached;

  const cells: CellRect[] = [];
  const polygons: ResolvedLayout['polygons'] = [];
  const tilted = hasTilts(root);
  walk(root, FULL, FULL_POLY, [], (node, area, _path, poly) => {
    if (node.type !== 'cell') return;
    cells[node.cell] = area;
    polygons[node.cell] = tilted && !isRectangle(poly, area) ? poly : null;
  });
  const resolved = { cells, polygons };
  resolvedCache.set(root, resolved);
  return resolved;
}

/** Every draggable divider in the layout. */
export function getDividers(root: LayoutNode): LayoutDivider[] {
  const dividers: LayoutDivider[] = [];
  walk(root, FULL, FULL_POLY, [], (node, area, path) => {
    if (node.type === 'cell') return;
    const tilts = tiltsOf(node);
    let offset = 0;
    for (let i = 0; i < node.children.length - 1; i++) {
      offset += node.sizes[i] ?? 0;
      dividers.push({
        path,
        boundary: i,
        direction: node.direction,
        area,
        position:
          node.direction === 'horizontal' ? area.x + offset * area.w : area.y + offset * area.h,
        tilt: tilts[i] ?? 0,
      });
    }
  });
  return dividers;
}

/** Smallest gap kept between neighbouring dividers' ends (fraction of the split). */
const MIN_END_GAP = 0.04;
/** Steepest slant allowed. */
export const MAX_TILT = 0.9;

/**
 * Keeps every divider of a split from crossing its neighbours at either end (and from
 * the outer edges), by limiting the tilts. Returns the split with clamped tilts.
 */
function clampTilts(node: Split): Split {
  if (!node.tilts) return node;
  const tilts = tiltsOf(node);
  const positions: number[] = [];
  let offset = 0;
  for (let i = 0; i < tilts.length; i++) {
    offset += node.sizes[i] ?? 0;
    positions.push(offset);
  }
  const start = (i: number) => (i < 0 ? 0 : i >= tilts.length ? 1 : positions[i]! - tilts[i]! / 2);
  const end = (i: number) => (i < 0 ? 0 : i >= tilts.length ? 1 : positions[i]! + tilts[i]! / 2);
  for (let i = 0; i < tilts.length; i++) {
    const p = positions[i]!;
    const lo = Math.max(
      -MAX_TILT,
      2 * (p - (start(i + 1) - MIN_END_GAP)),
      2 * (end(i - 1) + MIN_END_GAP - p),
    );
    const hi = Math.min(
      MAX_TILT,
      2 * (p - (start(i - 1) + MIN_END_GAP)),
      2 * (end(i + 1) - MIN_END_GAP - p),
    );
    tilts[i] = lo > hi ? 0 : clamp(tilts[i]!, lo, hi);
  }
  return { ...node, tilts };
}

/** Sets how slanted one divider is (clamped so it never crosses its neighbours). */
export function setDividerTilt(
  root: LayoutNode,
  path: number[],
  boundary: number,
  tilt: number,
): LayoutNode {
  return updateAt(root, path, (node) => {
    if (node.type === 'cell') return node;
    const tilts = tiltsOf(node);
    if (boundary < 0 || boundary >= tilts.length) return node;
    tilts[boundary] = tilt;
    return clampTilts({ ...node, tilts });
  });
}

/** Straightens every divider. */
export function straightenLayout(node: LayoutNode): LayoutNode {
  if (node.type === 'cell') return node;
  const straight: Split = { ...node, children: node.children.map(straightenLayout) };
  delete straight.tilts;
  return straight;
}

// ─── Editing ─────────────────────────────────────────────────────────────────

/** Replaces the node at `path` with `update(node)`. */
function updateAt(
  node: LayoutNode,
  path: number[],
  update: (node: LayoutNode) => LayoutNode,
): LayoutNode {
  if (path.length === 0) return update(node);
  if (node.type === 'cell') return node;
  const [head, ...rest] = path;
  return {
    ...node,
    children: node.children.map((child, i) => (i === head ? updateAt(child, rest, update) : child)),
  };
}

/** Moves the divider between children `boundary` and `boundary + 1` of the split at `path`. */
export function resizeDivider(
  root: LayoutNode,
  path: number[],
  boundary: number,
  delta: number,
): LayoutNode {
  return updateAt(root, path, (node) => {
    if (node.type === 'cell') return node;
    const a = node.sizes[boundary];
    const b = node.sizes[boundary + 1];
    if (a === undefined || b === undefined) return node;

    const total = a + b;
    const nextA = clamp(a + delta, MIN_SPLIT_SIZE, total - MIN_SPLIT_SIZE);
    const sizes = [...node.sizes];
    sizes[boundary] = nextA;
    sizes[boundary + 1] = total - nextA;
    return clampTilts({ ...node, sizes });
  });
}

/**
 * Adds a row at the bottom (`vertical`) or a column on the right (`horizontal`).
 * The new strip gets as many boxes as the layout spans the other way, e.g. a column
 * added to a 2×2 grid has 2 boxes. It takes an equal share of space, and existing
 * parts keep their relative sizes.
 */
export function addStrip(root: LayoutNode, direction: SplitDirection): LayoutNode {
  const across = otherDirection(direction);
  const newStrip = strip(across, span(root, across), countCells(root));
  const existingSpan = span(root, direction);
  const keep = existingSpan / (existingSpan + 1);

  if (root.type === 'split' && root.direction === direction) {
    const grown = split(
      direction,
      [...root.children, newStrip],
      [...root.sizes.map((size) => size * keep), 1 - keep],
    ) as Split;
    return root.tilts ? clampTilts({ ...grown, tilts: [...tiltsOf(root), 0] }) : grown;
  }
  return split(direction, [root, newStrip], [keep, 1 - keep]);
}

/**
 * "Add layer": a stack of rows (or a single box) gets a new row at the bottom.
 * Anything else (columns, grids, mixed) gets a new column on the right.
 */
export function addLayer(root: LayoutNode): LayoutNode {
  const isRowStack =
    root.type === 'cell' ||
    (root.direction === 'vertical' && root.children.every((child) => child.type === 'cell'));
  return addStrip(root, isRowStack ? 'vertical' : 'horizontal');
}

/**
 * Tidies a tree after edits: splits with one child are replaced by that child, and
 * splits nested in a split of the same direction are merged into it.
 */
function normalize(node: LayoutNode): LayoutNode {
  if (node.type === 'cell') return node;
  const children: LayoutNode[] = [];
  const sizes: number[] = [];

  node.children.forEach((raw, i) => {
    const child = normalize(raw);
    const size = node.sizes[i] ?? 0;
    if (child.type === 'split' && child.direction === node.direction) {
      child.children.forEach((grandchild, j) => {
        children.push(grandchild);
        sizes.push(size * (child.sizes[j] ?? 0));
      });
    } else {
      children.push(child);
      sizes.push(size);
    }
  });

  if (children.length === 1) return children[0]!;
  const merged = children.length !== node.children.length;
  const result = { ...node, children, sizes };
  if (merged) delete result.tilts;
  return result;
}

/**
 * Removes box `index`, giving its space to its neighbours, and renumbers the boxes
 * after it so cell numbers stay 0…n-1. Returns null if it's the last box.
 */
export function removeCell(root: LayoutNode, index: number): LayoutNode | null {
  if (countCells(root) <= 1) return null;

  const remove = (node: LayoutNode): LayoutNode | null => {
    if (node.type === 'cell') {
      if (node.cell === index) return null;
      return node.cell > index ? cell(node.cell - 1) : node;
    }
    const children: LayoutNode[] = [];
    const sizes: number[] = [];
    node.children.forEach((child, i) => {
      const kept = remove(child);
      if (kept) {
        children.push(kept);
        sizes.push(node.sizes[i] ?? 0);
      }
    });
    if (children.length === 0) return null;
    const total = sizes.reduce((a, b) => a + b, 0) || 1;
    const lostChild = children.length !== node.children.length;
    const kept = { ...node, children, sizes: sizes.map((size) => size / total) };
    if (lostChild) delete kept.tilts;
    return kept;
  };

  const next = remove(root);
  return next ? normalize(next) : null;
}

/** Resets every split so boxes are evenly sized (rows and columns line up). */
export function equalizeLayout(node: LayoutNode): LayoutNode {
  if (node.type === 'cell') return node;
  const spans = node.children.map((child) => span(child, node.direction));
  const total = spans.reduce((a, b) => a + b, 0);
  return clampTilts({
    ...node,
    children: node.children.map(equalizeLayout),
    sizes: spans.map((s) => s / total),
  });
}

export const isSplit = (node: LayoutNode): node is Split => node.type === 'split';
