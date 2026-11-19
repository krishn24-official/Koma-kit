import { Clock, ImagePlus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface EmptyCellProps {
  compact: boolean;
  highlighted: boolean;
  /** Set when the cell has media scheduled for later, e.g. "Starts at 0:05.0". */
  upcomingLabel?: string;
  onClick: () => void;
}

/** Placeholder for a cell with nothing showing. Editor only, not exported. */
export function EmptyCell({ compact, highlighted, upcomingLabel, onClick }: EmptyCellProps) {
  const Icon = upcomingLabel ? Clock : ImagePlus;
  const label = upcomingLabel ?? 'Add image or video';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center gap-1 border border-dashed px-1 text-center text-neutral-300 transition-colors',
        highlighted
          ? 'border-brand-400 bg-brand-500/20'
          : 'border-neutral-400/40 bg-neutral-500/15 hover:bg-neutral-500/25',
      )}
      style={{ borderRadius: 'inherit' }}
    >
      <Icon className={compact ? 'size-4' : 'size-6'} aria-hidden />
      <span className={compact ? 'sr-only' : 'text-xs font-medium'}>{label}</span>
    </button>
  );
}
