import { ColorPicker } from '@/components/ui/ColorPicker';
import { PanelSection } from '@/components/ui/PanelSection';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import { DEFAULT_BOX_FADE } from '@/constants/elements';
import { useEditorStore } from '@/store/useEditorStore';
import type { BoxFade } from '@/types';

const FROM_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'sides', label: 'Sides' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'full', label: 'All' },
] as const satisfies ReadonlyArray<{ value: BoxFade['from']; label: string }>;

const FADE_SWATCHES = ['#000000', '#0a0f1e', '#0b1d3a', '#2a1608', '#1f0b2e', '#ffffff'];

const percent = (v: number) => `${Math.round(v * 100)}%`;

/** Color fade over the selected box, e.g. darkening one side so text stays readable. */
export function BoxFadeSection() {
  const index = useEditorStore((s) => (s.selection?.kind === 'cell' ? s.selection.index : null));
  const fade = useEditorStore((s) => (index === null ? undefined : s.boxFades[index]));
  const setBoxFade = useEditorStore((s) => s.setBoxFade);

  if (index === null) {
    return (
      <PanelSection title="Box fade">
        <p className="text-sm text-neutral-400">
          Select a box on the canvas to fade its picture into a color.
        </p>
      </PanelSection>
    );
  }

  const update = (patch: Partial<BoxFade>) => fade && setBoxFade(index, { ...fade, ...patch });

  return (
    <PanelSection title={`Box ${index + 1} fade`}>
      <div className="space-y-4">
        <Toggle
          label="Fade on"
          checked={Boolean(fade)}
          onChange={(on) => setBoxFade(index, on ? { ...DEFAULT_BOX_FADE } : null)}
        />
        {fade && (
          <>
            <SegmentedControl
              ariaLabel="Fade from"
              options={FROM_OPTIONS}
              value={fade.from}
              onChange={(from) => update({ from })}
            />
            <ColorPicker
              label="Color"
              value={fade.color}
              swatches={FADE_SWATCHES}
              onChange={(color) => update({ color })}
            />
            <Slider
              label="Strength"
              min={0.1}
              max={1}
              step={0.05}
              value={fade.opacity}
              onChange={(opacity) => update({ opacity })}
              formatValue={percent}
            />
            {fade.from !== 'full' && (
              <Slider
                label="Reach"
                min={0.1}
                max={1}
                step={0.05}
                value={fade.reach}
                onChange={(reach) => update({ reach })}
                formatValue={percent}
              />
            )}
          </>
        )}
      </div>
    </PanelSection>
  );
}
