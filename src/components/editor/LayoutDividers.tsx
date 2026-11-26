import { useDrag } from '@use-gesture/react';
import { useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import type { LayoutDivider, Size } from '@/types';
import { cn } from '@/utils/cn';
import { getDividers } from '@/utils/layoutTree';

/** Touch-friendly hit area around each divider, in screen pixels. */
const HIT_SIZE = 22;
/** Where the tilt grip sits along the divider (from its start). */
const TILT_GRIP_AT = 0.16;

interface DividerHandleProps {
  divider: LayoutDivider;
  /** Inner canvas area in preview pixels (canvas minus outer border). */
  inner: { x: number; y: number; width: number; height: number };
}

/** The divider's two ends in preview pixels (slanted dividers have ends apart). */
function dividerEnds(divider: LayoutDivider, inner: DividerHandleProps['inner']) {
  const { area, position, tilt } = divider;
  const px = (x: number) => inner.x + x * inner.width;
  const py = (y: number) => inner.y + y * inner.height;
  if (divider.direction === 'horizontal') {
    return {
      start: { x: px(position - (tilt / 2) * area.w), y: py(area.y) },
      end: { x: px(position + (tilt / 2) * area.w), y: py(area.y + area.h) },
    };
  }
  return {
    start: { x: px(area.x), y: py(position - (tilt / 2) * area.h) },
    end: { x: px(area.x + area.w), y: py(position + (tilt / 2) * area.h) },
  };
}

function DividerHandle({ divider, inner }: DividerHandleProps) {
  const [dragging, setDragging] = useState(false);
  const horizontal = divider.direction === 'horizontal';
  const { area } = divider;

  // Length of the split along the drag direction, used to turn pixels into a fraction.
  const splitLength = horizontal ? area.w * inner.width : area.h * inner.height;

  const bindMove = useDrag(
    ({ delta: [dx, dy], first, last }) => {
      if (first) setDragging(true);
      if (last) setDragging(false);
      const moved = horizontal ? dx : dy;
      if (moved === 0 || splitLength <= 0) return;
      useEditorStore.getState().resizeDivider(divider.path, divider.boundary, moved / splitLength);
    },
    { pointer: { capture: true } },
  );

  // Tilt: the grip near the start moves that end; the far end moves the opposite way,
  // so the divider turns around its middle.
  const bindTilt = useDrag(
    ({ delta: [dx, dy], event }) => {
      event.stopPropagation();
      const moved = horizontal ? dx : dy;
      if (moved === 0 || splitLength <= 0) return;
      // Read the latest tilt (this handler runs many times during one drag).
      const latest = getDividers(useEditorStore.getState().layoutRoot).find(
        (d) => d.path.join('.') === divider.path.join('.') && d.boundary === divider.boundary,
      );
      const tilt = (latest?.tilt ?? divider.tilt) - (2 * moved) / splitLength;
      useEditorStore.getState().setDividerTilt(divider.path, divider.boundary, tilt);
    },
    { pointer: { capture: true } },
  );

  const { start, end } = dividerEnds(divider, inner);
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const angle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
  const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  // Where lines meet (a T-junction), the inner line's touch area is pulled back from its
  // ends so it doesn't cover the outer line. Outer (shallower) lines also sit on top.
  const inset = HIT_SIZE / 2;
  const zIndex = Math.max(10, 15 - divider.path.length);
  const grip = {
    x: start.x + (end.x - start.x) * TILT_GRIP_AT,
    y: start.y + (end.y - start.y) * TILT_GRIP_AT,
  };

  return (
    <>
      <div
        {...bindMove()}
        role="separator"
        aria-orientation={horizontal ? 'vertical' : 'horizontal'}
        aria-label="Drag to resize boxes"
        className={cn(
          'group absolute flex touch-none items-center justify-center',
          horizontal ? 'cursor-col-resize' : 'cursor-row-resize',
        )}
        style={{
          left: center.x - Math.max(0, length - inset * 2) / 2,
          top: center.y - HIT_SIZE / 2,
          width: Math.max(0, length - inset * 2),
          height: HIT_SIZE,
          transform: `rotate(${angle}deg)`,
          zIndex,
        }}
      >
        <span
          className={cn(
            'h-1.5 w-7 max-w-[60%] rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_1px_4px_rgba(0,0,0,0.6)] transition-opacity',
            dragging ? 'opacity-100' : 'opacity-70 group-hover:opacity-100',
          )}
        />
      </div>
      <div
        {...bindTilt()}
        role="slider"
        aria-label="Drag to tilt this line"
        aria-valuenow={Math.round(divider.tilt * 100)}
        title="Drag to tilt"
        className={cn(
          'absolute flex size-7 touch-none items-center justify-center',
          horizontal ? 'cursor-ew-resize' : 'cursor-ns-resize',
        )}
        style={{ left: grip.x - 14, top: grip.y - 14, zIndex: zIndex + 1 }}
      >
        <span className="size-3 rounded-full border-2 border-white bg-brand-500 shadow-[0_0_0_1px_rgba(0,0,0,0.5)]" />
      </div>
    </>
  );
}

interface LayoutDividersProps {
  canvasSize: Size;
  /** Outer border in preview pixels. */
  padding: number;
}

/** Draggable grips on every line between boxes. Editor only; not part of the export. */
export function LayoutDividers({ canvasSize, padding }: LayoutDividersProps) {
  const layoutRoot = useEditorStore((s) => s.layoutRoot);
  const inner = {
    x: padding,
    y: padding,
    width: Math.max(0, canvasSize.width - padding * 2),
    height: Math.max(0, canvasSize.height - padding * 2),
  };

  return (
    <>
      {getDividers(layoutRoot).map((divider) => (
        <DividerHandle
          key={`${divider.path.join('.')}-${divider.boundary}`}
          divider={divider}
          inner={inner}
        />
      ))}
    </>
  );
}
