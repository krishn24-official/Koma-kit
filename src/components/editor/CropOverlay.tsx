import { useDrag } from '@use-gesture/react';
import { useMemo } from 'react';
import { describeRatio } from '@/constants/canvasSizes';
import { useCurrentLayout } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUiStore } from '@/store/useUiStore';
import type { CellRect, Size } from '@/types';
import { cn } from '@/utils/cn';
import { getImageRect, getImageSize } from '@/utils/imageTransform';
import { getCellRects } from '@/utils/layoutMath';
import { clamp } from '@/utils/math';
import { getActiveItem } from '@/utils/timeline';

type Handle = 'top' | 'bottom' | 'left' | 'right' | 'tl' | 'tr' | 'bl' | 'br' | 'move';

/** Smallest crop, as a fraction of the canvas. */
const MIN_SIZE = 0.1;
/** Edges within this many screen pixels of a picture edge snap to it. */
const SNAP_PX = 10;

const moves = (handle: Handle) => ({
  left: ['left', 'tl', 'bl'].includes(handle),
  right: ['right', 'tr', 'br'].includes(handle),
  top: ['top', 'tl', 'tr'].includes(handle),
  bottom: ['bottom', 'bl', 'br'].includes(handle),
});

/** Picture edges on screen (fractions of the canvas), used as snap targets. */
function useSnapLines(size: Size, unit: number) {
  const layout = useCurrentLayout();
  const style = useEditorStore((s) => s.style);
  const cells = useEditorStore((s) => s.cells);
  const time = usePlaybackStore((s) => s.currentTime);

  return useMemo(() => {
    const xs = [0, 1];
    const ys = [0, 1];
    getCellRects(layout.cells, size, style, unit).forEach((cell, i) => {
      const item = getActiveItem(cells[i], time);
      if (!item) return;
      const r = getImageRect(getImageSize(item), cell, item.transform);
      // The visible part of the picture is clipped to its box.
      const left = Math.max(cell.x, cell.x + r.x);
      const right = Math.min(cell.x + cell.width, cell.x + r.x + r.width);
      const top = Math.max(cell.y, cell.y + r.y);
      const bottom = Math.min(cell.y + cell.height, cell.y + r.y + r.height);
      xs.push(left / size.width, right / size.width);
      ys.push(top / size.height, bottom / size.height);
    });
    return { xs, ys };
  }, [layout, style, cells, time, size, unit]);
}

function snap(value: number, lines: number[], tolerance: number): number {
  let best = value;
  let distance = tolerance;
  for (const line of lines) {
    const d = Math.abs(line - value);
    if (d < distance) {
      best = line;
      distance = d;
    }
  }
  return best;
}

interface CropOverlayProps {
  size: Size;
  unit: number;
}

/**
 * Crop frame over the canvas. Drag edges/corners to resize or the middle to move;
 * edges snap to picture edges. Apply/Cancel live in the toolbar under the canvas.
 */
export function CropOverlay({ size, unit }: CropOverlayProps) {
  const rect = useUiStore((s) => s.cropRect);
  const setCropRect = useUiStore((s) => s.setCropRect);
  const canvasSize = useEditorStore((s) => s.canvasSize);
  const snapLines = useSnapLines(size, unit);

  const bind = useDrag(
    ({ args, movement: [mx, my], first, memo }) => {
      const [handle] = args as [Handle];
      const start: CellRect = first || !memo ? useUiStore.getState().cropRect! : memo;
      const dx = mx / size.width;
      const dy = my / size.height;
      const tolX = SNAP_PX / size.width;
      const tolY = SNAP_PX / size.height;

      if (handle === 'move') {
        setCropRect({
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
      if (m.left) left = clamp(snap(left + dx, snapLines.xs, tolX), 0, right - MIN_SIZE);
      if (m.right) right = clamp(snap(right + dx, snapLines.xs, tolX), left + MIN_SIZE, 1);
      if (m.top) top = clamp(snap(top + dy, snapLines.ys, tolY), 0, bottom - MIN_SIZE);
      if (m.bottom) bottom = clamp(snap(bottom + dy, snapLines.ys, tolY), top + MIN_SIZE, 1);

      setCropRect({ x: left, y: top, w: right - left, h: bottom - top });
      return start;
    },
    { pointer: { capture: true } },
  );

  if (!rect) return null;

  const px = {
    left: rect.x * size.width,
    top: rect.y * size.height,
    width: rect.w * size.width,
    height: rect.h * size.height,
  };
  const outW = Math.round(canvasSize.width * rect.w);
  const outH = Math.round(canvasSize.height * rect.h);
  const shade = 'pointer-events-none absolute bg-black/65';
  const edge = 'absolute touch-none';
  const corner = 'absolute size-7 touch-none rounded-sm border-white';

  return (
    // Covers the canvas so boxes and text can't be dragged while cropping.
    <div className="absolute inset-0 z-30 touch-none">
      <div className={shade} style={{ left: 0, top: 0, right: 0, height: px.top }} />
      <div
        className={shade}
        style={{ left: 0, top: px.top + px.height, right: 0, bottom: 0 }}
      />
      <div className={shade} style={{ left: 0, top: px.top, width: px.left, height: px.height }} />
      <div
        className={shade}
        style={{ left: px.left + px.width, top: px.top, right: 0, height: px.height }}
      />

      {/* Frame. The move area and the grips are siblings so a grip drag never also
          starts a move. */}
      <div className="absolute" style={px}>
        <div
          {...bind('move')}
          className="absolute inset-0 cursor-move touch-none border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
        />
        {/* Rule-of-thirds guides */}
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

        <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-full bg-black/80 px-3 py-1 text-xs font-medium whitespace-nowrap text-white tabular-nums">
          {outW} × {outH} · {describeRatio(outW, outH)}
        </div>
      </div>
    </div>
  );
}
