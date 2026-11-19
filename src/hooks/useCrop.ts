import { useCallback } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUiStore } from '@/store/useUiStore';

const FULL = { x: 0, y: 0, w: 1, h: 1 };

/** Start, apply and cancel cropping the canvas. */
export function useCrop() {
  const setCropRect = useUiStore((s) => s.setCropRect);
  const showToast = useUiStore((s) => s.showToast);

  const start = useCallback(() => {
    usePlaybackStore.getState().pause();
    useEditorStore.getState().clearSelection();
    useUiStore.getState().setStickerCrop(null); // only one crop at a time
    setCropRect(FULL);
  }, [setCropRect]);

  const apply = useCallback(() => {
    const rect = useUiStore.getState().cropRect;
    setCropRect(null);
    if (!rect) return;
    const unchanged = rect.x < 1e-3 && rect.y < 1e-3 && rect.w > 0.999 && rect.h > 0.999;
    if (unchanged) return;
    useEditorStore.getState().cropCanvas(rect);
    showToast('Canvas cropped', 'success');
  }, [setCropRect, showToast]);

  const cancel = useCallback(() => setCropRect(null), [setCropRect]);
  const reset = useCallback(() => setCropRect(FULL), [setCropRect]);

  return { start, apply, cancel, reset };
}
