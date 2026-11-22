/**
 * Card sheet: several cards (full designs or plain pictures) arranged in a grid and
 * downloaded as one image. Cards keep their own shape; every column is equally wide.
 */
import { DEFAULT_CANVAS_SIZE, toDesignSize } from '@/constants/canvasSizes';
import { DEFAULT_STYLE } from '@/constants/editor';
import { DEFAULT_LAYOUT_ID, getPreset } from '@/constants/layouts';
import type { TemplateDesign } from '@/store/useEditorStore';
import type { PixelRect, Size } from '@/types';
import { resolveLayout } from './layoutTree';
import { loadImage } from './media';
import { renderStill, type TemplateSnapshot } from './renderToCanvas';
import { restoreDesign } from './savedTemplates';

export type SheetCard =
  | {
      id: string;
      kind: 'design';
      /** Saved like a template: files kept, page-only URLs dropped. */
      design: TemplateDesign;
      /** Rendered picture of the design, for the sheet preview. */
      preview: Blob;
      /** Width / height. */
      aspect: number;
    }
  | { id: string; kind: 'image'; file: File; aspect: number };

export interface SheetSettings {
  columns: number;
  /** Output pixels. */
  cardWidth: number;
  gap: number;
  padding: number;
  radius: number;
  background: string;
}

export const DEFAULT_SHEET_SETTINGS: SheetSettings = {
  columns: 2,
  cardWidth: 1080,
  gap: 16,
  padding: 16,
  radius: 0,
  background: '#0a0a0a',
};

export const SHEET_LIMITS = {
  columns: { min: 1, max: 8 },
  cardWidth: { min: 300, max: 2000 },
  gap: { min: 0, max: 120 },
  padding: { min: 0, max: 200 },
  radius: { min: 0, max: 80 },
} as const;

export interface SheetLayout {
  size: Size;
  rects: PixelRect[];
}

/**
 * Places cards row by row, `columns` per row. A row is as tall as its tallest card;
 * shorter cards sit at the top. Sizes are in output pixels.
 */
export function layoutSheet(aspects: number[], s: SheetSettings): SheetLayout {
  const columns = Math.max(1, Math.min(s.columns, aspects.length || 1));
  const rects: PixelRect[] = [];
  let y = s.padding;
  for (let row = 0; row * columns < aspects.length; row++) {
    const inRow = aspects.slice(row * columns, row * columns + columns);
    const heights = inRow.map((a) => Math.round(s.cardWidth / a));
    inRow.forEach((_, i) => {
      rects.push({
        x: s.padding + i * (s.cardWidth + s.gap),
        y,
        width: s.cardWidth,
        height: heights[i]!,
      });
    });
    y += Math.max(...heights) + s.gap;
  }
  const height = aspects.length ? y - s.gap + s.padding : s.padding * 2;
  const width = s.padding * 2 + columns * s.cardWidth + (columns - 1) * s.gap;
  return { size: { width, height }, rects };
}

// ─── Rendering designs ───────────────────────────────────────────────────────

/** Width / height of a design. */
export const designAspect = (design: TemplateDesign): number => {
  const size = toDesignSize(design.canvasSize ?? DEFAULT_CANVAS_SIZE);
  return size.width / size.height;
};

function snapshotOf(design: TemplateDesign): TemplateSnapshot {
  return {
    layout: resolveLayout(design.layoutRoot ?? getPreset(DEFAULT_LAYOUT_ID).root),
    aspectRatio: toDesignSize(design.canvasSize ?? DEFAULT_CANVAS_SIZE),
    style: design.style ?? DEFAULT_STYLE,
    cells: design.cells ?? {},
    elements: design.elements ?? [],
    boxFades: design.boxFades ?? {},
    boxEffects: design.boxEffects ?? {},
  };
}

function revokeUrls(design: TemplateDesign): void {
  const bg = design.style?.backgroundImage;
  if (bg?.src) URL.revokeObjectURL(bg.src);
  design.elements?.forEach((el) => el.type === 'sticker' && el.src && URL.revokeObjectURL(el.src));
  Object.values(design.cells ?? {}).forEach((items) =>
    items.forEach((item) => URL.revokeObjectURL(item.src)),
  );
}

/** Renders a saved design `width` pixels wide (the first frame, for clips). */
export async function renderDesign(design: TemplateDesign, width: number) {
  const restored = restoreDesign(design);
  try {
    const snapshot = snapshotOf(restored);
    return await renderStill(snapshot, width / snapshot.aspectRatio.width, 0);
  } finally {
    revokeUrls(restored);
  }
}

// ─── Rendering the sheet ─────────────────────────────────────────────────────

/** Big canvases fail on phones; stay under these and shrink the sheet if needed. */
const MAX_SIDE = 16000;
const MAX_PIXELS = 40_000_000;

/** Output size, shrunk to fit canvas limits. `scale` is 1 unless it had to shrink. */
export function sheetOutputSize(layout: SheetLayout): Size & { scale: number } {
  const { width, height } = layout.size;
  const scale = Math.min(
    1,
    MAX_SIDE / Math.max(width, height),
    Math.sqrt(MAX_PIXELS / (width * height)),
  );
  return { width: Math.round(width * scale), height: Math.round(height * scale), scale };
}

function clipRounded(ctx: CanvasRenderingContext2D, r: PixelRect, radius: number) {
  ctx.beginPath();
  if (radius > 0) ctx.roundRect(r.x, r.y, r.width, r.height, radius);
  else ctx.rect(r.x, r.y, r.width, r.height);
  ctx.clip();
}

export async function renderSheet(
  cards: SheetCard[],
  settings: SheetSettings,
  onProgress?: (done: number, total: number) => void,
): Promise<HTMLCanvasElement> {
  const layout = layoutSheet(
    cards.map((c) => c.aspect),
    settings,
  );
  const out = sheetOutputSize(layout);
  const canvas = document.createElement('canvas');
  canvas.width = out.width;
  canvas.height = out.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = settings.background;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.scale(out.scale, out.scale);

  // One card at a time keeps memory low on phones.
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]!;
    const rect = layout.rects[i]!;
    const pixelWidth = Math.max(1, Math.round(rect.width * out.scale));
    let source: CanvasImageSource;
    let url: string | null = null;
    if (card.kind === 'design') {
      source = await renderDesign(card.design, pixelWidth);
    } else {
      url = URL.createObjectURL(card.file);
      source = await loadImage(url);
    }
    ctx.save();
    clipRounded(ctx, rect, settings.radius);
    ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
    if (url) URL.revokeObjectURL(url);
    onProgress?.(i + 1, cards.length);
  }
  return canvas;
}
