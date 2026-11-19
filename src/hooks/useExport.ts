import { useCallback, useState } from 'react';
import { getAspectRatio } from '@/constants/aspectRatios';
import { EXPORT_EXTENSION, EXPORT_MIME } from '@/constants/editor';
import { getLayout } from '@/constants/layouts';
import { useEditorStore } from '@/store/useEditorStore';
import { useUiStore } from '@/store/useUiStore';
import type { ExportFormat } from '@/types';
import { canvasToBlob, downloadBlob, sanitizeFileName } from '@/utils/download';
import { renderTemplate } from '@/utils/renderToCanvas';

export type ExportAction = 'download' | 'copy' | 'share';

async function createBlob(format: ExportFormat): Promise<Blob> {
  const s = useEditorStore.getState();
  const canvas = await renderTemplate(
    {
      layout: getLayout(s.layoutId),
      aspectRatio: getAspectRatio(s.aspectRatioId),
      style: s.style,
      images: s.images,
      texts: s.texts,
    },
    s.exportOptions.scale,
  );
  return canvasToBlob(
    canvas,
    EXPORT_MIME[format],
    format === 'jpeg' ? s.exportOptions.quality : undefined,
  );
}

const getFileName = (format: ExportFormat) =>
  `${sanitizeFileName(useEditorStore.getState().exportOptions.fileName)}.${EXPORT_EXTENSION[format]}`;

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

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
        if (!isAbortError(error)) {
          console.error(error);
          showToast(failMessage, 'error');
        }
      } finally {
        setBusy(null);
      }
    },
    [showToast],
  );

  const download = useCallback(
    () =>
      run('download', 'Export failed. Please try again', async () => {
        const { format } = useEditorStore.getState().exportOptions;
        downloadBlob(await createBlob(format), getFileName(format));
        showToast('Image downloaded', 'success');
      }),
    [run, showToast],
  );

  const copy = useCallback(
    () =>
      run('copy', "Couldn't copy. Try Download instead", async () => {
        // The ClipboardItem must be created synchronously inside the click (Safari),
        // so it gets the blob promise rather than the blob.
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': createBlob('png') })]);
        showToast('Copied to clipboard', 'success');
      }),
    [run, showToast],
  );

  const share = useCallback(
    () =>
      run('share', "Couldn't share. Try Download instead", async () => {
        const { format } = useEditorStore.getState().exportOptions;
        const blob = await createBlob(format);
        const file = new File([blob], getFileName(format), { type: EXPORT_MIME[format] });
        await navigator.share({ files: [file] });
      }),
    [run],
  );

  return { download, copy, share, busy };
}
