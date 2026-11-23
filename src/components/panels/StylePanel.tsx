import { PanelSection } from '@/components/ui/PanelSection';
import { Slider } from '@/components/ui/Slider';
import { STYLE_LIMITS } from '@/constants/editor';
import { useEditorStore } from '@/store/useEditorStore';
import { BoxEffectsSection } from './BoxEffectsSection';
import { BoxFadeSection } from './BoxFadeSection';

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

      <BoxFadeSection />
      <BoxEffectsSection />
    </div>
  );
}
