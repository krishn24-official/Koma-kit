import { useDrag } from '@use-gesture/react';
import { useRef } from 'react';
import type { CellRect, Size } from '@/types';
import { cn } from '@/utils/cn';
import { clamp } from '@/utils/math';

type Handle = 'top' | 'bottom' | 'left' | 'right' | 'tl' | 'tr' | 'bl' | 'br' | 'move';

/** Edges within this many screen pixels of a snap line jump onto it. */
const SNAP_PX = 10;

const moves = (handle: Handle) => ({
  left: ['left', 'tl', 'bl'].includes(handle),
  right: ['right', 'tr', 'br'].includes(handle),
  top: ['top', 'tl', 'tr'].includes(handle),
  bottom: ['bottom', 'bl', 'br'].includes(handle),
});

function snap(value: number, lines: number[] | undefined, tolerance: number): number {
  let best = value;
  let distance = tolerance;
  for (const line of lines ?? []) {
    const d = Math.abs(line - value);
    if (d < distance) {
      best = line;
      distance = d;
    }
  }
  return best;
}

export interface CropFrameProps {
  /** Crop in fractions of the area (0–1). */
  rect: CellRect;
  onChange: (rect: CellRect) => void;
  /** On-screen size of the area being cropped, in pixels. */
  size: Size;
  /** Optional lines (fractions) that edges snap to. */
  snapLines?: { xs: number[]; ys: number[] };
  /** Rotation of the area on screen, so drags follow the picture's own axes. */
  rotation?: number;
  /** Smallest crop, as a fraction of the area. */
  minSize?: number;
  /** Shown at the top of the frame, e.g. the resulting size. */
  label?: string;
}

/**
 * A crop frame: darkened outside, edges and corners to resize, drag the middle to move.
 * Sits on top of the area it crops (`absolute inset-0`).
 */
export function CropFrame({
  rect,
  onChange,
  size,
  snapLines,
  rotation = 0,
  minSize = 0.1,
  label,
}: CropFrameProps) {
  // Latest rect for the gesture handler, which outlives a single render.
  const rectRef = useRef(rect);
  rectRef.current = rect;

  const bind = useDrag(
    ({ args, movement: [mx, my], first, memo, event }) => {
      event.stopPropagation();
      const [handle] = args as [Handle];
      const start: CellRect = first || !memo ? rectRef.current : memo;

      // Undo the rotation so dragging "right" on screen moves the picture's right edge.
      const a = (-rotation * Math.PI) / 180;
      const lx = mx * Math.cos(a) - my * Math.sin(a);
      const ly = mx * Math.sin(a) + my * Math.cos(a);
      const dx = lx / size.width;
      const dy = ly / size.height;
      const tolX = SNAP_PX / size.width;
      const tolY = SNAP_PX / size.height;

      if (handle === 'move') {
        onChange({
          ...start,
          x: clamp(start.x + dx, 0, 1 - start.w),
          y: clamp(start.y + dy, 0, 1 - start.h),
        });
        return start;
      }

      const m = moves(handle);
      let left = start.x;
      let right = start.x + start.w;
      let top = start.y;
      let bottom = start.y + start.h;
      if (m.left) left = clamp(snap(left + dx, snapLines?.xs, tolX), 0, right - minSize);
      if (m.right) right = clamp(snap(right + dx, snapLines?.xs, tolX), left + minSize, 1);
      if (m.top) top = clamp(snap(top + dy, snapLines?.ys, tolY), 0, bottom - minSize);
      if (m.bottom) bottom = clamp(snap(bottom + dy, snapLines?.ys, tolY), top + minSize, 1);

      onChange({ x: left, y: top, w: right - left, h: bottom - top });
      return start;
    },
    { pointer: { capture: true } },
  );

  const px = {
    left: rect.x * size.width,
    top: rect.y * size.height,
    width: rect.w * size.width,
    height: rect.h * size.height,
  };
  const shade = 'pointer-events-none absolute bg-black/65';
  const edge = 'absolute touch-none';
  const corner = 'absolute size-7 touch-none rounded-sm border-white';

  return (
    // Swallows pointer events so nothing underneath (boxes, elements) moves while cropping.
    <div className="absolute inset-0 touch-none" onPointerDown={(e) => e.stopPropagation()}>
      <div className={shade} style={{ left: 0, top: 0, right: 0, height: px.top }} />
      <div className={shade} style={{ left: 0, top: px.top + px.height, right: 0, bottom: 0 }} />
      <div className={shade} style={{ left: 0, top: px.top, width: px.left, height: px.height }} />
      <div
        className={shade}
        style={{ left: px.left + px.width, top: px.top, right: 0, height: px.height }}
      />

      {/* The move area and the grips are siblings so a grip drag never also moves. */}
      <div className="absolute" style={px}>
        <div
          {...bind('move')}
          className="absolute inset-0 cursor-move touch-none border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
        />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/30" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white/30" />
          <div className="absolute inset-x-0 top-1/3 h-px bg-white/30" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-white/30" />
        </div>

        <div {...bind('top')} className={cn(edge, '-top-3 right-6 left-6 h-6 cursor-ns-resize')} />
        <div {...bind('bottom')} className={cn(edge, 'right-6 -bottom-3 left-6 h-6 cursor-ns-resize')} />
        <div {...bind('left')} className={cn(edge, 'top-6 bottom-6 -left-3 w-6 cursor-ew-resize')} />
        <div {...bind('right')} className={cn(edge, 'top-6 -right-3 bottom-6 w-6 cursor-ew-resize')} />

        <div {...bind('tl')} className={cn(corner, '-top-1 -left-1 cursor-nwse-resize border-t-4 border-l-4')} />
        <div {...bind('tr')} className={cn(corner, '-top-1 -right-1 cursor-nesw-resize border-t-4 border-r-4')} />
        <div {...bind('bl')} className={cn(corner, '-bottom-1 -left-1 cursor-nesw-resize border-b-4 border-l-4')} />
        <div {...bind('br')} className={cn(corner, '-right-1 -bottom-1 cursor-nwse-resize border-r-4 border-b-4')} />

        {label && (
          <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-3 py-1 text-xs font-medium whitespace-nowrap text-white tabular-nums">
            {label}
          </div>
        )}
      </div>
    </div>
  );
}
