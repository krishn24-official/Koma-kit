import { useCallback } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useUiStore } from '@/store/useUiStore';
import { isImageFile, readImageFile } from '@/utils/image';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Upload helpers that read files, update the store and report problems. */
export function useImageUpload() {
  const setCellImage = useEditorStore((s) => s.setCellImage);
  const fillEmptyCells = useEditorStore((s) => s.fillEmptyCells);
  const showToast = useUiStore((s) => s.showToast);

  /** Fills empty cells in order with the given files. */
  const uploadMany = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter(isImageFile);
      if (imageFiles.length === 0) {
        showToast('Please choose image files (JPG, PNG, WebP, GIF)', 'error');
        return;
      }

      const results = await Promise.allSettled(imageFiles.map(readImageFile));
      const loaded = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
      const failed = results.length - loaded.length;
      const placed = fillEmptyCells(loaded);
      const skipped = loaded.length - placed;

      if (skipped > 0) {
        showToast(`No empty cells left. ${plural(skipped, 'image')} skipped`, 'info');
      } else if (failed > 0) {
        showToast(`${plural(failed, 'image')} could not be loaded`, 'error');
      }
    },
    [fillEmptyCells, showToast],
  );

  /** Puts the first file into a specific cell. Any extra files fill empty cells. */
  const uploadToCell = useCallback(
    async (index: number, files: File[]) => {
      const [first, ...rest] = files.filter(isImageFile);
      if (!first) {
        showToast('Please choose an image file', 'error');
        return;
      }

      try {
        setCellImage(index, await readImageFile(first));
      } catch {
        showToast(`Couldn't load "${first.name}"`, 'error');
      }

      if (rest.length > 0) await uploadMany(rest);
    },
    [setCellImage, showToast, uploadMany],
  );

  return { uploadToCell, uploadMany };
}
