import { DESIGN_WIDTH, MAX_RATIO } from '@/constants/canvasSizes';
import type { CanvasStyle, CellRect, Size } from '@/types';
import { getCellRects } from './layoutMath';

/**
 * Finds the canvas shape (width / height) at which the boxes best match the shapes of
 * their pictures, so each picture can fill its box without being cut off.
 *
 * Only the canvas height changes; every box scales together, so the layout keeps its
 * proportions. Gaps and the outer border are taken into account. With one picture
 * (or pictures that agree) the match is exact; otherwise it's the best compromise.
 *
 * @param media  picture size per cell index, or null for empty boxes
 * @returns the ratio, or null if there are no pictures
 */
export function findBestCanvasRatio(
  cells: CellRect[],
  style: Pick<CanvasStyle, 'gap' | 'padding'>,
  media: Array<Size | null>,
): number | null {
  const targets = cells.flatMap((_, i) => {
    const size = media[i];
    return size && size.width > 0 && size.height > 0
      ? [{ i, aspect: size.width / size.height }]
      : [];
  });
  if (targets.length === 0) return null;

  // Total squared log-mismatch between box shapes and picture shapes.
  const mismatch = (logRatio: number) => {
    const height = DESIGN_WIDTH / Math.exp(logRatio);
    const rects = getCellRects(cells, { width: DESIGN_WIDTH, height }, style, 1);
    return targets.reduce((sum, { i, aspect }) => {
      const rect = rects[i];
      if (!rect || rect.width <= 0 || rect.height <= 0) return sum + 100;
      const diff = Math.log(rect.width / rect.height / aspect);
      return sum + diff * diff;
    }, 0);
  };

  // Golden-section search over log(ratio) between 1:4 and 4:1.
  let lo = -Math.log(MAX_RATIO);
  let hi = Math.log(MAX_RATIO);
  const g = (Math.sqrt(5) - 1) / 2;
  for (let step = 0; step < 60; step++) {
    const a = hi - g * (hi - lo);
    const b = lo + g * (hi - lo);
    if (mismatch(a) < mismatch(b)) hi = b;
    else lo = a;
  }
  return Math.exp((lo + hi) / 2);
}
