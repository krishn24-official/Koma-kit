/**
 * Timed elements: when a picture/text shows on the timeline and how it appears and
 * disappears (fade, slide, zoom, pop, blur) plus an optional slow zoom. One function
 * works out the look at any moment; the preview (CSS) and the downloads (canvas) both
 * use it, so they match frame for frame.
 */
import type { CanvasElement, ElementTiming, ElementTransition } from '@/types';
import { clamp } from './math';

export const TRANSITIONS: ReadonlyArray<{ id: ElementTransition; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade' },
  { id: 'slide-up', label: 'Slide up' },
  { id: 'slide-down', label: 'Slide down' },
  { id: 'slide-left', label: 'Slide left' },
  { id: 'slide-right', label: 'Slide right' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'pop', label: 'Pop' },
  { id: 'blur', label: 'Blur' },
];

export const DEFAULT_TIMING: ElementTiming = {
  from: 0,
  until: null,
  enter: 'fade',
  exit: 'fade',
  duration: 0.5,
  slowZoom: false,
};

/** How an element looks at one moment. Offsets are fractions of the canvas size. */
export interface Appearance {
  visible: boolean;
  /** 0–1, multiplied with the element's own opacity. */
  opacity: number;
  dx: number;
  dy: number;
  scale: number;
  /** Blur radius in design units. */
  blur: number;
}

const SHOWN: Appearance = { visible: true, opacity: 1, dx: 0, dy: 0, scale: 1, blur: 0 };
const HIDDEN: Appearance = { visible: false, opacity: 0, dx: 0, dy: 0, scale: 1, blur: 0 };

/** How far slides travel (fraction of the canvas). */
const SLIDE = 0.08;
/** Slow zoom grows to this much bigger by the time the element leaves. */
const SLOW_ZOOM = 0.08;

const easeOut = (p: number) => 1 - (1 - p) ** 3;
/** Overshoots a little, then settles (for "pop"). */
const easeOutBack = (p: number) => {
  const c = 1.7;
  return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2;
};

/** The look of one transition at progress p (0 = fully away, 1 = fully shown). */
function transitionLook(kind: ElementTransition, p: number): Omit<Appearance, 'visible'> {
  const e = easeOut(p);
  switch (kind) {
    case 'fade':
      return { opacity: e, dx: 0, dy: 0, scale: 1, blur: 0 };
    case 'slide-up':
      return { opacity: e, dx: 0, dy: (1 - e) * SLIDE, scale: 1, blur: 0 };
    case 'slide-down':
      return { opacity: e, dx: 0, dy: -(1 - e) * SLIDE, scale: 1, blur: 0 };
    case 'slide-left':
      return { opacity: e, dx: (1 - e) * SLIDE, dy: 0, scale: 1, blur: 0 };
    case 'slide-right':
      return { opacity: e, dx: -(1 - e) * SLIDE, dy: 0, scale: 1, blur: 0 };
    case 'zoom':
      return { opacity: e, dx: 0, dy: 0, scale: 0.8 + 0.2 * e, blur: 0 };
    case 'pop':
      return {
        opacity: Math.min(1, p * 2),
        dx: 0,
        dy: 0,
        scale: 0.5 + 0.5 * easeOutBack(p),
        blur: 0,
      };
    case 'blur':
      return { opacity: e, dx: 0, dy: 0, scale: 1, blur: (1 - e) * 24 };
    default:
      return { opacity: 1, dx: 0, dy: 0, scale: 1, blur: 0 };
  }
}

/**
 * The element's look at timeline time `t`. `timelineEnd` is the timeline length, used
 * for "until the end" with the slow zoom.
 */
export function getAppearance(el: CanvasElement, t: number, timelineEnd: number): Appearance {
  const timing = el.timing;
  if (!timing) return SHOWN;
  const until = timing.until ?? Infinity;
  if (t < timing.from - 1e-6 || t >= until - 1e-6) return HIDDEN;

  const length = Math.max(0, until - timing.from);
  // Transitions never take more than half the time it's shown.
  const d = Math.min(timing.duration, length / 2);
  const sinceStart = t - timing.from;
  const untilEnd = until - t;

  let look = { opacity: 1, dx: 0, dy: 0, scale: 1, blur: 0 };
  if (d > 0 && timing.enter !== 'none' && sinceStart < d) {
    look = transitionLook(timing.enter, sinceStart / d);
  } else if (d > 0 && timing.exit !== 'none' && untilEnd < d) {
    look = transitionLook(timing.exit, untilEnd / d);
  }

  if (timing.slowZoom) {
    const end = Number.isFinite(until) ? until : Math.max(timing.from + 1, timelineEnd);
    look.scale *= 1 + SLOW_ZOOM * clamp((t - timing.from) / (end - timing.from), 0, 1);
  }
  return { visible: true, ...look };
}

/** Latest moment any timed element is still showing (for the timeline length). */
export const elementsEnd = (elements: readonly CanvasElement[]): number =>
  elements.reduce((end, el) => {
    if (!el.timing || el.hidden) return end;
    return Math.max(end, el.timing.until ?? el.timing.from);
  }, 0);

/** True if any element is shown only part of the time. */
export const hasTimedElements = (elements: readonly CanvasElement[]): boolean =>
  elements.some((el) => el.timing && !el.hidden);
