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
  const label = upcomingLabel ?? 'Photo or video';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center gap-1 border border-dashed px-1 text-center text-neutral-400 transition-colors',
        highlighted
          ? 'border-brand-400 bg-brand-500/20 text-neutral-200'
          : 'border-neutral-400/30 bg-neutral-500/10 hover:bg-neutral-500/20 hover:text-neutral-200',
      )}
      style={{ borderRadius: 'inherit' }}
    >
      <Icon className={compact ? 'size-4' : 'size-6'} aria-hidden />
      <span className={compact ? 'sr-only' : 'text-xs font-medium'}>{label}</span>
    </button>
  );
}
