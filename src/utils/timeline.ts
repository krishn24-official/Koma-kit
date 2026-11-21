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
export function getTimelineDuration(cells: Record<number, CellMedia[]>, cellCount: number): number {
  let duration = 0;
  let timed = false;

  for (let i = 0; i < cellCount; i++) {
    for (const item of cells[i] ?? []) {
      if (item.kind === 'video') {
        timed = true;
        duration = Math.max(duration, getPlayStart(item) + getPlayLength(item));
      } else if (item.start > 0) {
        timed = true;
        duration = Math.max(duration, item.start + IMAGE_TAIL_SECONDS);
      }
    }
  }

  return timed ? duration : 0;
}

type Timing = Pick<CellMedia, 'start' | 'delay' | 'trimStart' | 'trimEnd'>;

/** When a video actually starts playing (it shows its first frame from `start`). */
export const getPlayStart = (item: Timing): number => item.start + item.delay;

/** How long a video plays on the timeline after trimming. */
export const getPlayLength = (item: Timing): number => Math.max(0, item.trimEnd - item.trimStart);

/**
 * Position in the video file (seconds) for a timeline time, respecting the trim.
 * It holds the last kept frame after the trimmed clip ends.
 */
export const getVideoLocalTime = (item: Timing, time: number): number =>
  item.trimStart +
  clamp(time - getPlayStart(item), 0, Math.max(0, getPlayLength(item) - END_MARGIN));

/** Timeline time at which the video file is at `fileTime` (inverse of getVideoLocalTime). */
export const getTimelineTimeOf = (item: Timing, fileTime: number): number =>
  getPlayStart(item) + (fileTime - item.trimStart);

/** True while a video should actually be playing (not before its start or after its end). */
export const isVideoRunning = (item: Timing, time: number): boolean => {
  const local = time - getPlayStart(item);
  return local >= 0 && local < getPlayLength(item) - END_MARGIN;
};

/** 75.3 → "1:15.3" */
export function formatTime(seconds: number): string {
  const tenths = Math.floor(Math.max(0, seconds) * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = ((tenths % 600) / 10).toFixed(1).padStart(4, '0');
  return `${minutes}:${rest}`;
}
