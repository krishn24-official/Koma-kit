/**
 * Pure functions for the layout tree (see `LayoutNode`). All of them return new trees
 * and never mutate their input, so they work directly with the store.
 */
import type {
  CellRect,
  LayoutDivider,
  LayoutNode,
  ResolvedLayout,
  SplitDirection,
} from '@/types';
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
  return node.direction === direction
    ? spans.reduce((a, b) => a + b, 0)
    : Math.max(...spans);
}

// ─── Geometry ────────────────────────────────────────────────────────────────

function walk(
  node: LayoutNode,
  area: CellRect,
  path: number[],
  visit: (node: LayoutNode, area: CellRect, path: number[]) => void,
): void {
  visit(node, area, path);
  if (node.type === 'cell') return;

  let offset = 0;
  node.children.forEach((child, i) => {
    const size = node.sizes[i] ?? 0;
    const childArea =
      node.direction === 'horizontal'
        ? { x: area.x + offset * area.w, y: area.y, w: size * area.w, h: area.h }
        : { x: area.x, y: area.y + offset * area.h, w: area.w, h: size * area.h };
    walk(child, childArea, [...path, i], visit);
    offset += size;
  });
}

const FULL: CellRect = { x: 0, y: 0, w: 1, h: 1 };
const resolvedCache = new WeakMap<LayoutNode, ResolvedLayout>();

/**
 * Flattens a tree into per-cell rectangles (indexed by cell number).
 * Cached per tree object, so the same tree always returns the same result and
 * React selectors stay stable.
 */
export function resolveLayout(root: LayoutNode): ResolvedLayout {
  const cached = resolvedCache.get(root);
  if (cached) return cached;

  const cells: CellRect[] = [];
  walk(root, FULL, [], (node, area) => {
    if (node.type === 'cell') cells[node.cell] = area;
  });
  const resolved = { cells };
  resolvedCache.set(root, resolved);
  return resolved;
}

/** Every draggable divider in the layout. */
export function getDividers(root: LayoutNode): LayoutDivider[] {
  const dividers: LayoutDivider[] = [];
  walk(root, FULL, [], (node, area, path) => {
    if (node.type === 'cell') return;
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
      });
    }
  });
  return dividers;
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
    return { ...node, sizes };
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
    return split(
      direction,
      [...root.children, newStrip],
      [...root.sizes.map((size) => size * keep), 1 - keep],
    );
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
  return { ...node, children, sizes };
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
    return { ...node, children, sizes: sizes.map((size) => size / total) };
  };

  const next = remove(root);
  return next ? normalize(next) : null;
}

/** Resets every split so boxes are evenly sized (rows and columns line up). */
export function equalizeLayout(node: LayoutNode): LayoutNode {
  if (node.type === 'cell') return node;
  const spans = node.children.map((child) => span(child, node.direction));
  const total = spans.reduce((a, b) => a + b, 0);
  return {
    ...node,
    children: node.children.map(equalizeLayout),
    sizes: spans.map((s) => s / total),
  };
}

export const isSplit = (node: LayoutNode): node is Split => node.type === 'split';
