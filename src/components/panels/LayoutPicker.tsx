import { LAYOUTS } from '@/constants/layouts';
import { useCurrentAspectRatio } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import { cn } from '@/utils/cn';
import { LayoutThumbnail } from './LayoutThumbnail';

export function LayoutPicker() {
  const layoutId = useEditorStore((s) => s.layoutId);
  const setLayout = useEditorStore((s) => s.setLayout);
  const aspectRatio = useCurrentAspectRatio();
  const ratio = aspectRatio.height / aspectRatio.width;

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-4">
      {LAYOUTS.map((layout) => {
        const active = layout.id === layoutId;
        return (
          <button
            key={layout.id}
            type="button"
            title={layout.name}
            aria-label={layout.name}
            aria-pressed={active}
            onClick={() => setLayout(layout.id)}
            className={cn(
              'flex aspect-square items-center justify-center rounded-lg border p-2 transition-colors',
              active
                ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                : 'border-neutral-800 text-neutral-600 hover:border-neutral-600 hover:text-neutral-400',
            )}
          >
            <LayoutThumbnail cells={layout.cells} ratio={ratio} />
          </button>
        );
      })}
    </div>
  );
}
