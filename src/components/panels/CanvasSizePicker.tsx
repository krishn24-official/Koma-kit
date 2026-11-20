import { ArrowLeftRight, Check } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import {
  customSize,
  describeRatio,
  fromPreset,
  MAX_SIDE,
  MIN_SIDE,
  PLATFORM_PRESETS,
  RATIO_PRESETS,
} from '@/constants/canvasSizes';
import { useEditorStore } from '@/store/useEditorStore';
import type { CanvasPreset } from '@/types';
import { cn } from '@/utils/cn';

const ICON_SIZE = 26;

const optionClass = (active: boolean) =>
  cn(
    'rounded-lg border transition-colors',
    active
      ? 'border-brand-500 bg-brand-500/10 text-brand-400'
      : 'border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200',
  );

function ShapeIcon({ width, height }: { width: number; height: number }) {
  const scale = ICON_SIZE / Math.max(width, height);
  return (
    <span className="flex h-7 items-center justify-center" aria-hidden>
      <span
        className="rounded-[3px] border-2 border-current"
        style={{ width: width * scale, height: height * scale }}
      />
    </span>
  );
}

function SubHeading({ children }: { children: string }) {
  return <h3 className="mb-2 text-xs font-medium text-neutral-500">{children}</h3>;
}

/** Ratio presets, platform presets and a custom width × height. */
export function CanvasSizePicker() {
  const canvasSize = useEditorStore((s) => s.canvasSize);
  const setCanvasSize = useEditorStore((s) => s.setCanvasSize);
  const select = (preset: CanvasPreset) => setCanvasSize(fromPreset(preset));

  // Draft inputs; applied on submit so half-typed numbers don't reshape the canvas.
  const [draft, setDraft] = useState({ width: '', height: '' });
  const width = draft.width || String(canvasSize.width);
  const height = draft.height || String(canvasSize.height);

  const apply = (e?: FormEvent) => {
    e?.preventDefault();
    const w = Number(width);
    const h = Number(height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
    setCanvasSize(customSize(w, h));
    setDraft({ width: '', height: '' });
  };

  const swap = () => {
    setCanvasSize(customSize(canvasSize.height, canvasSize.width));
    setDraft({ width: '', height: '' });
  };

  const inputClass =
    'h-10 w-full min-w-0 rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 text-sm text-neutral-100 tabular-nums focus:border-brand-500 focus:outline-none';

  return (
    <div className="space-y-4">
      <div>
        <SubHeading>Ratios</SubHeading>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 md:grid-cols-3">
          {RATIO_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={preset.id === canvasSize.presetId}
              onClick={() => select(preset)}
              className={cn(
                optionClass(preset.id === canvasSize.presetId),
                'flex flex-col items-center gap-1 px-2 py-2',
              )}
            >
              <ShapeIcon width={preset.width} height={preset.height} />
              <span className="text-xs font-semibold">{preset.label}</span>
              <span className="text-[10px] text-neutral-500">{preset.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <SubHeading>Platforms</SubHeading>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORM_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              aria-pressed={preset.id === canvasSize.presetId}
              onClick={() => select(preset)}
              className={cn(
                optionClass(preset.id === canvasSize.presetId),
                'flex items-center gap-2 px-2 py-2 text-left',
              )}
            >
              <span className="w-7 shrink-0">
                <ShapeIcon width={preset.width} height={preset.height} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">{preset.label}</span>
                <span className="block text-[10px] text-neutral-500 tabular-nums">
                  {preset.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={apply}>
        <SubHeading>Custom size (pixels)</SubHeading>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            aria-label="Width in pixels"
            min={MIN_SIDE}
            max={MAX_SIDE}
            value={width}
            onChange={(e) => setDraft((d) => ({ ...d, width: e.target.value }))}
            className={inputClass}
          />
          <span className="text-neutral-500">×</span>
          <input
            type="number"
            inputMode="numeric"
            aria-label="Height in pixels"
            min={MIN_SIDE}
            max={MAX_SIDE}
            value={height}
            onChange={(e) => setDraft((d) => ({ ...d, height: e.target.value }))}
            className={inputClass}
          />
          <IconButton label="Swap width and height" icon={<ArrowLeftRight />} onClick={swap} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-neutral-400 tabular-nums">
            Now {canvasSize.width} × {canvasSize.height} ·{' '}
            {describeRatio(canvasSize.width, canvasSize.height)}
          </span>
          <Button type="submit" size="sm" icon={<Check />} disabled={!draft.width && !draft.height}>
            Apply
          </Button>
        </div>
      </form>
    </div>
  );
}
