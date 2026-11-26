import type {
  AspectRatio,
  BoxFade,
  CanvasElement,
  CanvasStyle,
  CellMedia,
  PictureEffects,
  PixelRect,
  ResolvedLayout,
  Size,
} from '@/types';
import { drawBackground, drawBoxFade } from './background';
import { drawElements } from './drawElements';
import { elementFonts } from './elements';
import { getImageRect, getImageSize } from './imageTransform';
import { cellOutlinePath, getCellShapes } from './layoutMath';
import { loadImage, loadVideoFrame, releaseVideo, sourceSize } from './media';
import {
  addOutline,
  applyAdjust,
  applyFade,
  hasAdjust,
  hasEffects,
  hasFade,
  makeCanvas,
} from './pictureEffects';
import { strokeShapeBorder } from './stickerShape';
import { getActiveItem, getTimelineDuration, getVideoLocalTime } from './timeline';

export interface TemplateSnapshot {
  layout: ResolvedLayout;
  aspectRatio: AspectRatio;
  style: CanvasStyle;
  cells: Record<number, CellMedia[]>;
  boxFades: Record<number, BoxFade>;
  boxEffects: Record<number, PictureEffects>;
  elements: CanvasElement[];
}

/** Returns something drawable for an item (image, video frame, decoded canvas). */
export type MediaResolver = (item: CellMedia) => CanvasImageSource | null;

/** Pictures that don't change over time, loaded once per export. */
export interface DrawAssets {
  background: CanvasImageSource | null;
  stickers: Map<string, CanvasImageSource>;
}

/** Draws a box's picture/frame (cropped, zoomed, panned) into `rect`. Call inside its clip. */
function drawMedia(
  ctx: CanvasRenderingContext2D,
  rect: PixelRect,
  item: CellMedia,
  source: CanvasImageSource,
): void {
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

/**
 * A box with effects, drawn on its own canvas in the same order as the preview:
 * picture → colors → color fade → edges fading out → glow → shadow.
 */
function drawBoxWithEffects(
  ctx: CanvasRenderingContext2D,
  rect: PixelRect,
  /** The box's outline as a path relative to `rect` (see cellOutlinePath). */
  outline: string,
  item: CellMedia,
  source: CanvasImageSource,
  fade: BoxFade | undefined,
  effects: PictureEffects,
  unit: number,
): void {
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  const local: PixelRect = { x: 0, y: 0, width: w, height: h };
  const box = makeCanvas(w, h);
  box.ctx.imageSmoothingEnabled = true;
  box.ctx.imageSmoothingQuality = 'high';
  box.ctx.clip(new Path2D(outline));
  drawMedia(box.ctx, local, item, source);
  if (hasAdjust(effects.adjust)) applyAdjust(box.ctx, w, h, effects.adjust);
  if (fade) drawBoxFade(box.ctx, local, fade);
  if (hasFade(effects.fade)) applyFade(box.ctx, w, h, effects.fade);
  strokeShapeBorder(box.ctx, outline, effects.border.width * unit, effects.border.color);
  const outlined = addOutline(box.canvas, effects, unit);
  ctx.drawImage(outlined.canvas, rect.x - outlined.offset, rect.y - outlined.offset);
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
  const { layout, aspectRatio, style, cells, boxFades, boxEffects, elements } = snapshot;
  const unit = size.width / aspectRatio.width;
  const rects = getCellShapes(layout, size, style, unit);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawBackground(ctx, style, size, unit, assets.background);

  rects.forEach((rect, i) => {
    const item = getActiveItem(cells[i], time);
    const source = item ? resolve(item) : null;
    const fade = boxFades[i];
    if (!(item && source) && !fade) return;
    const effects = boxEffects[i];
    // The box's outline: its slanted shape, or the rectangle with rounded corners.
    const outline = cellOutlinePath(rect, style.radius * unit);
    if (item && source && effects && hasEffects(effects)) {
      drawBoxWithEffects(ctx, rect, outline, item, source, fade, effects, unit);
      return;
    }

    ctx.save();
    ctx.translate(rect.x, rect.y);
    ctx.clip(new Path2D(outline));
    ctx.translate(-rect.x, -rect.y);
    if (item && source) drawMedia(ctx, rect, item, source);
    if (fade) drawBoxFade(ctx, rect, fade);
    ctx.restore();
  });

  const end = getTimelineDuration(cells, layout.cells.length, elements);
  drawElements(ctx, elements, size, unit, assets.stickers, time, end);
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
