import { useCallback, useState } from 'react';
import { EXPORT_EXTENSION, EXPORT_MIME, VIDEO_FPS } from '@/constants/editor';
import { getTemplateSnapshot } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import { getCurrentDuration, usePlaybackStore } from '@/store/usePlaybackStore';
import { useUiStore } from '@/store/useUiStore';
import type { ExportFormat } from '@/types';
import { canvasToBlob, downloadBlob, sanitizeFileName } from '@/utils/download';
import { renderStill } from '@/utils/renderToCanvas';

export type ExportAction = 'download' | 'copy' | 'share';

/** MP4 only makes sense with a timeline. Otherwise fall back to PNG. */
export const getEffectiveFormat = (): ExportFormat => {
  const { format } = useEditorStore.getState().exportOptions;
  return format === 'mp4' && getCurrentDuration() <= 0 ? 'png' : format;
};

const getFileName = (format: ExportFormat) =>
  `${sanitizeFileName(useEditorStore.getState().exportOptions.fileName)}.${EXPORT_EXTENSION[format]}`;

async function createStillBlob(format: Exclude<ExportFormat, 'mp4'>): Promise<Blob> {
  const { scale, quality } = useEditorStore.getState().exportOptions;
  const time = usePlaybackStore.getState().currentTime;
  const canvas = await renderStill(getTemplateSnapshot(), scale, time);
  return canvasToBlob(canvas, EXPORT_MIME[format], format === 'jpeg' ? quality : undefined);
}

/** Keeps the phone screen on during long exports (where supported). */
async function keepScreenOn(): Promise<() => void> {
  try {
    const lock = await navigator.wakeLock?.request('screen');
    return () => void lock?.release().catch(() => undefined);
  } catch {
    return () => undefined;
  }
}

/** Creates the MP4, showing a progress overlay that can cancel it. */
async function createVideoBlob(): Promise<{ blob: Blob; warning: string | null }> {
  const { setVideoExport } = useUiStore.getState();
  const controller = new AbortController();
  setVideoExport({ progress: 0, cancel: () => controller.abort() });
  usePlaybackStore.getState().pause();
  const releaseWakeLock = await keepScreenOn();

  try {
    // Loaded on demand so the encoder isn't part of the initial download.
    const { exportVideo } = await import('@/utils/videoExport');
    let lastPercent = 0;
    return await exportVideo(getTemplateSnapshot(), {
      width: useEditorStore.getState().exportOptions.videoWidth,
      fps: VIDEO_FPS,
      signal: controller.signal,
      onProgress: (fraction) => {
        const percent = Math.floor(fraction * 100);
        if (percent === lastPercent) return;
        lastPercent = percent;
        setVideoExport({ progress: fraction, cancel: () => controller.abort() });
      },
    });
  } finally {
    releaseWakeLock();
    setVideoExport(null);
  }
}

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

export const canCopyImage = (): boolean =>
  typeof window !== 'undefined' &&
  'ClipboardItem' in window &&
  typeof navigator.clipboard?.write === 'function';

export const canShareFiles = (): boolean => {
  try {
    return (
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [new File([''], 'test.png', { type: 'image/png' })] })
    );
  } catch {
    return false;
  }
};

export function useExport() {
  const [busy, setBusy] = useState<ExportAction | null>(null);
  const showToast = useUiStore((s) => s.showToast);

  const run = useCallback(
    async (action: ExportAction, failMessage: string, task: () => Promise<void>) => {
      setBusy(action);
      try {
        await task();
      } catch (error) {
        if (isAbortError(error)) {
          if (action !== 'share') showToast('Export canceled', 'info');
        } else {
          console.error(error);
          showToast(errorMessage(error, failMessage), 'error');
        }
      } finally {
        setBusy(null);
      }
    },
    [showToast],
  );

  /** Builds the file in the current format. */
  const createFile = useCallback(async (): Promise<{ file: File; warning: string | null }> => {
    const format = getEffectiveFormat();
    const result =
      format === 'mp4'
        ? await createVideoBlob()
        : { blob: await createStillBlob(format), warning: null };
    const file = new File([result.blob], getFileName(format), { type: EXPORT_MIME[format] });
    return { file, warning: result.warning };
  }, []);

  const download = useCallback(
    () =>
      run('download', 'Export failed. Please try again', async () => {
        const { file, warning } = await createFile();
        downloadBlob(file, file.name);
        showToast(warning ?? (file.type === 'video/mp4' ? 'Video downloaded' : 'Image downloaded'),
          warning ? 'info' : 'success');
      }),
    [run, createFile, showToast],
  );

  const copy = useCallback(
    () =>
      run('copy', "Couldn't copy. Try Download instead", async () => {
        // The ClipboardItem must be created synchronously inside the click (Safari),
        // so it gets the blob promise rather than the blob.
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': createStillBlob('png') }),
        ]);
        showToast('Copied to clipboard', 'success');
      }),
    [run, showToast],
  );

  const share = useCallback(
    () =>
      run('share', "Couldn't share. Try Download instead", async () => {
        const { file, warning } = await createFile();
        if (warning) showToast(warning, 'info');
        if (!navigator.canShare?.({ files: [file] })) {
          // e.g. MP4 sharing unsupported: download instead.
          downloadBlob(file, file.name);
          showToast('Sharing not supported here, so the file was downloaded', 'info');
          return;
        }
        try {
          await navigator.share({ files: [file] });
        } catch (error) {
          // Long video exports can outlast the tap's permission to open the share sheet.
          if (!(error instanceof DOMException && error.name === 'NotAllowedError')) throw error;
          downloadBlob(file, file.name);
          showToast('Share sheet blocked, so the file was downloaded', 'info');
        }
      }),
    [run, createFile, showToast],
  );

  return { download, copy, share, busy };
}
