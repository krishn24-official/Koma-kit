import { useCallback } from 'react';
import { sizeForRatio } from '@/constants/canvasSizes';
import { DEFAULT_TRANSFORM } from '@/constants/editor';
import { useEditorStore } from '@/store/useEditorStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUiStore } from '@/store/useUiStore';
import { findBestCanvasRatio } from '@/utils/fitCanvas';
import { resolveLayout } from '@/utils/layoutTree';
import { getActiveItem } from '@/utils/timeline';

/**
 * "Fit boxes to pictures": reshapes the canvas so the boxes match the pictures they
 * show, then makes every picture fill its box. All boxes resize together.
 */
export function useFitToPictures() {
  const showToast = useUiStore((s) => s.showToast);

  return useCallback(() => {
    const s = useEditorStore.getState();
    const time = usePlaybackStore.getState().currentTime;
    const { cells } = resolveLayout(s.layoutRoot);
    const items = cells.map((_, i) => getActiveItem(s.cells[i], time));
    const ratio = findBestCanvasRatio(
      cells,
      s.style,
      items.map((item) => (item ? { width: item.naturalWidth, height: item.naturalHeight } : null)),
    );

    if (ratio === null) {
      showToast('Add pictures first, then fit the boxes to them', 'info');
      return;
    }

    s.setCanvasSize(sizeForRatio(ratio, s.canvasSize.width, false));
    items.forEach((item, i) => {
      if (item) s.updateItemTransform(i, item.id, { ...DEFAULT_TRANSFORM });
    });
    showToast('Boxes resized to fit your pictures', 'success');
  }, [showToast]);
}
