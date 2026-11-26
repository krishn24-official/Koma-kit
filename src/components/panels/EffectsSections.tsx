import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { PanelSection } from '@/components/ui/PanelSection';
import { Slider } from '@/components/ui/Slider';
import { DEFAULT_GLOW, DEFAULT_SHADOW, NO_ADJUST, NO_BORDER, NO_FADE } from '@/constants/elements';
import type {
  PictureEffects,
  StickerAdjust,
  StickerFade,
  StickerGlow,
  StickerShadow,
} from '@/types';
import { hasAdjust, hasFade } from '@/utils/pictureEffects';

const BORDER_SWATCHES = [
  '#ffffff',
  '#000000',
  '#f5f0e6',
  '#e11d48',
  '#f59e0b',
  '#38bdf8',
  '#a855f7',
];

const percent = (v: number) => `${Math.round(v * 100)}%`;

const GLOW_SWATCHES = ['#a855f7', '#f97316', '#facc15', '#38bdf8', '#ef4444', '#22c55e', '#ffffff'];

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="ghost" icon={<RotateCcw />} onClick={onClick}>
      Reset
    </Button>
  );
}

const FADE_SIDES = [
  { key: 'bottom', label: 'Bottom' },
  { key: 'top', label: 'Top' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
] as const satisfies ReadonlyArray<{ key: keyof StickerFade; label: string }>;

const round = (v: number) => String(Math.round(v));

interface EffectsSectionsProps {
  effects: PictureEffects;
  update: (patch: Partial<PictureEffects>) => void;
  /** Section title prefix, e.g. "Box 2". */
  prefix?: string;
}

/**
 * Effects that blend a picture into the design: fading edges, glow, shadow and color.
 * Used for pictures on the canvas and for grid boxes.
 */
export function EffectsSections({ effects, update, prefix }: EffectsSectionsProps) {
  const { border, fade, glow, shadow, adjust } = effects;
  const title = (name: string) => (prefix ? `${prefix} ${name.toLowerCase()}` : name);
  const setFade = (patch: Partial<StickerFade>) => update({ fade: { ...fade, ...patch } });
  const setGlow = (patch: Partial<StickerGlow>) => update({ glow: { ...glow, ...patch } });
  const setShadow = (patch: Partial<StickerShadow>) => update({ shadow: { ...shadow, ...patch } });
  const setAdjust = (patch: Partial<StickerAdjust>) => update({ adjust: { ...adjust, ...patch } });

  return (
    <>
      <PanelSection
        title={title('Border')}
        action={
          border.width > 0 && (
            <ResetButton
              onClick={() => update({ border: { ...NO_BORDER, color: border.color } })}
            />
          )
        }
      >
        <div className="space-y-4">
          <Slider
            label="Width"
            min={0}
            max={40}
            step={0.5}
            value={border.width}
            onChange={(width) => update({ border: { ...border, width } })}
            formatValue={(v) => String(Math.round(v * 10) / 10)}
          />
          {border.width > 0 && (
            <ColorPicker
              label="Border color"
              value={border.color}
              swatches={BORDER_SWATCHES}
              onChange={(color) => update({ border: { ...border, color } })}
            />
          )}
        </div>
      </PanelSection>

      <PanelSection
        title={title('Fade edges')}
        action={hasFade(fade) && <ResetButton onClick={() => update({ fade: { ...NO_FADE } })} />}
      >
        <div className="space-y-4">
          {FADE_SIDES.map(({ key, label }) => (
            <Slider
              key={key}
              label={label}
              min={0}
              max={0.9}
              step={0.05}
              value={fade[key]}
              onChange={(v) => setFade({ [key]: v })}
              formatValue={percent}
            />
          ))}
        </div>
      </PanelSection>

      <PanelSection
        title={title('Glow')}
        action={
          glow.strength > 0 && (
            <ResetButton onClick={() => update({ glow: { ...DEFAULT_GLOW, color: glow.color } })} />
          )
        }
      >
        <div className="space-y-4">
          <Slider
            label="Strength"
            min={0}
            max={1}
            step={0.05}
            value={glow.strength}
            onChange={(strength) => setGlow({ strength })}
            formatValue={percent}
          />
          {glow.strength > 0 && (
            <>
              <Slider
                label="Size"
                min={4}
                max={150}
                value={glow.size}
                onChange={(size) => setGlow({ size })}
                formatValue={round}
              />
              <ColorPicker
                label="Glow color"
                value={glow.color}
                swatches={GLOW_SWATCHES}
                onChange={(color) => setGlow({ color })}
              />
            </>
          )}
        </div>
      </PanelSection>

      <PanelSection
        title={title('Shadow')}
        action={
          shadow.strength > 0 && (
            <ResetButton onClick={() => update({ shadow: { ...DEFAULT_SHADOW } })} />
          )
        }
      >
        <div className="space-y-4">
          <Slider
            label="Strength"
            min={0}
            max={1}
            step={0.05}
            value={shadow.strength}
            onChange={(strength) => setShadow({ strength })}
            formatValue={percent}
          />
          {shadow.strength > 0 && (
            <>
              <Slider
                label="Softness"
                min={0}
                max={100}
                value={shadow.blur}
                onChange={(blur) => setShadow({ blur })}
                formatValue={round}
              />
              <Slider
                label="Distance"
                min={0}
                max={60}
                value={shadow.distance}
                onChange={(distance) => setShadow({ distance })}
                formatValue={round}
              />
            </>
          )}
        </div>
      </PanelSection>

      <PanelSection
        title={title('Picture colors')}
        action={
          hasAdjust(adjust) && <ResetButton onClick={() => update({ adjust: { ...NO_ADJUST } })} />
        }
      >
        <div className="space-y-4">
          <Slider
            label="Brightness"
            min={0.2}
            max={1.8}
            step={0.05}
            value={adjust.brightness}
            onChange={(brightness) => setAdjust({ brightness })}
            formatValue={percent}
          />
          <Slider
            label="Contrast"
            min={0.5}
            max={1.8}
            step={0.05}
            value={adjust.contrast}
            onChange={(contrast) => setAdjust({ contrast })}
            formatValue={percent}
          />
          <Slider
            label="Saturation"
            min={0}
            max={2}
            step={0.05}
            value={adjust.saturation}
            onChange={(saturation) => setAdjust({ saturation })}
            formatValue={percent}
          />
        </div>
      </PanelSection>
    </>
  );
}
