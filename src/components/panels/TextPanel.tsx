import { Plus, Type } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PanelSection } from '@/components/ui/PanelSection';
import { useSelectedText } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import { cn } from '@/utils/cn';
import { TextEditor } from './TextEditor';

export function TextPanel() {
  const texts = useEditorStore((s) => s.texts);
  const addText = useEditorStore((s) => s.addText);
  const select = useEditorStore((s) => s.select);
  const selected = useSelectedText();

  return (
    <div className="space-y-6">
      <PanelSection
        title="Text layers"
        action={
          <Button variant="primary" size="sm" icon={<Plus />} onClick={() => addText()}>
            Add text
          </Button>
        }
      >
        {texts.length === 0 ? (
          <p className="text-sm leading-relaxed text-neutral-400">
            Add a title like <span className="text-neutral-200">“#10 Victory Pose”</span>, then
            drag it on the canvas to position it.
          </p>
        ) : (
          <ul className="space-y-1">
            {texts.map((text) => (
              <li key={text.id}>
                <button
                  type="button"
                  onClick={() => select({ kind: 'text', id: text.id })}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    selected?.id === text.id
                      ? 'bg-brand-500/15 text-white'
                      : 'text-neutral-300 hover:bg-neutral-800',
                  )}
                >
                  <Type className="size-4 shrink-0 text-neutral-500" aria-hidden />
                  <span className="truncate">{text.text.trim() || 'Empty text'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>

      {selected && <TextEditor key={selected.id} text={selected} />}
    </div>
  );
}
