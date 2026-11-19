import { useDrag } from '@use-gesture/react';
import { useState } from 'react';
import { describeRatio, sizeForRatio } from '@/constants/canvasSizes';
import { useEditorStore } from '@/store/useEditorStore';
import type { Size } from '@/types';
import { cn } from '@/utils/cn';

type Edge = 'right' | 'bottom' | 'corner';

interface DragMemo {
  width: number;
  height: number;
  baseWidth: number;
}

/**
 * Grips on the canvas's right edge, bottom edge and corner. Dragging changes the
 * canvas shape (it snaps to 1:1, 4:5, 16:9… when close); the canvas stays centred,
 * so each edge moves by half the size change.
 */
export function CanvasResizeHandles({ size }: { size: Size }) {
  const [label, setLabel] = useState<string | null>(null);

  const bind = useDrag(
    ({ args, movement: [mx, my], first, last, memo }) => {
      const [edge] = args as [Edge];
      const start: DragMemo = first || !memo
        ? {
            width: size.width,
            height: size.height,
            baseWidth: useEditorStore.getState().canvasSize.width,
          }
        : memo;

      const width = edge === 'bottom' ? start.width : Math.max(20, start.width + mx * 2);
      const height = edge === 'right' ? start.height : Math.max(20, start.height + my * 2);
      const next = sizeForRatio(width / height, start.baseWidth);
      useEditorStore.getState().setCanvasSize(next);
      setLabel(last ? null : `${describeRatio(next.width, next.height)} · ${next.width} × ${next.height}`);
      return start;
    },
    { pointer: { capture: true } },
  );

  const grip = 'absolute flex touch-none items-center justify-center';
  const pill =
    'rounded-full bg-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.5)] transition-colors group-hover:bg-white';

  return (
    <>
      <div
        {...bind('right')}
        role="separator"
        aria-label="Drag to change canvas width"
        className={cn(grip, 'group top-1/2 -right-5 h-16 w-6 -translate-y-1/2 cursor-ew-resize')}
      >
        <span className={cn(pill, 'h-10 w-1.5')} />
      </div>
      <div
        {...bind('bottom')}
        role="separator"
        aria-label="Drag to change canvas height"
        className={cn(grip, 'group -bottom-5 left-1/2 h-6 w-16 -translate-x-1/2 cursor-ns-resize')}
      >
        <span className={cn(pill, 'h-1.5 w-10')} />
      </div>
      <div
        {...bind('corner')}
        role="separator"
        aria-label="Drag to change canvas shape"
        className={cn(grip, 'group -right-5 -bottom-5 size-7 cursor-nwse-resize')}
      >
        <span className={cn(pill, 'size-3 rounded-sm')} />
      </div>

      {label && (
        <div className="pointer-events-none absolute top-2 left-1/2 z-30 -translate-x-1/2 rounded-full bg-black/80 px-3 py-1 text-xs font-medium whitespace-nowrap text-white tabular-nums">
          {label}
        </div>
      )}
    </>
  );
}
