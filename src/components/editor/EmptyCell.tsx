import { ClipboardPaste, Clock, ImagePlus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface EmptyCellProps {
  compact: boolean;
  highlighted: boolean;
  /** Set when the cell has media scheduled for later, e.g. "Starts at 0:05.0". */
  upcomingLabel?: string;
  onClick: () => void;
  /** Shows a Paste button (where the clipboard can be read). */
  onPaste?: () => void;
}

/** Placeholder for a cell with nothing showing. Editor only, not exported. */
export function EmptyCell({
  compact,
  highlighted,
  upcomingLabel,
  onClick,
  onPaste,
}: EmptyCellProps) {
  const Icon = upcomingLabel ? Clock : ImagePlus;
  const label = upcomingLabel ?? 'Add image or video';

  return (
    <>
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
        {/* Room for the Paste button below the label. */}
        {onPaste && !compact && <span className="h-9" aria-hidden />}
      </button>
      {onPaste && !compact && (
        <button
          type="button"
          onClick={onPaste}
          className="absolute top-1/2 left-1/2 mt-6 flex -translate-x-1/2 items-center gap-1 rounded-full border border-neutral-500/50 bg-neutral-900/80 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:border-brand-400"
        >
          <ClipboardPaste className="size-3.5" aria-hidden />
          Paste
        </button>
      )}
    </>
  );
}
