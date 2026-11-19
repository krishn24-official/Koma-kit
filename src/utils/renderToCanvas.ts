import { toCssFont } from '@/constants/fonts';
import type {
  AspectRatio,
  CanvasStyle,
  CellImage,
  LayoutPreset,
  PixelRect,
  TextOverlay,
} from '@/types';
import { loadImage } from './image';
import { getImageRect, getImageSize } from './imageTransform';
import { getCellRects } from './layoutMath';
import { getTextRenderStyle } from './textStyle';

export interface TemplateSnapshot {
  layout: LayoutPreset;
  aspectRatio: AspectRatio;
  style: CanvasStyle;
  images: Record<number, CellImage>;
  texts: TextOverlay[];
}

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
async function loadFonts(texts: TextOverlay[]): Promise<void> {
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

/** Renders the template at full resolution, independent of the on-screen preview. */
export async function renderTemplate(
  snapshot: TemplateSnapshot,
  scale: number,
): Promise<HTMLCanvasElement> {
  const { layout, aspectRatio, style, images, texts } = snapshot;

  const width = Math.round(aspectRatio.width * scale);
  const height = Math.round(aspectRatio.height * scale);
  const unit = width / aspectRatio.width;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser');

  const rects = getCellRects(layout.cells, { width, height }, style, unit);

  const [elements] = await Promise.all([
    Promise.all(
      rects.map((_, i) => {
        const image = images[i];
        return image ? loadImage(image.src) : Promise.resolve(null);
      }),
    ),
    loadFonts(texts),
  ]);

  ctx.fillStyle = style.backgroundColor;
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  rects.forEach((rect, i) => {
    const image = images[i];
    const element = elements[i];
    if (!image || !element) return;

    const drawRect = getImageRect(getImageSize(image), rect, image.transform);
    ctx.save();
    traceRoundedRect(ctx, rect, style.radius * unit);
    ctx.clip();
    ctx.drawImage(
      element,
      rect.x + drawRect.x,
      rect.y + drawRect.y,
      drawRect.width,
      drawRect.height,
    );
    ctx.restore();
  });

  texts.forEach((text) => drawText(ctx, text, width, height, unit));

  return canvas;
}
