import { useDrag } from '@use-gesture/react';
import { useState } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import type { LayoutDivider, Size } from '@/types';
import { cn } from '@/utils/cn';
import { getDividers } from '@/utils/layoutTree';

/** Touch-friendly hit area around each divider, in screen pixels. */
const HIT_SIZE = 22;

interface DividerHandleProps {
  divider: LayoutDivider;
  /** Inner canvas area in preview pixels (canvas minus outer border). */
  inner: { x: number; y: number; width: number; height: number };
}

function DividerHandle({ divider, inner }: DividerHandleProps) {
  const [dragging, setDragging] = useState(false);
  const horizontal = divider.direction === 'horizontal';
  const { area, position } = divider;

  // Length of the split along the drag direction, used to turn pixels into a fraction.
  const splitLength = horizontal ? area.w * inner.width : area.h * inner.height;

  const bind = useDrag(
    ({ delta: [dx, dy], first, last }) => {
      if (first) setDragging(true);
      if (last) setDragging(false);
      const moved = horizontal ? dx : dy;
      if (moved === 0 || splitLength <= 0) return;
      useEditorStore.getState().resizeDivider(divider.path, divider.boundary, moved / splitLength);
    },
    { pointer: { capture: true } },
  );

  // Where lines meet (a T-junction), the inner line's touch area is pulled back from its
  // ends so it doesn't cover the outer line. Outer (shallower) lines also sit on top.
  const inset = HIT_SIZE / 2;
  const zIndex = Math.max(10, 15 - divider.path.length);
  const style = horizontal
    ? {
        left: inner.x + position * inner.width - HIT_SIZE / 2,
        top: inner.y + area.y * inner.height + inset,
        width: HIT_SIZE,
        height: Math.max(0, area.h * inner.height - inset * 2),
        zIndex,
      }
    : {
        left: inner.x + area.x * inner.width + inset,
        top: inner.y + position * inner.height - HIT_SIZE / 2,
        width: Math.max(0, area.w * inner.width - inset * 2),
        height: HIT_SIZE,
        zIndex,
      };

  return (
    <div
      {...bind()}
      role="separator"
      aria-orientation={horizontal ? 'vertical' : 'horizontal'}
      aria-label="Drag to resize boxes"
      className={cn(
        'group absolute flex touch-none items-center justify-center',
        horizontal ? 'cursor-col-resize' : 'cursor-row-resize',
      )}
      style={style}
    >
      <span
        className={cn(
          'rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.5),0_1px_4px_rgba(0,0,0,0.6)] transition-opacity',
          horizontal ? 'h-7 max-h-[60%] w-1.5' : 'h-1.5 w-7 max-w-[60%]',
          dragging ? 'opacity-100' : 'opacity-70 group-hover:opacity-100',
        )}
      />
    </div>
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
