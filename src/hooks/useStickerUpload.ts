import { useCallback } from 'react';
import { DESIGN_WIDTH } from '@/constants/canvasSizes';
import { createSticker, FULL_CROP } from '@/constants/elements';
import { newCharacterSlot } from '@/utils/characterSlots';
import { useEditorStore } from '@/store/useEditorStore';
import { useUiStore } from '@/store/useUiStore';
import type { StickerElement } from '@/types';
import { readMediaFile, revokeMedia } from '@/utils/media';

type StickerPicture = Pick<
  StickerElement,
  'src' | 'file' | 'naturalWidth' | 'naturalHeight' | 'crop'
>;

/** Reads a picture for a sticker (logo). Videos and unreadable files show an error. */
async function readSticker(
  file: File | undefined,
  showError: (message: string) => void,
): Promise<StickerPicture | null> {
  if (!file) return null;
  try {
    const media = await readMediaFile(file);
    if (media.kind !== 'image') {
      revokeMedia(media);
      showError('Logos and stickers must be pictures (PNG works best)');
      return null;
    }
    return {
      src: media.src,
      file: media.file,
      naturalWidth: media.naturalWidth,
      naturalHeight: media.naturalHeight,
      // A new picture starts uncropped.
      crop: { ...FULL_CROP },
    };
  } catch {
    showError(`Couldn't open "${file.name}"`);
    return null;
  }
}

/**
 * Returns `upload(id, files)` to put a picture into an existing sticker (e.g. an empty
 * logo slot), or `upload(null, files)` to add a new sticker in the middle of the canvas.
 */
export function useStickerUpload() {
  const showToast = useUiStore((s) => s.showToast);

  return useCallback(
    async (id: string | null, files: File[], label = 'Picture') => {
      const picture = await readSticker(files[0], (message) => showToast(message, 'error'));
      if (!picture) return;
      const store = useEditorStore.getState();
      if (id) store.updateElement(id, picture);
      else store.addElement(createSticker({ ...picture, label }));
    },
    [showToast],
  );
}

/**
 * Returns `add(files)`: adds every picture as its own piece, spread side by side
 * across the canvas (for collages). Drag them into place afterwards.
 */
export function useAddPictures() {
  const showToast = useUiStore((s) => s.showToast);

  return useCallback(
    async (files: File[]) => {
      const pictures = (
        await Promise.all(
          files.map((file) => readSticker(file, (message) => showToast(message, 'error'))),
        )
      ).filter((p): p is StickerPicture => p !== null);
      const n = pictures.length;
      if (n === 0) return;
      // Each piece gets an equal slice of the width, a bit wider so neighbours overlap.
      const width = Math.round(Math.min(520, Math.max(220, (DESIGN_WIDTH / n) * 1.3)));
      useEditorStore.getState().addElements(
        pictures.map((picture, i) =>
          newCharacterSlot({
            ...picture,
            width,
            x: (i + 0.5) / n,
            y: 0.55,
          }),
        ),
      );
    },
    [showToast],
  );
}
