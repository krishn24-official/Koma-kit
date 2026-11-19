import { IMAGE_TAIL_SECONDS } from '@/constants/editor';
import type { CellMedia } from '@/types';
import { clamp } from './math';

const EPSILON = 1e-6;
/** Videos stop slightly before their end, so the last frame is always decodable. */
const END_MARGIN = 0.04;

/** Index of the item showing at `time` (the last one that has started), or -1. */
export function getActiveItemIndex(items: readonly CellMedia[] | undefined, time: number): number {
  if (!items) return -1;
  let active = -1;
  for (let i = 0; i < items.length; i++) {
    if (items[i]!.start <= time + EPSILON) active = i;
    else break;
  }
  return active;
}

export function getActiveItem(
  items: readonly CellMedia[] | undefined,
  time: number,
): CellMedia | null {
  const index = getActiveItemIndex(items, time);
  return index >= 0 ? items![index]! : null;
}

/**
 * Total timeline length. It is 0 (no timeline) until the template has a video or an
 * image scheduled after the start.
 */
export function getTimelineDuration(
  cells: Record<number, CellMedia[]>,
  cellCount: number,
): number {
  let duration = 0;
  let timed = false;

  for (let i = 0; i < cellCount; i++) {
    for (const item of cells[i] ?? []) {
      if (item.kind === 'video') {
        timed = true;
        duration = Math.max(duration, item.start + item.duration);
      } else if (item.start > 0) {
        timed = true;
        duration = Math.max(duration, item.start + IMAGE_TAIL_SECONDS);
      }
    }
  }

  return timed ? duration : 0;
}

/** Time inside a video for a timeline time. It holds the last frame after the video ends. */
type Timing = Pick<CellMedia, 'start' | 'duration'>;

export const getVideoLocalTime = (item: Timing, time: number): number =>
  clamp(time - item.start, 0, Math.max(0, item.duration - END_MARGIN));

/** True while a video should actually be playing (not before its start or after its end). */
export const isVideoRunning = (item: Timing, time: number): boolean => {
  const local = time - item.start;
  return local >= 0 && local < item.duration - END_MARGIN;
};

/** 75.3 → "1:15.3" */
export function formatTime(seconds: number): string {
  const tenths = Math.floor(Math.max(0, seconds) * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = ((tenths % 600) / 10).toFixed(1).padStart(4, '0');
  return `${minutes}:${rest}`;
}
