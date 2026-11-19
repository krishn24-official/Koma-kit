import { X } from 'lucide-react';
import { useEffect } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { useUiStore } from '@/store/useUiStore';
import { DownloadOptions } from './DownloadOptions';

/**
 * Opens from the header Download button: pick PNG / JPG / MP4, size and file name,
 * then download. Bottom sheet on phones, centred dialog on larger screens.
 */
export function DownloadDialog() {
  const open = useUiStore((s) => s.downloadDialogOpen);
  const setOpen = useUiStore((s) => s.setDownloadDialogOpen);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  if (!open) return null;
  const close = () => setOpen(false);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="download-dialog-title"
        className="flex max-h-[88dvh] w-full flex-col rounded-t-2xl border border-neutral-800 bg-neutral-900 shadow-2xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-4 py-3">
          <h2 id="download-dialog-title" className="font-semibold">
            Download
          </h2>
          <IconButton label="Close" icon={<X />} onClick={close} />
        </div>
        <div className="overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DownloadOptions onDone={close} />
        </div>
      </div>
    </div>
  );
}
