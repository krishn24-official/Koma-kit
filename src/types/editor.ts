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
  /**
   * Seconds a video waits on its first frame after appearing, before it plays
   * (e.g. to play after another clip ends). Videos only (0 for images).
   */
  delay: number;
  /** True to leave this video's sound out of the preview and the export. */
  muted: boolean;
  /** Part of the picture/frame used, as fractions of it (x, y, w, h). Full = 0, 0, 1, 1. */
  crop: CellRect;
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
  /** Hidden elements are left out of the preview and the download. */
  hidden: boolean;
  /** Locked elements can't be tapped or dragged on the canvas (select them in the list). */
  locked: boolean;
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
  /** Shape (width / height) of the empty placeholder slot. */
  slotAspect: number;
  /** Mirrored left ↔ right. */
  flipX: boolean;
  /** How far each edge fades out to transparent, as a share of the picture (0 = none). */
  fade: StickerFade;
  /** Soft colored light around the picture's outline. */
  glow: StickerGlow;
  /** Shadow behind the picture's outline, so overlapping pictures separate. */
  shadow: StickerShadow;
  /** Color adjustments; 1 = unchanged. */
  adjust: StickerAdjust;
}

/** Blending effects shared by pictures on the canvas and grid boxes. */
export interface PictureEffects {
  fade: StickerFade;
  glow: StickerGlow;
  shadow: StickerShadow;
  adjust: StickerAdjust;
}

export interface StickerFade {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface StickerGlow {
  color: string;
  /** 0 = off, up to 1. */
  strength: number;
  /** Blur size in design units. */
  size: number;
}

export interface StickerShadow {
  /** 0 = off, up to 1. */
  strength: number;
  /** Blur size in design units. */
  blur: number;
  /** Offset down/right in design units (follows the picture's rotation). */
  distance: number;
}

export interface StickerAdjust {
  brightness: number;
  contrast: number;
  saturation: number;
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

export type Selection = { kind: 'cell'; index: number } | { kind: 'element'; id: string } | null;

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
