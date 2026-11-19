import { ImagePlus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface EmptyCellProps {
  compact: boolean;
  highlighted: boolean;
  onClick: () => void;
}

/** Placeholder for a cell with no image. Shown in the editor only, not in exports. */
export function EmptyCell({ compact, highlighted, onClick }: EmptyCellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center gap-1 border border-dashed text-neutral-300 transition-colors',
        highlighted
          ? 'border-brand-400 bg-brand-500/20'
          : 'border-neutral-400/40 bg-neutral-500/15 hover:bg-neutral-500/25',
      )}
      style={{ borderRadius: 'inherit' }}
    >
      <ImagePlus className={compact ? 'size-4' : 'size-6'} aria-hidden />
      {!compact && <span className="text-xs font-medium">Add image</span>}
      {compact && <span className="sr-only">Add image</span>}
    </button>
  );
}
