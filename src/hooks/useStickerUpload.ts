import { useCallback } from 'react';
import { DESIGN_WIDTH, toDesignSize } from '@/constants/canvasSizes';
import { countCells } from '@/utils/layoutTree';
import { getTimelineDuration } from '@/utils/timeline';
import { createSticker, FULL_CROP } from '@/constants/elements';
import { newCharacterSlot } from '@/utils/characterSlots';
import { coverCrop, isFrame } from '@/utils/stickerShape';
import { stickerHeight } from '@/utils/elements';

/** Width / height of a sticker as shown. */
const stickerAspect = (s: StickerElement) => s.width / stickerHeight(s);
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
      const current = id ? store.elements.find((e) => e.id === id) : undefined;
      if (current?.type === 'sticker' && isFrame(current)) {
        // Frames keep their size and shape: the picture fills them (centred).
        store.updateElement(current.id, {
          ...picture,
          crop: coverCrop(
            picture.naturalWidth,
            picture.naturalHeight,
            current.src ? stickerAspect(current) : current.slotAspect,
          ),
        });
      } else if (id) store.updateElement(id, picture);
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

/** Seconds per picture when there's no video to spread them over. */
const SLIDE_SECONDS = 3;
/** Crossfade length between slideshow pictures (seconds). */
const SLIDE_FADE = 0.6;

/**
 * Returns `add(files)`: a quick slideshow. Every picture gets its own time slot, spread
 * evenly over the video (or 3 s each without one), in the top area of the canvas so
 * subtitles lower down stay visible. Neighbours crossfade and each slowly zooms.
 */
export function useSlideshow() {
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

      const store = useEditorStore.getState();
      const design = toDesignSize(store.canvasSize);
      const videoLength = getTimelineDuration(store.cells, countCells(store.layoutRoot));
      const total = videoLength > 0 ? videoLength : n * SLIDE_SECONDS;
      const slot = total / n;

      store.addElements(
        pictures.map((picture, i) => {
          // Fit in the top area: at most 90% wide and half the height.
          const aspect = picture.naturalWidth / Math.max(1, picture.naturalHeight);
          const width = Math.min(design.width * 0.9, design.height * 0.5 * aspect);
          const height = width / aspect;
          return createSticker({
            ...picture,
            label: 'Picture',
            width,
            x: 0.5,
            y: (design.height * 0.04 + height / 2) / design.height,
            fade: { top: 0, bottom: 0.18, left: 0, right: 0 },
            timing: {
              from: i * slot,
              // Each one stays a little longer than its slot, so the next fades in over it.
              until: i === n - 1 ? null : (i + 1) * slot + SLIDE_FADE,
              // The first one is there from the start; the others fade in over it.
              enter: i === 0 ? 'none' : 'fade',
              exit: 'fade',
              duration: SLIDE_FADE,
              slowZoom: true,
            },
          });
        }),
      );
      showToast(
        `Slideshow: ${n} ${n === 1 ? 'picture' : 'pictures'}, about ${slot.toFixed(1)} s each`,
        'success',
      );
    },
    [showToast],
  );
}
