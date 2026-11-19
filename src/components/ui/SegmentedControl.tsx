import { cn } from '@/utils/cn';

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

interface SegmentedControlProps<T extends string | number> {
  ariaLabel: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string | number>({
  ariaLabel,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid gap-1 rounded-xl bg-neutral-800/60 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex flex-col items-center rounded-lg px-2 py-2 text-sm font-medium transition-colors',
              active ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-400 hover:text-neutral-100',
            )}
          >
            {option.label}
            {option.hint && (
              <span
                className={cn(
                  'text-[11px] font-normal tabular-nums',
                  active ? 'text-neutral-600' : 'text-neutral-500',
                )}
              >
                {option.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
