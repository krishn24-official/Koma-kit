import { ColorPicker } from '@/components/ui/ColorPicker';
import { PanelSection } from '@/components/ui/PanelSection';
import { Slider } from '@/components/ui/Slider';
import { BACKGROUND_SWATCHES, STYLE_LIMITS } from '@/constants/editor';
import { useEditorStore } from '@/store/useEditorStore';

export function StylePanel() {
  const style = useEditorStore((s) => s.style);
  const updateStyle = useEditorStore((s) => s.updateStyle);

  return (
    <div className="space-y-6">
      <PanelSection title="Spacing">
        <div className="space-y-4">
          <Slider
            label="Gap between images"
            {...STYLE_LIMITS.gap}
            value={style.gap}
            onChange={(gap) => updateStyle({ gap })}
          />
          <Slider
            label="Outer border"
            {...STYLE_LIMITS.padding}
            value={style.padding}
            onChange={(padding) => updateStyle({ padding })}
          />
          <Slider
            label="Corner radius"
            {...STYLE_LIMITS.radius}
            value={style.radius}
            onChange={(radius) => updateStyle({ radius })}
          />
        </div>
      </PanelSection>

      <PanelSection title="Colors">
        <ColorPicker
          label="Background & gap color"
          value={style.backgroundColor}
          swatches={BACKGROUND_SWATCHES}
          onChange={(backgroundColor) => updateStyle({ backgroundColor })}
        />
      </PanelSection>
    </div>
  );
}
