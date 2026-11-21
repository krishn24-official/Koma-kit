import { createEffects } from '@/constants/elements';
import { useEditorStore } from '@/store/useEditorStore';
import { EffectsSections } from './EffectsSections';

/** Fade edges, glow, shadow and colors for the selected box's picture or clip. */
export function BoxEffectsSection() {
  const index = useEditorStore((s) => (s.selection?.kind === 'cell' ? s.selection.index : null));
  const stored = useEditorStore((s) => (index === null ? undefined : s.boxEffects[index]));
  const setBoxEffects = useEditorStore((s) => s.setBoxEffects);

  if (index === null) return null;
  const effects = stored ?? createEffects();

  return (
    <EffectsSections
      effects={effects}
      update={(patch) => setBoxEffects(index, { ...effects, ...patch })}
      prefix={`Box ${index + 1}`}
    />
  );
}
