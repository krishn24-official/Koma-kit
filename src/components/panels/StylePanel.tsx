import { Frame } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PanelSection } from '@/components/ui/PanelSection';
import { Slider } from '@/components/ui/Slider';
import { STYLE_LIMITS } from '@/constants/editor';
import { useEditorStore } from '@/store/useEditorStore';
import { useUiStore } from '@/store/useUiStore';

export function StylePanel() {
  const style = useEditorStore((s) => s.style);
  const updateStyle = useEditorStore((s) => s.updateStyle);
  const setActivePanel = useUiStore((s) => s.setActivePanel);

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
        <p className="mb-3 text-sm text-neutral-400">
          Gap and background color, gradients and background pictures are in the Canvas tab.
        </p>
        <Button size="sm" icon={<Frame />} onClick={() => setActivePanel('canvas')}>
          Open Canvas
        </Button>
      </PanelSection>
    </div>
  );
}
