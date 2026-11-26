import { useCallback } from 'react';
import { useEditorStore } from '@/store/useEditorStore';
import { useUiStore } from '@/store/useUiStore';
import type { CellMedia } from '@/types';
import { isMediaFile, readMediaFile } from '@/utils/media';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Upload helpers that read image/video files, update the store and report problems. */
/** Animated GIFs take a moment to turn into clips. */
const isGif = (file: File) => file.type === 'image/gif' || /\.gif$/i.test(file.name);

export function useMediaUpload() {
  const setCellMedia = useEditorStore((s) => s.setCellMedia);
  const replaceItem = useEditorStore((s) => s.replaceItem);
  const addItemAt = useEditorStore((s) => s.addItemAt);
  const fillEmptyCells = useEditorStore((s) => s.fillEmptyCells);
  const showToast = useUiStore((s) => s.showToast);

  /** Reads the first usable file, or shows an error. */
  const readFirst = useCallback(
    async (files: File[]): Promise<CellMedia | null> => {
      const file = files.find(isMediaFile);
      if (!file) {
        showToast('Please choose an image or video file', 'error');
        return null;
      }
      if (isGif(file)) showToast('Preparing GIF…', 'info');
      try {
        return await readMediaFile(file);
      } catch {
        showToast(`Couldn't open "${file.name}"`, 'error');
        return null;
      }
    },
    [showToast],
  );

  /** Fills empty cells in order with the given files. */
  const uploadMany = useCallback(
    async (files: File[]) => {
      const mediaFiles = files.filter(isMediaFile);
      if (mediaFiles.length === 0) {
        showToast('Please choose image or video files', 'error');
        return;
      }

      if (mediaFiles.some(isGif)) showToast('Preparing GIF…', 'info');
      const results = await Promise.allSettled(mediaFiles.map(readMediaFile));
      const loaded = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
      const failed = results.length - loaded.length;
      const placed = fillEmptyCells(loaded);
      const skipped = loaded.length - placed;

      if (skipped > 0) {
        showToast(`No empty cells left. ${plural(skipped, 'file')} skipped`, 'info');
      } else if (failed > 0) {
        showToast(`${plural(failed, 'file')} could not be opened`, 'error');
      }
    },
    [fillEmptyCells, showToast],
  );

  /** Puts the first file into a cell, replacing its contents. Extra files fill empty cells. */
  const uploadToCell = useCallback(
    async (index: number, files: File[]) => {
      const media = await readFirst(files);
      if (media) setCellMedia(index, media);
      const rest = files.filter(isMediaFile).slice(1);
      if (rest.length > 0) await uploadMany(rest);
    },
    [readFirst, setCellMedia, uploadMany],
  );

  /** Replaces one scheduled item, keeping its start time. */
  const replaceInCell = useCallback(
    async (index: number, itemId: string, files: File[]) => {
      const media = await readFirst(files);
      if (media) replaceItem(index, itemId, media);
    },
    [readFirst, replaceItem],
  );

  /** Schedules a file to appear in a cell at `time` seconds. */
  const addToCellAt = useCallback(
    async (index: number, time: number, files: File[]) => {
      const media = await readFirst(files);
      if (media) addItemAt(index, media, time);
    },
    [readFirst, addItemAt],
  );

  return { uploadMany, uploadToCell, replaceInCell, addToCellAt };
}
