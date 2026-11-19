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
 * Using fractions lets one layout definition work for any canvas size or aspect ratio.
 */
export interface CellRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutPreset {
  id: string;
  name: string;
  cells: CellRect[];
}
