import type {
  AspectRatio,
  BoxFade,
  CanvasElement,
  CanvasStyle,
  CellMedia,
  PixelRect,
  ResolvedLayout,
  Size,
} from '@/types';
import { drawBackground, drawBoxFade } from './background';
import { drawElements } from './drawElements';
import { elementFonts } from './elements';
import { getImageRect, getImageSize } from './imageTransform';
import { getCellRects } from './layoutMath';
import { loadImage, loadVideoFrame, releaseVideo, sourceSize } from './media';
import { getActiveItem, getVideoLocalTime } from './timeline';

export interface TemplateSnapshot {
  layout: ResolvedLayout;
  aspectRatio: AspectRatio;
  style: CanvasStyle;
  cells: Record<number, CellMedia[]>;
  boxFades: Record<number, BoxFade>;
  elements: CanvasElement[];
}

/** Returns something drawable for an item (image, video frame, decoded canvas). */
export type MediaResolver = (item: CellMedia) => CanvasImageSource | null;

/** Pictures that don't change over time, loaded once per export. */
export interface DrawAssets {
  background: CanvasImageSource | null;
  stickers: Map<string, CanvasImageSource>;
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

/**
 * Loads fonts, the background picture and sticker pictures. Canvas silently falls
 * back to another font if one isn't ready, so fonts must be loaded first.
 */
export async function loadDrawAssets(snapshot: TemplateSnapshot): Promise<DrawAssets> {
  const { style, elements } = snapshot;

  const fonts =
    'fonts' in document
      ? Promise.all(
          elementFonts(elements).map((font) => document.fonts.load(font).catch(() => undefined)),
        )
      : Promise.resolve();

  const background =
    style.backgroundType === 'image' && style.backgroundImage
      ? loadImage(style.backgroundImage.src)
      : Promise.resolve(null);

  const stickers = Promise.all(
    elements.flatMap((el) =>
      el.type === 'sticker' && el.src
        ? [loadImage(el.src).then((img) => [el.id, img] as const)]
        : [],
    ),
  ).then((entries) => new Map<string, CanvasImageSource>(entries));

  const [bg, stickerMap] = await Promise.all([background, stickers, fonts]);
  return { background: bg, stickers: stickerMap };
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
  assets: DrawAssets,
): void {
  const { layout, aspectRatio, style, cells, boxFades, elements } = snapshot;
  const unit = size.width / aspectRatio.width;
  const rects = getCellRects(layout.cells, size, style, unit);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawBackground(ctx, style, size, unit, assets.background);

  rects.forEach((rect, i) => {
    const item = getActiveItem(cells[i], time);
    const source = item ? resolve(item) : null;
    const fade = boxFades[i];
    if (!(item && source) && !fade) return;

    ctx.save();
    traceRoundedRect(ctx, rect, style.radius * unit);
    ctx.clip();
    if (item && source) {
      const drawRect = getImageRect(getImageSize(item), rect, item.transform);
      // Source rectangle = the cropped part of the picture/frame.
      const src = sourceSize(source);
      const { crop } = item;
      ctx.drawImage(
        source,
        crop.x * src.width,
        crop.y * src.height,
        crop.w * src.width,
        crop.h * src.height,
        rect.x + drawRect.x,
        rect.y + drawRect.y,
        drawRect.width,
        drawRect.height,
      );
    }
    if (fade) drawBoxFade(ctx, rect, fade);
    ctx.restore();
  });

  drawElements(ctx, elements, size, unit, assets.stickers);
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
    const [assets] = await Promise.all([
      loadDrawAssets(snapshot),
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

    drawTemplate(
      ctx,
      snapshot,
      { width, height },
      time,
      (item) => sources.get(item.id) ?? null,
      assets,
    );
    return canvas;
  } finally {
    videos.forEach(releaseVideo);
  }
}
