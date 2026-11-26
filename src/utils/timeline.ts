import { IMAGE_TAIL_SECONDS } from '@/constants/editor';
import type { CanvasElement, CellMedia } from '@/types';
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
  elements: readonly CanvasElement[] = [],
): number {
  let duration = 0;
  let timed = false;

  // Pictures/text shown at certain times also make a timeline.
  for (const el of elements) {
    if (!el.timing || el.hidden) continue;
    timed = true;
    duration = Math.max(duration, el.timing.until ?? el.timing.from + IMAGE_TAIL_SECONDS);
  }

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

type Timing = Pick<CellMedia, 'start' | 'delay' | 'trimStart' | 'trimEnd' | 'loop'>;

/** When a video actually starts playing (it shows its first frame from `start`). */
export const getPlayStart = (item: Timing): number => item.start + item.delay;

/** How long a video plays on the timeline after trimming. */
export const getPlayLength = (item: Timing): number => Math.max(0, item.trimEnd - item.trimStart);

/**
 * Position in the video file (seconds) for a timeline time, respecting the trim.
 * It holds the last kept frame after the trimmed clip ends, or starts over if it loops.
 */
export const getVideoLocalTime = (item: Timing, time: number): number => {
  const length = getPlayLength(item);
  const elapsed = time - getPlayStart(item);
  if (item.loop && elapsed > 0 && length > END_MARGIN * 2) {
    return item.trimStart + Math.min(elapsed % length, length - END_MARGIN);
  }
  return item.trimStart + clamp(elapsed, 0, Math.max(0, length - END_MARGIN));
};

/**
 * Timeline time at which the video file is at `fileTime` (inverse of getVideoLocalTime).
 * A looping clip is at that point once per repeat: the repeat closest to `near` (the
 * current timeline time) is used.
 */
export const getTimelineTimeOf = (item: Timing, fileTime: number, near?: number): number => {
  const first = getPlayStart(item) + (fileTime - item.trimStart);
  const length = getPlayLength(item);
  if (!item.loop || near === undefined || length <= 0) return first;
  return first + Math.max(0, Math.round((near - first) / length)) * length;
};

/** True while a video should actually be playing (not before its start or after its end). */
export const isVideoRunning = (item: Timing, time: number): boolean => {
  const local = time - getPlayStart(item);
  if (item.loop) return local >= 0;
  return local >= 0 && local < getPlayLength(item) - END_MARGIN;
};

/** 75.3 → "1:15.3" */
export function formatTime(seconds: number): string {
  const tenths = Math.floor(Math.max(0, seconds) * 10);
  const minutes = Math.floor(tenths / 600);
  const rest = ((tenths % 600) / 10).toFixed(1).padStart(4, '0');
  return `${minutes}:${rest}`;
}
