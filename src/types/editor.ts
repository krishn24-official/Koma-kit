/** Canvas dimensions in design units (width is always 1080; height follows the shape). */
export interface AspectRatio {
  width: number;
  height: number;
}

/** The canvas shape the user picked, in real pixels (e.g. 1500 × 500 for an X header). */
export interface CanvasSize {
  /** Ratio or platform preset it came from; null for custom or dragged sizes. */
  presetId: string | null;
  width: number;
  height: number;
  /**
   * True when these exact pixels matter (platform presets, typed sizes), so export
   * offers an "exact size" option.
   */
  exact: boolean;
}

export interface CanvasPreset {
  id: string;
  label: string;
  hint: string;
  group: 'ratio' | 'platform';
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

export type BackgroundType = 'solid' | 'gradient' | 'image';

export interface BackgroundImage {
  src: string;
  file: File;
  naturalWidth: number;
  naturalHeight: number;
}

/** All lengths are in design units (canvas width = 1080). */
export interface CanvasStyle {
  gap: number;
  padding: number;
  radius: number;
  backgroundType: BackgroundType;
  /** Solid fill; also drawn under gradients and images. */
  backgroundColor: string;
  gradientFrom: string;
  gradientTo: string;
  /** CSS-style angle in degrees: 0 = bottom → top, 90 = left → right. */
  gradientAngle: number;
  backgroundImage: BackgroundImage | null;
  backgroundBlur: number;
  /** Darkening over the image, 0–1, so the boxes stand out. */
  backgroundDim: number;
}

export interface FontOption {
  id: string;
  label: string;
  family: string;
  weight: number;
}

import type { CellRect } from './layout';

export type TextAlign = 'left' | 'center' | 'right';

/** Shared by everything placed freely on the canvas. */
interface ElementBase {
  id: string;
  /**
   * Anchor position as a fraction of canvas width / height. The anchor is the
   * element's centre, except for left/right-aligned text where it is the left/right
   * edge (so lines of text stay aligned when edited).
   */
  x: number;
  y: number;
  /** Degrees, clockwise, around the anchor. */
  rotation: number;
  /** 0–1 */
  opacity: number;
}

export interface TextElement extends ElementBase {
  type: 'text';
  text: string;
  fontId: string;
  /** Font size in design units. */
  fontSize: number;
  align: TextAlign;
  /** Extra space between letters, as a percentage of the font size. */
  letterSpacing: number;
  color: string;
  strokeColor: string;
  /** Visible outline thickness as a percentage of the font size (0 = none). */
  strokeWidth: number;
  shadow: boolean;
}

/** An uploaded picture (logo, sticker). `src` is null for an empty placeholder. */
export interface StickerElement extends ElementBase {
  type: 'sticker';
  src: string | null;
  file: File | null;
  naturalWidth: number;
  naturalHeight: number;
  /** Part of the picture shown, as fractions of it (x, y, w, h). Full = 0, 0, 1, 1. */
  crop: CellRect;
  /** Width in design units of the shown (cropped) part; height follows its shape. */
  width: number;
  /** Placeholder label, e.g. "Anime logo". */
  label: string;
}

/** A label in a rounded box, e.g. "NEW INFO". */
export interface BadgeElement extends ElementBase {
  type: 'badge';
  text: string;
  fontId: string;
  fontSize: number;
  letterSpacing: number;
  textColor: string;
  /** Fill color, or null for transparent. */
  fill: string | null;
  borderColor: string;
  /** Border thickness in design units (0 = none). */
  borderWidth: number;
  /** Space around the text, as multiples of the font size. */
  paddingX: number;
  paddingY: number;
  /** Corner roundness: 0 = square, 1 = fully rounded pill. */
  roundness: number;
}

export type CanvasElement = TextElement | StickerElement | BadgeElement;
export type ElementType = CanvasElement['type'];

/**
 * A color fade over a box's picture, e.g. dark on the left so text stays readable.
 */
export interface BoxFade {
  color: string;
  /** Strength at the strongest edge, 0–1. */
  opacity: number;
  /**
   * Side the fade starts from. 'sides' darkens left and right (art in the middle);
   * 'full' tints the whole box evenly.
   */
  from: 'left' | 'right' | 'top' | 'bottom' | 'sides' | 'full';
  /** How far across the box the fade reaches, 0–1. */
  reach: number;
}

export type Selection =
  | { kind: 'cell'; index: number }
  | { kind: 'element'; id: string }
  | null;

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
