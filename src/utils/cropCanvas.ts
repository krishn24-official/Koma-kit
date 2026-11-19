import { sizeForRatio, toDesignSize } from '@/constants/canvasSizes';
import { STYLE_LIMITS } from '@/constants/editor';
import type {
  CanvasSize,
  CanvasStyle,
  CellMedia,
  CellRect,
  ImageTransform,
  PixelRect,
  TextOverlay,
} from '@/types';
import { clampTransform, getCoverScale, getImageRect, getImageSize } from './imageTransform';
import { getCellRects } from './layoutMath';
import { clamp } from './math';

export interface CropInput {
  canvasSize: CanvasSize;
  style: CanvasStyle;
  layoutCells: CellRect[];
  cells: Record<number, CellMedia[]>;
  texts: TextOverlay[];
}

export type CropResult = Pick<CropInput, 'canvasSize' | 'style' | 'cells' | 'texts'>;

/**
 * Transform that draws an item at `target` (absolute design pixels) inside `cell`.
 * Inverse of getImageRect.
 */
function transformForRect(item: CellMedia, cell: PixelRect, target: PixelRect): ImageTransform {
  const size = getImageSize(item);
  const scale = target.width / size.width / getCoverScale(size, cell);
  const offsetX = (target.x + target.width / 2 - (cell.x + cell.width / 2)) / cell.width;
  const offsetY = (target.y + target.height / 2 - (cell.y + cell.height / 2)) / cell.height;
  return clampTransform({ scale, offsetX, offsetY }, size, cell);
}

/**
 * Crops the canvas to `crop` (fractions of the canvas) and keeps everything inside it
 * where it was: pictures, text, gaps and the border are moved and scaled so the
 * result looks like the cropped area of the old canvas.
 */
export function cropCanvas(input: CropInput, crop: CellRect): CropResult {
  const old = toDesignSize(input.canvasSize);
  const x0 = crop.x * old.width;
  const y0 = crop.y * old.height;
  const cropW = crop.w * old.width;
  const cropH = crop.h * old.height;

  const canvasSize: CanvasSize = {
    ...sizeForRatio(cropW / cropH, input.canvasSize.width, false),
    exact: input.canvasSize.exact,
  };
  const next = toDesignSize(canvasSize);
  // Everything is stored in design units (canvas = 1080 wide), so a narrower crop
  // makes everything inside it proportionally bigger.
  const k = next.width / cropW;

  const style: CanvasStyle = {
    ...input.style,
    gap: clamp(input.style.gap * k, 0, STYLE_LIMITS.gap.max),
    padding: clamp(input.style.padding * k, 0, STYLE_LIMITS.padding.max),
    radius: clamp(input.style.radius * k, 0, STYLE_LIMITS.radius.max),
    backgroundBlur: input.style.backgroundBlur * k,
  };

  const oldRects = getCellRects(input.layoutCells, old, input.style, 1);
  const newRects = getCellRects(input.layoutCells, next, style, 1);

  const cells: Record<number, CellMedia[]> = {};
  for (const [key, items] of Object.entries(input.cells)) {
    const i = Number(key);
    const oldCell = oldRects[i];
    const newCell = newRects[i];
    if (!oldCell || !newCell || newCell.width <= 0 || newCell.height <= 0) {
      cells[i] = items;
      continue;
    }
    cells[i] = items.map((item) => {
      const drawn = getImageRect(getImageSize(item), oldCell, item.transform);
      const target = {
        x: (oldCell.x + drawn.x - x0) * k,
        y: (oldCell.y + drawn.y - y0) * k,
        width: drawn.width * k,
        height: drawn.height * k,
      };
      return { ...item, transform: transformForRect(item, newCell, target) };
    });
  }

  const texts = input.texts.map((text) => ({
    ...text,
    x: (text.x * old.width - x0) / cropW,
    y: (text.y * old.height - y0) / cropH,
    fontSize: text.fontSize * k,
  }));

  return { canvasSize, style, cells, texts };
}
