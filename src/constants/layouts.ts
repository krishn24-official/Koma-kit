import type { CellRect, LayoutPreset } from '@/types';

/** Builds an evenly divided grid, filled row by row. */
const grid = (cols: number, rows: number): CellRect[] =>
  Array.from({ length: cols * rows }, (_, i) => ({
    x: (i % cols) / cols,
    y: Math.floor(i / cols) / rows,
    w: 1 / cols,
    h: 1 / rows,
  }));

const THIRD = 1 / 3;
const TWO_THIRDS = 2 / 3;

export const LAYOUTS: LayoutPreset[] = [
  { id: 'single', name: 'Single', cells: grid(1, 1) },
  { id: 'cols-2', name: '2 columns', cells: grid(2, 1) },
  { id: 'rows-2', name: '2 rows', cells: grid(1, 2) },
  { id: 'cols-3', name: '3 columns', cells: grid(3, 1) },
  { id: 'rows-3', name: '3 rows', cells: grid(1, 3) },
  { id: 'grid-2x2', name: '2 × 2 grid', cells: grid(2, 2) },
  {
    id: 'top-1-bottom-2',
    name: '1 top, 2 bottom',
    cells: [
      { x: 0, y: 0, w: 1, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: 'top-2-bottom-1',
    name: '2 top, 1 bottom',
    cells: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 1, h: 0.5 },
    ],
  },
  {
    id: 'left-1-right-2',
    name: '1 left, 2 right',
    cells: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: 'left-2-right-1',
    name: '2 left, 1 right',
    cells: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
  {
    id: 'hero-top-3',
    name: 'Big top, 3 bottom',
    cells: [
      { x: 0, y: 0, w: 1, h: TWO_THIRDS },
      { x: 0, y: TWO_THIRDS, w: THIRD, h: THIRD },
      { x: THIRD, y: TWO_THIRDS, w: THIRD, h: THIRD },
      { x: TWO_THIRDS, y: TWO_THIRDS, w: THIRD, h: THIRD },
    ],
  },
  {
    id: 'hero-left-3',
    name: 'Big left, 3 right',
    cells: [
      { x: 0, y: 0, w: TWO_THIRDS, h: 1 },
      { x: TWO_THIRDS, y: 0, w: THIRD, h: THIRD },
      { x: TWO_THIRDS, y: THIRD, w: THIRD, h: THIRD },
      { x: TWO_THIRDS, y: TWO_THIRDS, w: THIRD, h: THIRD },
    ],
  },
  { id: 'grid-2x3', name: '2 × 3 grid', cells: grid(2, 3) },
  { id: 'grid-3x2', name: '3 × 2 grid', cells: grid(3, 2) },
  { id: 'grid-3x3', name: '3 × 3 grid', cells: grid(3, 3) },
  { id: 'grid-4x4', name: '4 × 4 grid', cells: grid(4, 4) },
];

export const DEFAULT_LAYOUT_ID = 'grid-2x2';

export const getLayout = (id: string): LayoutPreset =>
  LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0]!;
