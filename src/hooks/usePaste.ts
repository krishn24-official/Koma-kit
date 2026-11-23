import { useCallback, useEffect } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useMosaicStore } from '@/store/useMosaicStore';
import { useSheetStore } from '@/store/useSheetStore';
import { useUiStore } from '@/store/useUiStore';
import { isMediaFile } from '@/utils/media';
import { getActiveItem } from '@/utils/timeline';
import { useMediaUpload } from './useMediaUpload';
import { useStickerUpload } from './useStickerUpload';

/** Where pasted pictures go. Without one, the selection decides. */
export type PasteTarget = { kind: 'cell'; index: number } | { kind: 'sticker'; id: string };

/** True where the browser lets a page read pictures from the clipboard (needs a tap). */
export const canReadClipboard = (): boolean =>
  typeof navigator.clipboard?.read === 'function' && window.isSecureContext;

const extension = (type: string) => type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png';

/** Pictures from the clipboard, read after a tap (Paste button). */
async function readClipboardFiles(): Promise<File[]> {
  const items = await navigator.clipboard.read();
  const files: File[] = [];
  for (const item of items) {
    const type = item.types.find((t) => t.startsWith('image/'));
    if (!type) continue;
    const blob = await item.getType(type);
    files.push(new File([blob], `pasted-${Date.now()}.${extension(type)}`, { type }));
  }
  return files;
}

/** Pictures/clips in a paste event (Ctrl+V / long-press Paste). */
function filesFromPaste(data: DataTransfer | null): File[] {
  if (!data) return [];
  const files = Array.from(data.files);
  if (files.length === 0) {
    for (const item of Array.from(data.items)) {
      const file = item.kind === 'file' ? item.getAsFile() : null;
      if (file) files.push(file);
    }
  }
  // Clipboard pictures are often all named "image.png"; give them unique names.
  return files
    .filter(isMediaFile)
    .map((f) =>
      f.name === 'image.png' ? new File([f], `pasted-${Date.now()}.png`, { type: f.type }) : f,
    );
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * Returns `place(files, target?)` and `pasteFromClipboard(target?)`. Pictures go to the
 * target, else to the selected box or logo, else into empty boxes in order. In the
 * card sheet they become image cards.
 */
export function usePaste() {
  const { uploadMany, uploadToCell, replaceInCell } = useMediaUpload();
  const uploadSticker = useStickerUpload();

  const place = useCallback(
    async (files: File[], target?: PasteTarget) => {
      if (files.length === 0) return;
      const mosaic = useMosaicStore.getState();
      if (mosaic.active) {
        // The first paste is the main picture; after that, pictures become tiles.
        if (!mosaic.target) await mosaic.setTarget(files[0]!);
        else await mosaic.addTiles(files);
        return;
      }
      if (useSheetStore.getState().active) {
        await useSheetStore.getState().addImages(files);
        return;
      }
      const { selection, cells, elements } = useEditorStore.getState();
      const to: PasteTarget | null =
        target ??
        (selection?.kind === 'cell'
          ? { kind: 'cell', index: selection.index }
          : selection?.kind === 'element' &&
              elements.find((e) => e.id === selection.id)?.type === 'sticker'
            ? { kind: 'sticker', id: selection.id }
            : null);

      if (to?.kind === 'sticker') await uploadSticker(to.id, files);
      else if (to?.kind === 'cell') {
        // Replaces what's showing now (keeping its timing), or fills the empty box.
        const active = getActiveItem(cells[to.index], usePlaybackStore.getState().currentTime);
        if (active) await replaceInCell(to.index, active.id, files);
        else await uploadToCell(to.index, files);
      } else await uploadMany(files);
    },
    [uploadMany, uploadToCell, replaceInCell, uploadSticker],
  );

  const pasteFromClipboard = useCallback(
    async (target?: PasteTarget) => {
      const showToast = useUiStore.getState().showToast;
      try {
        const files = await readClipboardFiles();
        if (files.length === 0) {
          showToast('No picture in the clipboard. Copy a picture first', 'info');
          return;
        }
        await place(files, target);
      } catch {
        showToast("Couldn't read the clipboard. Allow clipboard access and try again", 'error');
      }
    },
    [place],
  );

  return { place, pasteFromClipboard };
}

/** Ctrl+V (or Paste from the keyboard's menu) anywhere outside text fields. */
export function usePasteShortcut(): void {
  const { place } = usePaste();
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const files = filesFromPaste(e.clipboardData);
      if (files.length === 0) return;
      e.preventDefault();
      void place(files);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [place]);
}
