/** Width/height pair in pixels (or design units). */
export interface Size {
  width: number;
  height: number;
}

/** A rectangle in absolute pixels. */
export interface PixelRect extends Size {
  x: number;
  y: number;
}

/**
 * A cell rectangle in fractional units (0–1) of the canvas's inner area.
 * Fractions let one layout work for any canvas size or aspect ratio.
 */
export interface CellRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** `horizontal`: children side by side (left → right). `vertical`: stacked (top → bottom). */
export type SplitDirection = 'horizontal' | 'vertical';

/**
 * A layout is a tree of splits. Each split divides its area between its children by
 * `sizes` (fractions summing to 1), and each leaf is one box, identified by its cell
 * index. Every split resizes on its own, so one box can grow without moving
 * unrelated boxes.
 *
 * Invariant: the leaves' cell numbers are exactly 0…n-1.
 */
export type LayoutNode =
  | { type: 'cell'; cell: number }
  | {
      type: 'split';
      direction: SplitDirection;
      children: LayoutNode[];
      sizes: number[];
      /**
       * Slant of each divider (one per boundary; missing = straight): how far its two
       * ends move apart along the split, as a fraction of the split's length. A
       * divider at position p runs from p − tilt/2 at its start to p + tilt/2 at its
       * end, so slanted dividers make slanted (manga-style) panels.
       */
      tilts?: number[];
    };

/** Polygon corners as fractions of the inner canvas (or pixels, where noted). */
export type Polygon = Array<[number, number]>;

/**
 * A layout flattened for drawing: `cells[i]` is the bounding rectangle of cell i, and
 * `polygons[i]` its exact outline when slanted dividers cut it (null = the rectangle).
 */
export interface ResolvedLayout {
  cells: CellRect[];
  polygons: Array<Polygon | null>;
}

export interface LayoutPreset {
  id: string;
  name: string;
  root: LayoutNode;
}

/** A draggable line between two neighbouring children of a split. */
export interface LayoutDivider {
  /** Child indexes from the root down to the split. */
  path: number[];
  /** The divider sits between children `boundary` and `boundary + 1`. */
  boundary: number;
  direction: SplitDirection;
  /** The split's area, in fractions of the inner canvas. */
  area: CellRect;
  /** Divider position along the split direction, in fractions of the inner canvas. */
  position: number;
  /** Slant (see LayoutNode `tilts`); 0 = straight. */
  tilt: number;
}
