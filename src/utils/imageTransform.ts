import { MAX_ZOOM } from '@/constants/editor';
import type { CellMedia, CellRect, ImageTransform, PixelRect, Size } from '@/types';
import { clamp } from './math';

/** Size of the part of the media that is used (after cropping), in its own pixels. */
export const getImageSize = (
  image: Pick<CellMedia, 'naturalWidth' | 'naturalHeight'> & { crop?: CellRect },
): Size => ({
  width: image.naturalWidth * (image.crop?.w ?? 1),
  height: image.naturalHeight * (image.crop?.h ?? 1),
});

/** Scale at which the image exactly covers the cell (no empty space). */
export const getCoverScale = (image: Size, cell: Size): number =>
  Math.max(cell.width / image.width, cell.height / image.height);

/** Scale at which the whole image is visible inside the cell. */
export const getContainScale = (image: Size, cell: Size): number =>
  Math.min(cell.width / image.width, cell.height / image.height);

/** Zoom limits relative to cover: min shows the whole image, max is MAX_ZOOM× cover. */
export function getZoomBounds(image: Size, cell: Size): { min: number; max: number } {
  const min = getContainScale(image, cell) / getCoverScale(image, cell);
  return { min: Math.min(min, 1), max: MAX_ZOOM };
}

/**
 * Keeps zoom within bounds and stops the image from being dragged out of the cell.
 * When zoomed in, no empty edges can appear.
 * When zoomed out, the image cannot leave the cell.
 */
export function clampTransform(transform: ImageTransform, image: Size, cell: Size): ImageTransform {
  if (cell.width <= 0 || cell.height <= 0 || image.width <= 0 || image.height <= 0) {
    return transform;
  }

  const { min, max } = getZoomBounds(image, cell);
  const scale = clamp(transform.scale, min, max);
  const drawScale = getCoverScale(image, cell) * scale;

  const maxOffsetX = Math.abs(image.width * drawScale - cell.width) / 2 / cell.width;
  const maxOffsetY = Math.abs(image.height * drawScale - cell.height) / 2 / cell.height;

  return {
    scale,
    offsetX: clamp(transform.offsetX, -maxOffsetX, maxOffsetX),
    offsetY: clamp(transform.offsetY, -maxOffsetY, maxOffsetY),
  };
}

/** Where to draw the image, relative to the cell's top-left corner. */
export function getImageRect(image: Size, cell: Size, transform: ImageTransform): PixelRect {
  const t = clampTransform(transform, image, cell);
  const drawScale = getCoverScale(image, cell) * t.scale;
  const width = image.width * drawScale;
  const height = image.height * drawScale;
  const centerX = cell.width / 2 + t.offsetX * cell.width;
  const centerY = cell.height / 2 + t.offsetY * cell.height;

  return { x: centerX - width / 2, y: centerY - height / 2, width, height };
}

/** Transform that shows the entire image inside the cell. */
export const getFitTransform = (image: Size, cell: Size): ImageTransform => ({
  scale: getZoomBounds(image, cell).min,
  offsetX: 0,
  offsetY: 0,
});

/**
 * Preview layout for cropped media in a box: `frame` is where the visible (cropped) part
 * goes, relative to the box; `media` is where the whole picture/video sits inside that
 * clipping frame so only the cropped part shows.
 */
export function getCroppedMediaLayout(
  item: Pick<CellMedia, 'naturalWidth' | 'naturalHeight' | 'crop' | 'transform'>,
  cell: Size,
) {
  const frame = getImageRect(getImageSize(item), cell, item.transform);
  const width = frame.width / item.crop.w;
  const height = frame.height / item.crop.h;
  return {
    frame,
    media: { left: -item.crop.x * width, top: -item.crop.y * height, width, height },
  };
}
