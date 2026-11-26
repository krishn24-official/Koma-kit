import { Check, ImagePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { IconButton } from '@/components/ui/IconButton';
import { TimeInput } from '@/components/ui/TimeInput';
import { useAddPictureAtTimes } from '@/hooks/useStickerUpload';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import type { ElementTransition } from '@/types';
import { cn } from '@/utils/cn';

/** Effects offered here (all of them are in Elements → Timing afterwards). */
const EFFECTS: ReadonlyArray<{ id: ElementTransition; label: string }> = [
  { id: 'fade', label: 'Fade' },
  { id: 'slide-up', label: 'Slide up' },
  { id: 'zoom', label: 'Zoom' },
  { id: 'pop', label: 'Pop' },
  { id: 'none', label: 'None' },
];

/** How long a picture shows by default (seconds). */
const DEFAULT_LENGTH = 3;

/**
 * "Image with timer": choose a picture and type when it appears and disappears. It's
 * added in the top area at exactly those times, ready to move and resize.
 */
export function TimedImageDialog({ onClose }: { onClose: () => void }) {
  const start = usePlaybackStore.getState().currentTime;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [from, setFrom] = useState(Math.round(start * 10) / 10);
  const [until, setUntil] = useState<number | null>(Math.round((start + DEFAULT_LENGTH) * 10) / 10);
  const [effect, setEffect] = useState<ElementTransition>('fade');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const add = useAddPictureAtTimes();

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const invalid = until !== null && until <= from + 0.1;

  const submit = async () => {
    if (!file || invalid) return;
    setBusy(true);
    const ok = await add(file, from, until, effect);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="timed-image-title"
        className="flex max-h-[88dvh] w-full flex-col rounded-t-2xl border border-neutral-800 bg-neutral-900 shadow-2xl sm:max-w-sm sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-4 py-3">
          <h2 id="timed-image-title" className="font-semibold">
            Image with timer
          </h2>
          <IconButton label="Close" icon={<X />} onClick={onClose} />
        </div>
        <div className="space-y-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-28 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-700 bg-neutral-950 text-sm text-neutral-300 hover:border-brand-500"
          >
            {preview ? (
              <img src={preview} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="flex items-center gap-2">
                <ImagePlus className="size-5" aria-hidden />
                Choose picture
              </span>
            )}
          </button>
          <HiddenFileInput ref={inputRef} accept="image/*" onFiles={([f]) => f && setFile(f)} />

          <div className="grid grid-cols-1 gap-2">
            <TimeInput
              label="Start"
              value={from}
              onChange={(v) => setFrom(Math.max(0, v ?? 0))}
              className="justify-between"
            />
            <TimeInput
              label="End"
              value={until}
              emptyText="end"
              onChange={setUntil}
              className="justify-between"
            />
            {invalid && <p className="text-xs text-amber-300">End must be after the start.</p>}
          </div>

          <div>
            <p className="mb-1.5 text-sm text-neutral-300">Effect</p>
            <div className="flex flex-wrap gap-1.5">
              {EFFECTS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={effect === id}
                  onClick={() => setEffect(id)}
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
                    effect === id
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-neutral-800 text-neutral-300 hover:border-neutral-600',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            fullWidth
            icon={<Check />}
            disabled={!file || invalid}
            loading={busy}
            onClick={() => void submit()}
          >
            Add picture
          </Button>
        </div>
      </div>
    </div>
  );
}
