import { Newspaper } from 'lucide-react';
import { PanelSection } from '@/components/ui/PanelSection';
import { STARTER_TEMPLATES, type StarterTemplate } from '@/constants/templates';
import { useEditorStore } from '@/store/useEditorStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUiStore } from '@/store/useUiStore';

/** One-tap starting points that set up the whole design. */
export function TemplatesSection() {
  const loadTemplate = useEditorStore((s) => s.loadTemplate);
  const showToast = useUiStore((s) => s.showToast);

  const apply = (template: StarterTemplate) => {
    const s = useEditorStore.getState();
    const hasWork = Object.keys(s.cells).length > 0 || s.elements.length > 0;
    if (
      hasWork &&
      !window.confirm(`Start a new ${template.name}? Your current design will be replaced.`)
    ) {
      return;
    }
    usePlaybackStore.getState().pause();
    usePlaybackStore.getState().seek(0);
    loadTemplate(template.build());
    useEditorStore.getState().select({ kind: 'cell', index: 0 });
    showToast('Tap the box for the art and the dashed slots for logos', 'info');
  };

  return (
    <PanelSection title="Starter templates">
      <div className="space-y-2">
        {STARTER_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => apply(template)}
            title={template.description}
            className="flex w-full items-center gap-3 rounded-xl border border-neutral-800 p-3 text-left transition-colors hover:border-brand-500 hover:bg-brand-500/5"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">
              <Newspaper className="size-5" aria-hidden />
            </span>
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="text-sm font-semibold text-neutral-100">{template.name}</span>
              <span className="text-[11px] text-neutral-500 tabular-nums">{template.size}</span>
            </span>
          </button>
        ))}
      </div>
    </PanelSection>
  );
}
