import { Loader2 } from 'lucide-react';
import { useUiStore } from '@/store/useUiStore';
import { Button } from './Button';

/** Blocking overlay while an MP4 is being created. */
export function ExportProgress() {
  const videoExport = useUiStore((s) => s.videoExport);
  if (!videoExport) return null;

  const percent = Math.round(videoExport.progress * 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-progress-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-brand-400" aria-hidden />
          <h2 id="export-progress-title" className="font-semibold">
            Creating video… <span className="tabular-nums">{percent}%</span>
          </h2>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-neutral-800"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div
            className="h-full rounded-full bg-brand-500 transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs leading-relaxed text-neutral-400">
          Keep this screen open until it finishes. Everything happens on your device, so
          long clips can take a minute on phones.
        </p>
        <Button fullWidth onClick={videoExport.cancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
