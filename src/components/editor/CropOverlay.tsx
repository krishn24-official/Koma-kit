import { useMemo } from 'react';
import { describeRatio } from '@/constants/canvasSizes';
import { useCurrentLayout } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUiStore } from '@/store/useUiStore';
import type { Size } from '@/types';
import { getImageRect, getImageSize } from '@/utils/imageTransform';
import { getCellRects } from '@/utils/layoutMath';
import { getActiveItem } from '@/utils/timeline';
import { CropFrame } from './CropFrame';

/** Picture edges on screen (fractions of the canvas), used as snap targets. */
function useSnapLines(size: Size, unit: number) {
  const layout = useCurrentLayout();
  const style = useEditorStore((s) => s.style);
  const cells = useEditorStore((s) => s.cells);
  const time = usePlaybackStore((s) => s.currentTime);
  const { width, height } = size;

  return useMemo(() => {
    const xs = [0, 1];
    const ys = [0, 1];
    getCellRects(layout.cells, { width, height }, style, unit).forEach((cell, i) => {
      const item = getActiveItem(cells[i], time);
      if (!item) return;
      const r = getImageRect(getImageSize(item), cell, item.transform);
      // The visible part of the picture is clipped to its box.
      const left = Math.max(cell.x, cell.x + r.x);
      const right = Math.min(cell.x + cell.width, cell.x + r.x + r.width);
      const top = Math.max(cell.y, cell.y + r.y);
      const bottom = Math.min(cell.y + cell.height, cell.y + r.y + r.height);
      xs.push(left / width, right / width);
      ys.push(top / height, bottom / height);
    });
    return { xs, ys };
  }, [layout, style, cells, time, width, height, unit]);
}

/**
 * Canvas crop frame. Edges snap to picture edges; Apply/Cancel live in the toolbar
 * under the canvas.
 */
export function CropOverlay({ size, unit }: { size: Size; unit: number }) {
  const rect = useUiStore((s) => s.cropRect);
  const setCropRect = useUiStore((s) => s.setCropRect);
  const canvasSize = useEditorStore((s) => s.canvasSize);
  const snapLines = useSnapLines(size, unit);
  if (!rect) return null;

  const outW = Math.round(canvasSize.width * rect.w);
  const outH = Math.round(canvasSize.height * rect.h);

  return (
    <div className="absolute inset-0 z-30">
      <CropFrame
        rect={rect}
        onChange={setCropRect}
        size={size}
        snapLines={snapLines}
        label={`${outW} × ${outH} · ${describeRatio(outW, outH)}`}
      />
    </div>
  );
}
