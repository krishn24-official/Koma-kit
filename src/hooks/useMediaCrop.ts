import { useCallback } from 'react';
import { FULL_CROP } from '@/constants/elements';
import { useEditorStore } from '@/store/useEditorStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUiStore } from '@/store/useUiStore';

const findItem = (index: number, itemId: string) =>
  useEditorStore.getState().cells[index]?.find((item) => item.id === itemId) ?? null;

/** Start, apply, reset and cancel cropping the picture or clip in a box. */
export function useMediaCrop() {
  const setMediaCrop = useUiStore((s) => s.setMediaCrop);

  const start = useCallback(
    (index: number, itemId: string) => {
      const item = findItem(index, itemId);
      if (!item) return;
      usePlaybackStore.getState().pause();
      // Only one crop at a time.
      const ui = useUiStore.getState();
      ui.setCropRect(null);
      ui.setStickerCrop(null);
      setMediaCrop({ index, itemId, rect: item.crop, bars: null });
    },
    [setMediaCrop],
  );

  const apply = useCallback(() => {
    const crop = useUiStore.getState().mediaCrop;
    setMediaCrop(null);
    if (!crop || !findItem(crop.index, crop.itemId)) return;
    useEditorStore.getState().setItemCrop(crop.index, crop.itemId, crop.rect);
  }, [setMediaCrop]);

  /** Sets the frame to the detected picture area (removes black bars). */
  const removeBars = useCallback(() => {
    const crop = useUiStore.getState().mediaCrop;
    if (crop?.bars) setMediaCrop({ ...crop, rect: crop.bars });
  }, [setMediaCrop]);

  const reset = useCallback(() => {
    const crop = useUiStore.getState().mediaCrop;
    if (crop) setMediaCrop({ ...crop, rect: { ...FULL_CROP } });
  }, [setMediaCrop]);

  const cancel = useCallback(() => setMediaCrop(null), [setMediaCrop]);

  return { start, apply, removeBars, reset, cancel };
}
