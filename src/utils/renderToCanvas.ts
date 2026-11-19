import { toCssFont } from '@/constants/fonts';
import type {
  AspectRatio,
  CanvasStyle,
  CellMedia,
  LayoutPreset,
  PixelRect,
  Size,
  TextOverlay,
} from '@/types';
import { getImageRect, getImageSize } from './imageTransform';
import { getCellRects } from './layoutMath';
import { loadImage, loadVideoFrame, releaseVideo } from './media';
import { getTextRenderStyle } from './textStyle';
import { getActiveItem, getVideoLocalTime } from './timeline';

export interface TemplateSnapshot {
  layout: LayoutPreset;
  aspectRatio: AspectRatio;
  style: CanvasStyle;
  cells: Record<number, CellMedia[]>;
  texts: TextOverlay[];
  audioSourceId: string | null;
}

/** Returns something drawable for an item (image, video frame, decoded canvas). */
export type MediaResolver = (item: CellMedia) => CanvasImageSource | null;

function traceRoundedRect(ctx: CanvasRenderingContext2D, rect: PixelRect, radius: number): void {
  const { x, y, width: w, height: h } = rect;
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  if (r === 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Makes sure web fonts are ready; canvas silently falls back otherwise. */
export async function loadTextFonts(texts: TextOverlay[]): Promise<void> {
  if (!('fonts' in document)) return;
  const fonts = new Set(texts.map((t) => toCssFont(getTextRenderStyle(t, 1).font, 64)));
  await Promise.all([...fonts].map((font) => document.fonts.load(font).catch(() => undefined)));
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: TextOverlay,
  canvasWidth: number,
  canvasHeight: number,
  unit: number,
): void {
  const style = getTextRenderStyle(text, unit);
  const centerX = text.x * canvasWidth;
  const top = text.y * canvasHeight - (style.lineHeight * style.lines.length) / 2;

  ctx.save();
  ctx.font = style.cssFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  const applyShadow = () => {
    if (!style.shadow) return;
    ctx.shadowColor = style.shadow.color;
    ctx.shadowBlur = style.shadow.blur;
    ctx.shadowOffsetY = style.shadow.offsetY;
  };
  const clearShadow = () => {
    ctx.shadowColor = 'transparent';
  };

  style.lines.forEach((line, i) => {
    const y = top + style.lineHeight * (i + 0.5);

    // Stroke first, then fill on top, so the outline sits outside the letters
    // (same result as CSS `paint-order: stroke fill`).
    if (style.outline > 0) {
      applyShadow();
      ctx.lineWidth = style.outline * 2;
      ctx.strokeStyle = text.strokeColor;
      ctx.strokeText(line, centerX, y);
      clearShadow();
    } else {
      applyShadow();
    }

    ctx.fillStyle = text.color;
    ctx.fillText(line, centerX, y);
    clearShadow();
  });

  ctx.restore();
}

/**
 * Draws one frame of the template at timeline `time`. Synchronous, so the video exporter
 * can call it for every frame. Image and video export both use it.
 */
export function drawTemplate(
  ctx: CanvasRenderingContext2D,
  snapshot: TemplateSnapshot,
  size: Size,
  time: number,
  resolve: MediaResolver,
): void {
  const { layout, aspectRatio, style, cells, texts } = snapshot;
  const unit = size.width / aspectRatio.width;
  const rects = getCellRects(layout.cells, size, style, unit);

  ctx.fillStyle = style.backgroundColor;
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  rects.forEach((rect, i) => {
    const item = getActiveItem(cells[i], time);
    const source = item ? resolve(item) : null;
    if (!item || !source) return;

    const drawRect = getImageRect(getImageSize(item), rect, item.transform);
    ctx.save();
    traceRoundedRect(ctx, rect, style.radius * unit);
    ctx.clip();
    ctx.drawImage(
      source,
      rect.x + drawRect.x,
      rect.y + drawRect.y,
      drawRect.width,
      drawRect.height,
    );
    ctx.restore();
  });

  texts.forEach((text) => drawText(ctx, text, size.width, size.height, unit));
}

/** Renders a still image of the template at timeline `time` and resolution `scale`. */
export async function renderStill(
  snapshot: TemplateSnapshot,
  scale: number,
  time: number,
): Promise<HTMLCanvasElement> {
  const width = Math.round(snapshot.aspectRatio.width * scale);
  const height = Math.round(snapshot.aspectRatio.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser');

  const active = snapshot.layout.cells
    .map((_, i) => getActiveItem(snapshot.cells[i], time))
    .filter((item): item is CellMedia => item !== null);

  const sources = new Map<string, CanvasImageSource>();
  const videos: HTMLVideoElement[] = [];

  try {
    await Promise.all([
      loadTextFonts(snapshot.texts),
      ...active.map(async (item) => {
        if (item.kind === 'image') {
          sources.set(item.id, await loadImage(item.src));
        } else {
          const video = await loadVideoFrame(item.src, getVideoLocalTime(item, time));
          videos.push(video);
          sources.set(item.id, video);
        }
      }),
    ]);

    drawTemplate(ctx, snapshot, { width, height }, time, (item) => sources.get(item.id) ?? null);
    return canvas;
  } finally {
    videos.forEach(releaseVideo);
  }
}
