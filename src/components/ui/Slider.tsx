import { useId } from 'react';
import { cn } from '@/utils/cn';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  /** Keeps the label for screen readers but hides it visually. */
  hideLabel?: boolean;
  className?: string;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  formatValue = String,
  hideLabel = false,
  className,
}: SliderProps) {
  const id = useId();

  return (
    <div className={cn('w-full', className)}>
      {!hideLabel && (
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <label htmlFor={id} className="text-neutral-300">
            {label}
          </label>
          <span className="tabular-nums text-neutral-400">{formatValue(value)}</span>
        </div>
      )}
      <input
        id={id}
        type="range"
        aria-label={hideLabel ? label : undefined}
        aria-valuetext={formatValue(value)}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-brand-500"
      />
    </div>
  );
}
