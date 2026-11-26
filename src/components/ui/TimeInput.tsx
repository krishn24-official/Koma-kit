import { useEffect, useId, useState } from 'react';
import { cn } from '@/utils/cn';
import { formatTime, parseTime } from '@/utils/timeline';

interface TimeInputProps {
  label: string;
  /** Seconds, or null for "not set" (shown as `emptyText`). */
  value: number | null;
  onChange: (seconds: number | null) => void;
  /** When set, the box may be left empty (e.g. "until the end"). */
  emptyText?: string;
  className?: string;
}

/**
 * A small box to type a time into (e.g. 0:05.5). It applies on Enter or when leaving
 * the box; anything that isn't a time goes back to the last good value.
 */
export function TimeInput({ label, value, onChange, emptyText, className }: TimeInputProps) {
  const id = useId();
  const show = (v: number | null) => (v === null ? '' : formatTime(Math.round(v * 10) / 10 + 1e-6));
  const [text, setText] = useState(show(value));
  useEffect(() => setText(show(value)), [value]);

  const commit = () => {
    if (text.trim() === '' && emptyText !== undefined) {
      if (value !== null) onChange(null);
      return;
    }
    const seconds = parseTime(text);
    if (seconds === null) {
      setText(show(value));
      return;
    }
    if (value === null || Math.abs(seconds - value) > 0.001) onChange(seconds);
    else setText(show(value));
  };

  return (
    <label
      htmlFor={id}
      className={cn('flex items-center gap-2 text-sm text-neutral-300', className)}
    >
      <span className="shrink-0">{label}</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={text}
        placeholder={emptyText ?? '0:00.0'}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="h-9 w-24 min-w-0 rounded-lg border border-neutral-700 bg-neutral-800/60 px-2 text-center text-sm text-neutral-100 tabular-nums placeholder:text-neutral-500 focus:border-brand-500 focus:outline-none"
      />
    </label>
  );
}
