import type { LayoutNode, LayoutPreset } from '@/types';
import { split } from '@/utils/layoutTree';

/**
 * Builds a layout tree with boxes numbered in reading order (left → right, top → bottom).
 * `shape` describes the tree: a number is that many boxes in a row/column.
 */
let counter = 0;
const box = (): LayoutNode => ({ type: 'cell', cell: counter++ });
const boxes = (n: number) => Array.from({ length: n }, box);

const preset = (id: string, name: string, build: () => LayoutNode): LayoutPreset => {
  counter = 0;
  return { id, name, root: build() };
};

const rows = (n: number) => split('vertical', boxes(n));
const cols = (n: number) => split('horizontal', boxes(n));
/** `rowCount` rows, each split into `colCount` boxes. */
const grid = (colCount: number, rowCount: number) =>
  split(
    'vertical',
    Array.from({ length: rowCount }, () => cols(colCount)),
  );

export const LAYOUTS: LayoutPreset[] = [
  preset('single', 'Single', box),
  preset('cols-2', '2 columns', () => cols(2)),
  preset('rows-2', '2 rows', () => rows(2)),
  preset('cols-3', '3 columns', () => cols(3)),
  preset('rows-3', '3 rows', () => rows(3)),
  preset('grid-2x2', '2 × 2 grid', () => grid(2, 2)),
  preset('top-1-bottom-2', '1 top, 2 bottom', () => split('vertical', [box(), cols(2)])),
  preset('top-2-bottom-1', '2 top, 1 bottom', () => split('vertical', [cols(2), box()])),
  preset('left-1-right-2', '1 left, 2 right', () => split('horizontal', [box(), rows(2)])),
  preset('left-2-right-1', '2 left, 1 right', () => split('horizontal', [rows(2), box()])),
  preset('hero-top-3', 'Big top, 3 bottom', () =>
    split('vertical', [box(), cols(3)], [2 / 3, 1 / 3]),
  ),
  preset('hero-left-3', 'Big left, 3 right', () =>
    split('horizontal', [box(), rows(3)], [2 / 3, 1 / 3]),
  ),
  preset('grid-2x3', '2 × 3 grid', () => grid(2, 3)),
  preset('grid-3x2', '3 × 2 grid', () => grid(3, 2)),
  preset('grid-3x3', '3 × 3 grid', () => grid(3, 3)),
  preset('grid-4x4', '4 × 4 grid', () => grid(4, 4)),
];

export const DEFAULT_LAYOUT_ID = 'grid-2x2';

/** Upper limit on boxes, to keep the editor usable on phones. */
export const MAX_CELLS = 25;

export const getPreset = (id: string): LayoutPreset =>
  LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0]!;
