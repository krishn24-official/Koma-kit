import { useGesture } from '@use-gesture/react';
import { useRef, type RefObject } from 'react';
import { WHEEL_ZOOM_SPEED } from '@/constants/editor';
import { useEditorStore } from '@/store/useEditorStore';
import type { ImageTransform, Size } from '@/types';
import { clampTransform, getImageSize } from '@/utils/imageTransform';

/**
 * Pan (drag), pinch-zoom (touch / trackpad) and wheel-zoom for one item in a cell.
 * Reads the latest transform from the store on every event, so fast gestures never
 * work from stale values.
 */
export function useCellGestures(
  ref: RefObject<HTMLElement>,
  index: number,
  itemId: string,
  cellSize: Size,
) {
  const sizeRef = useRef(cellSize);
  sizeRef.current = cellSize;

  const getItem = () =>
    useEditorStore.getState().cells[index]?.find((item) => item.id === itemId);

  const apply = (update: (t: ImageTransform) => ImageTransform) => {
    const item = getItem();
    if (!item) return;
    const next = clampTransform(update(item.transform), getImageSize(item), sizeRef.current);
    useEditorStore.getState().updateItemTransform(index, itemId, next);
  };

  useGesture(
    {
      onDrag: ({ delta: [dx, dy], pinching }) => {
        if (pinching) return;
        const { width, height } = sizeRef.current;
        apply((t) => ({ ...t, offsetX: t.offsetX + dx / width, offsetY: t.offsetY + dy / height }));
      },
      onPinch: ({ offset: [scale] }) => {
        apply((t) => ({ ...t, scale }));
      },
      onWheel: ({ event, delta: [, dy] }) => {
        event.preventDefault();
        apply((t) => ({ ...t, scale: t.scale * Math.exp(-dy * WHEEL_ZOOM_SPEED) }));
      },
    },
    {
      target: ref,
      eventOptions: { passive: false },
      drag: { filterTaps: true },
      pinch: {
        // Start each pinch from the current zoom so it continues smoothly.
        from: () => [getItem()?.transform.scale ?? 1, 0],
        rubberband: false,
      },
    },
  );
}
