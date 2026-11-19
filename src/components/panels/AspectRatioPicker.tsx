import { ASPECT_RATIOS } from '@/constants/aspectRatios';
import { useEditorStore } from '@/store/useEditorStore';
import { cn } from '@/utils/cn';

const ICON_SIZE = 26;

export function AspectRatioPicker() {
  const aspectRatioId = useEditorStore((s) => s.aspectRatioId);
  const setAspectRatio = useEditorStore((s) => s.setAspectRatio);

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 md:grid-cols-3">
      {ASPECT_RATIOS.map((ratio) => {
        const active = ratio.id === aspectRatioId;
        const scale = ICON_SIZE / Math.max(ratio.width, ratio.height);
        return (
          <button
            key={ratio.id}
            type="button"
            aria-pressed={active}
            onClick={() => setAspectRatio(ratio.id)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg border px-2 py-2 transition-colors',
              active
                ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                : 'border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200',
            )}
          >
            <span className="flex h-7 items-center justify-center" aria-hidden>
              <span
                className="rounded-[3px] border-2 border-current"
                style={{ width: ratio.width * scale, height: ratio.height * scale }}
              />
            </span>
            <span className="text-xs font-semibold">{ratio.label}</span>
            <span className="text-[10px] text-neutral-500">{ratio.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
