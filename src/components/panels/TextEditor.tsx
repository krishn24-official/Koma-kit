import { AlignCenterHorizontal, AlignCenterVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Field, TextArea } from '@/components/ui/Field';
import { PanelSection } from '@/components/ui/PanelSection';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import { TEXT_COLOR_SWATCHES, TEXT_LIMITS } from '@/constants/editor';
import { useEditorStore } from '@/store/useEditorStore';
import type { TextOverlay } from '@/types';
import { FontPicker } from './FontPicker';

export function TextEditor({ text }: { text: TextOverlay }) {
  const updateText = useEditorStore((s) => s.updateText);
  const removeText = useEditorStore((s) => s.removeText);
  const update = (patch: Partial<Omit<TextOverlay, 'id'>>) => updateText(text.id, patch);

  return (
    <div className="space-y-6">
      <PanelSection title="Edit text">
        <div className="space-y-4">
          <Field label="Text">
            {(id) => (
              <TextArea
                id={id}
                rows={2}
                value={text.text}
                placeholder="Type something…"
                onChange={(e) => update({ text: e.target.value })}
              />
            )}
          </Field>
          <Slider
            label="Size"
            {...TEXT_LIMITS.fontSize}
            value={text.fontSize}
            onChange={(fontSize) => update({ fontSize })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" icon={<AlignCenterVertical />} onClick={() => update({ x: 0.5 })}>
              Center X
            </Button>
            <Button size="sm" icon={<AlignCenterHorizontal />} onClick={() => update({ y: 0.5 })}>
              Center Y
            </Button>
          </div>
        </div>
      </PanelSection>

      <PanelSection title="Font">
        <FontPicker value={text.fontId} onChange={(fontId) => update({ fontId })} />
      </PanelSection>

      <PanelSection title="Appearance">
        <div className="space-y-4">
          <ColorPicker
            label="Text color"
            value={text.color}
            swatches={TEXT_COLOR_SWATCHES}
            onChange={(color) => update({ color })}
          />
          <ColorPicker
            label="Outline color"
            value={text.strokeColor}
            swatches={TEXT_COLOR_SWATCHES}
            onChange={(strokeColor) => update({ strokeColor })}
          />
          <Slider
            label="Outline width"
            {...TEXT_LIMITS.strokeWidth}
            value={text.strokeWidth}
            onChange={(strokeWidth) => update({ strokeWidth })}
          />
          <Toggle
            label="Drop shadow"
            checked={text.shadow}
            onChange={(shadow) => update({ shadow })}
          />
        </div>
      </PanelSection>

      <Button variant="danger" fullWidth icon={<Trash2 />} onClick={() => removeText(text.id)}>
        Delete text
      </Button>
    </div>
  );
}
