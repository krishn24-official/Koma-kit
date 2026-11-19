export type AspectRatioId = '4:5' | '1:1' | '3:4' | '2:3' | '16:9' | '9:16';

/** Canvas dimensions in design units (width is always 1080). */
export interface AspectRatio {
  id: AspectRatioId;
  label: string;
  hint: string;
  width: number;
  height: number;
}

/**
 * How an image sits inside its cell.
 * - `scale` is relative to "cover" (1 = image exactly fills the cell).
 * - `offsetX` / `offsetY` move the image centre, as a fraction of the cell's width / height.
 */
export interface ImageTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface CellImage {
  id: string;
  src: string;
  fileName: string;
  naturalWidth: number;
  naturalHeight: number;
  transform: ImageTransform;
}

/** All lengths are in design units (canvas width = 1080). */
export interface CanvasStyle {
  gap: number;
  padding: number;
  radius: number;
  backgroundColor: string;
}

export interface FontOption {
  id: string;
  label: string;
  family: string;
  weight: number;
}

export interface TextOverlay {
  id: string;
  text: string;
  /** Centre position as a fraction of canvas width / height. */
  x: number;
  y: number;
  fontId: string;
  /** Font size in design units. */
  fontSize: number;
  color: string;
  strokeColor: string;
  /** Visible outline thickness as a percentage of the font size. */
  strokeWidth: number;
  shadow: boolean;
}

export type Selection = { kind: 'cell'; index: number } | { kind: 'text'; id: string } | null;

export type ExportFormat = 'png' | 'jpeg';

export interface ExportOptions {
  format: ExportFormat;
  /** Resolution multiplier applied to the design size. */
  scale: number;
  /** JPEG quality, 0–1. */
  quality: number;
  fileName: string;
}
