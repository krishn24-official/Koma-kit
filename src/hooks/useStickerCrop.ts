import { useCallback } from 'react';
import { toDesignSize } from '@/constants/canvasSizes';
import { FULL_CROP } from '@/constants/elements';
import { useEditorStore } from '@/store/useEditorStore';
import { useUiStore } from '@/store/useUiStore';
import { cropSticker } from '@/utils/elements';

const findSticker = (id: string) => {
  const el = useEditorStore.getState().elements.find((e) => e.id === id);
  return el?.type === 'sticker' && el.src ? el : null;
};

/** Start, apply, reset and cancel cropping a logo/picture element. */
export function useStickerCrop() {
  const setStickerCrop = useUiStore((s) => s.setStickerCrop);

  const start = useCallback(
    (id: string) => {
      const sticker = findSticker(id);
      if (!sticker) return;
      useUiStore.getState().setCropRect(null); // only one crop at a time
      useEditorStore.getState().select({ kind: 'element', id });
      setStickerCrop({ id, rect: sticker.crop });
    },
    [setStickerCrop],
  );

  const apply = useCallback(() => {
    const crop = useUiStore.getState().stickerCrop;
    setStickerCrop(null);
    const sticker = crop && findSticker(crop.id);
    if (!crop || !sticker) return;
    const { canvasSize, updateElement } = useEditorStore.getState();
    updateElement(sticker.id, cropSticker(sticker, crop.rect, toDesignSize(canvasSize)));
  }, [setStickerCrop]);

  const reset = useCallback(() => {
    const crop = useUiStore.getState().stickerCrop;
    if (crop) setStickerCrop({ ...crop, rect: { ...FULL_CROP } });
  }, [setStickerCrop]);

  const cancel = useCallback(() => setStickerCrop(null), [setStickerCrop]);

  return { start, apply, reset, cancel };
}
