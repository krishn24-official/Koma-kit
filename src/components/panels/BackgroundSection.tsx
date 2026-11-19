import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Slider } from '@/components/ui/Slider';
import {
  BACKGROUND_LIMITS,
  BACKGROUND_SWATCHES,
  GRADIENT_PRESETS,
} from '@/constants/editor';
import { useEditorStore } from '@/store/useEditorStore';
import { useUiStore } from '@/store/useUiStore';
import type { BackgroundType } from '@/types';
import { cn } from '@/utils/cn';
import { readMediaFile, revokeMedia } from '@/utils/media';

const TYPE_OPTIONS = [
  { value: 'solid', label: 'Color' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'image', label: 'Picture' },
] as const satisfies ReadonlyArray<{ value: BackgroundType; label: string }>;

const percent = (v: number) => `${Math.round(v * 100)}%`;

function GradientControls() {
  const style = useEditorStore((s) => s.style);
  const updateStyle = useEditorStore((s) => s.updateStyle);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-6 gap-2">
        {GRADIENT_PRESETS.map((preset) => {
          const active = preset.from === style.gradientFrom && preset.to === style.gradientTo;
          return (
            <button
              key={preset.name}
              type="button"
              title={preset.name}
              aria-label={`${preset.name} gradient`}
              onClick={() => updateStyle({ gradientFrom: preset.from, gradientTo: preset.to })}
              className={cn(
                'aspect-square rounded-lg border border-white/15 transition-transform hover:scale-105',
                active && 'ring-2 ring-brand-500 ring-offset-2 ring-offset-neutral-900',
              )}
              style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
            />
          );
        })}
      </div>
      <ColorPicker
        label="From"
        value={style.gradientFrom}
        swatches={BACKGROUND_SWATCHES}
        onChange={(gradientFrom) => updateStyle({ gradientFrom })}
      />
      <ColorPicker
        label="To"
        value={style.gradientTo}
        swatches={BACKGROUND_SWATCHES}
        onChange={(gradientTo) => updateStyle({ gradientTo })}
      />
      <Slider
        label="Direction"
        min={0}
        max={360}
        step={5}
        value={style.gradientAngle}
        onChange={(gradientAngle) => updateStyle({ gradientAngle })}
        formatValue={(v) => `${v}°`}
      />
    </div>
  );
}

function ImageControls() {
  const style = useEditorStore((s) => s.style);
  const updateStyle = useEditorStore((s) => s.updateStyle);
  const setBackgroundImage = useEditorStore((s) => s.setBackgroundImage);
  const showToast = useUiStore((s) => s.showToast);
  const inputRef = useRef<HTMLInputElement>(null);
  const image = style.backgroundImage;

  const handleFiles = async ([file]: File[]) => {
    if (!file) return;
    try {
      const media = await readMediaFile(file);
      if (media.kind !== 'image') {
        revokeMedia(media);
        showToast('The background must be a picture, not a video', 'error');
        return;
      }
      setBackgroundImage({
        src: media.src,
        file: media.file,
        naturalWidth: media.naturalWidth,
        naturalHeight: media.naturalHeight,
      });
    } catch {
      showToast(`Couldn't open "${file.name}"`, 'error');
    }
  };

  return (
    <div className="space-y-4">
      {image ? (
        <div className="flex items-center gap-3">
          <img
            src={image.src}
            alt=""
            className="size-14 shrink-0 rounded-lg border border-neutral-700 object-cover"
          />
          <div className="flex flex-1 gap-2">
            <Button size="sm" icon={<RefreshCw />} onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 />}
              onClick={() => setBackgroundImage(null)}
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="primary"
          fullWidth
          icon={<ImagePlus />}
          onClick={() => inputRef.current?.click()}
        >
          Choose background picture
        </Button>
      )}
      <Slider
        label="Blur"
        {...BACKGROUND_LIMITS.blur}
        value={style.backgroundBlur}
        onChange={(backgroundBlur) => updateStyle({ backgroundBlur })}
      />
      <Slider
        label="Darken"
        {...BACKGROUND_LIMITS.dim}
        step={0.05}
        value={style.backgroundDim}
        onChange={(backgroundDim) => updateStyle({ backgroundDim })}
        formatValue={percent}
      />
      <HiddenFileInput ref={inputRef} accept="image/*" onFiles={handleFiles} />
    </div>
  );
}

/** Background behind the boxes: solid color, gradient, or a (blurred) picture. */
export function BackgroundSection() {
  const style = useEditorStore((s) => s.style);
  const updateStyle = useEditorStore((s) => s.updateStyle);

  return (
    <div className="space-y-4">
      <SegmentedControl
        ariaLabel="Background type"
        options={TYPE_OPTIONS}
        value={style.backgroundType}
        onChange={(backgroundType) => updateStyle({ backgroundType })}
      />
      {style.backgroundType === 'solid' && (
        <ColorPicker
          label="Background & gap color"
          value={style.backgroundColor}
          swatches={BACKGROUND_SWATCHES}
          onChange={(backgroundColor) => updateStyle({ backgroundColor })}
        />
      )}
      {style.backgroundType === 'gradient' && <GradientControls />}
      {style.backgroundType === 'image' && <ImageControls />}
      {style.backgroundType !== 'solid' && style.gap === 0 && style.padding === 0 && (
        <p className="rounded-lg bg-neutral-800/60 px-3 py-2 text-xs text-neutral-300">
          The background shows in the gaps and border. Turn up “Gap between images” or “Outer
          border” in the Style tab to see it.
        </p>
      )}
    </div>
  );
}
