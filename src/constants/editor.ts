import type { CanvasStyle, ExportFormat, ExportOptions, ImageTransform, TextOverlay } from '@/types';
import { createId } from '@/utils/id';
import { DEFAULT_FONT_ID } from './fonts';

/** Maximum zoom, relative to "cover" (image exactly filling its cell). */
export const MAX_ZOOM = 5;
export const WHEEL_ZOOM_SPEED = 0.0015;

export const DEFAULT_TRANSFORM: ImageTransform = { scale: 1, offsetX: 0, offsetY: 0 };

export const DEFAULT_STYLE: CanvasStyle = {
  gap: 8,
  padding: 0,
  radius: 0,
  backgroundColor: '#0a0a0a',
};

export const STYLE_LIMITS = {
  gap: { min: 0, max: 60 },
  padding: { min: 0, max: 100 },
  radius: { min: 0, max: 60 },
} as const;

export const BACKGROUND_SWATCHES = [
  '#000000',
  '#ffffff',
  '#171717',
  '#e11d48',
  '#f59e0b',
  '#16a34a',
  '#2563eb',
  '#7c3aed',
];

export const TEXT_COLOR_SWATCHES = [
  '#ffffff',
  '#000000',
  '#facc15',
  '#ef4444',
  '#38bdf8',
  '#a855f7',
];

export const TEXT_LIMITS = {
  fontSize: { min: 16, max: 260 },
  strokeWidth: { min: 0, max: 20 },
} as const;

export const TEXT_LINE_HEIGHT = 1.15;

export const createDefaultText = (): TextOverlay => ({
  id: createId(),
  text: 'Your title',
  x: 0.5,
  y: 0.5,
  fontId: DEFAULT_FONT_ID,
  fontSize: 96,
  color: '#ffffff',
  strokeColor: '#000000',
  strokeWidth: 6,
  shadow: true,
});

export const EXPORT_SCALES = [
  { value: 1, label: '1×' },
  { value: 1.5, label: '1.5×' },
  { value: 2, label: '2×' },
] as const;

export const EXPORT_MIME: Record<ExportFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  mp4: 'video/mp4',
};

export const EXPORT_EXTENSION: Record<ExportFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  mp4: 'mp4',
};

export const VIDEO_WIDTHS = [
  { value: 720, label: '720p' },
  { value: 1080, label: '1080p' },
] as const;

export const VIDEO_FPS = 30;
export const FRAME_DURATION = 1 / VIDEO_FPS;

/** X rejects longer videos for most accounts. */
export const X_MAX_VIDEO_SECONDS = 140;

/** How long a scheduled image stays on screen after the last video ends. */
export const IMAGE_TAIL_SECONDS = 2;

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'png',
  scale: 2,
  quality: 0.92,
  videoWidth: 1080,
  fileName: 'koma-kit-template',
};
