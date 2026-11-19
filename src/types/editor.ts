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
 * How media sits inside its cell.
 * - `scale` is relative to "cover" (1 = media exactly fills the cell).
 * - `offsetX` / `offsetY` move the centre, as a fraction of the cell's width / height.
 */
export interface ImageTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export type MediaKind = 'image' | 'video';

/** An image or video placed in a cell. */
export interface CellMedia {
  id: string;
  kind: MediaKind;
  /** Object URL for previewing. */
  src: string;
  /** Original file; video export decodes frames and audio from it. */
  file: File;
  fileName: string;
  naturalWidth: number;
  naturalHeight: number;
  /** Full length of the source file in seconds (0 for images). */
  duration: number;
  /** Part of the source that plays, in seconds into the file. Videos only (0 for images). */
  trimStart: number;
  trimEnd: number;
  /** Timeline time in seconds when this item appears in its cell. */
  start: number;
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

export type ExportFormat = 'png' | 'jpeg' | 'mp4';

export interface ExportOptions {
  format: ExportFormat;
  /** Resolution multiplier for still images. */
  scale: number;
  /** JPEG quality, 0–1. */
  quality: number;
  /** Output width in pixels for MP4 export. */
  videoWidth: number;
  fileName: string;
}
