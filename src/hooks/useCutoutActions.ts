import { useCallback } from 'react';
import { toDesignSize } from '@/constants/canvasSizes';
import { getTemplateSnapshot } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import { useUiStore } from '@/store/useUiStore';
import type { StickerElement } from '@/types';
import { stickerHeight } from '@/utils/elements';
import { getFitTransform, getImageSize } from '@/utils/imageTransform';
import { getCellShapes } from '@/utils/layoutMath';
import { loadImage, readMediaFile } from '@/utils/media';
import { clipToShape } from '@/utils/stickerShape';
import { canvasToBlob } from '@/utils/download';
import { countCells } from '@/utils/layoutTree';

/** Pieces are saved this big at most (longest side, pixels) when moved into a box. */
const MAX_SIDE = 2048;

/** The cut-out piece as a PNG: its part of the picture, transparent outside its outline. */
export async function pieceToPng(sticker: StickerElement): Promise<File> {
  if (!sticker.src) throw new Error('No picture');
  const img = await loadImage(sticker.src);
  const { crop, naturalWidth: nw, naturalHeight: nh } = sticker;
  // Full detail of the picture, limited to MAX_SIDE.
  const srcW = crop.w * nw;
  const srcH = crop.h * nh;
  const scale = Math.min(1, MAX_SIDE / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  clipToShape(ctx, sticker, w, h);
  if (sticker.flipX) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, crop.x * nw, crop.y * nh, srcW, srcH, 0, 0, w, h);
  const blob = await canvasToBlob(canvas, 'image/png');
  return new File([blob], 'cut-out.png', { type: 'image/png' });
}

/** Actions for a piece taken out of a picture. */
export function useCutoutActions() {
  /** Deletes the picture the piece was taken from (in its box, or on the canvas). */
  const removeOriginal = useCallback((sticker: StickerElement) => {
    const store = useEditorStore.getState();
    const from = sticker.cutFrom;
    let removed = false;
    if (from?.kind === 'element') {
      if (store.elements.some((e) => e.id === from.id)) {
        store.removeElement(from.id);
        removed = true;
      }
    } else if (from?.kind === 'cell') {
      // Boxes can be renumbered after edits: find the picture by its id.
      const entry = Object.entries(store.cells).find(([, items]) =>
        items.some((it) => it.id === from.itemId),
      );
      if (entry) {
        store.removeItem(Number(entry[0]), from.itemId);
        removed = true;
      }
    }
    store.updateElement(sticker.id, { cutFrom: undefined });
    store.select({ kind: 'element', id: sticker.id });
    useUiStore
      .getState()
      .showToast(removed ? 'Original picture removed' : 'The original was already removed', 'info');
  }, []);

  /** Adds a new box and puts the piece into it (whole, transparent around it). */
  const moveToNewBox = useCallback(async (sticker: StickerElement) => {
    const ui = useUiStore.getState();
    const before = countCells(useEditorStore.getState().layoutRoot);
    useEditorStore.getState().addLayer();
    const store = useEditorStore.getState();
    if (countCells(store.layoutRoot) === before) {
      ui.showToast('No room for another box', 'error');
      return;
    }
    const index = before; // the new box is numbered last
    try {
      const media = await readMediaFile(await pieceToPng(sticker));
      // Show the whole piece in the box (not cropped to fill it).
      const design = toDesignSize(store.canvasSize);
      const cell = getCellShapes(getTemplateSnapshot().layout, design, store.style, 1)[index];
      const transform = cell ? getFitTransform(getImageSize(media), cell) : media.transform;
      store.setCellMedia(index, { ...media, transform });
      store.removeElement(sticker.id);
      ui.showToast('Moved into a new box', 'success');
    } catch {
      ui.showToast("Couldn't move the piece into a box", 'error');
    }
  }, []);

  /**
   * Puts every cut-out piece into a box, in order: empty boxes first, then new boxes
   * as needed. Each piece fills its box (like manga panels); the floating pieces go.
   */
  const arrangeIntoBoxes = useCallback(async () => {
    const ui = useUiStore.getState();
    const pieces = useEditorStore
      .getState()
      .elements.filter((e): e is StickerElement => e.type === 'sticker' && isPiece(e));
    if (pieces.length === 0) return;
    let placed = 0;
    for (const piece of pieces) {
      let store = useEditorStore.getState();
      const count = countCells(store.layoutRoot);
      let index = Array.from({ length: count }, (_, i) => i).find(
        (i) => !(store.cells[i]?.length ?? 0),
      );
      if (index === undefined) {
        store.addLayer();
        store = useEditorStore.getState();
        if (countCells(store.layoutRoot) === count) {
          ui.showToast('No room for more boxes', 'error');
          break;
        }
        index = count;
      }
      try {
        store.setCellMedia(index, await readMediaFile(await pieceToPng(piece)));
        useEditorStore.getState().removeElement(piece.id);
        placed++;
      } catch {
        ui.showToast("Couldn't place one of the pieces", 'error');
      }
    }
    if (placed)
      ui.showToast(`Put ${placed} ${placed === 1 ? 'piece' : 'pieces'} into boxes`, 'success');
  }, []);

  return { removeOriginal, moveToNewBox, arrangeIntoBoxes };
}

/** Size check used by the buttons: pieces too thin to be useful don't get "new box". */
export const isPiece = (s: StickerElement): boolean =>
  Boolean(s.src) && s.shape === 'custom' && stickerHeight(s) > 0;
