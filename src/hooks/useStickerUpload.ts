import { useCallback } from 'react';
import { createSticker, FULL_CROP } from '@/constants/elements';
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
  files: File[],
  showError: (message: string) => void,
): Promise<StickerPicture | null> {
  const [file] = files;
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
    async (id: string | null, files: File[]) => {
      const picture = await readSticker(files, (message) => showToast(message, 'error'));
      if (!picture) return;
      const store = useEditorStore.getState();
      if (id) store.updateElement(id, picture);
      else store.addElement(createSticker({ ...picture, label: 'Picture' }));
    },
    [showToast],
  );
}
