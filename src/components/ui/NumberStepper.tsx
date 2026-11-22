import { Minus, Plus } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { IconButton } from './IconButton';

interface NumberStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

/** A label with − [number] + : type a number or step it. */
export function NumberStepper({ label, value, min, max, onChange }: NumberStepperProps) {
  const id = useId();
  // Text while typing, so the box can be empty for a moment.
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = (raw: string) => {
    clearTimeout(timer.current);
    const n = Math.round(Number(raw));
    if (raw.trim() === '' || !Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    setText(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm text-neutral-300">
        {label}
      </label>
      <div className="flex items-center gap-1">
        <IconButton
          label={`Fewer ${label.toLowerCase()}`}
          icon={<Minus />}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        />
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={text}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d]/g, '');
            setText(raw);
            // Apply after a short pause, so typing "12" doesn't pass through 1.
            clearTimeout(timer.current);
            if (raw !== '') timer.current = setTimeout(() => commit(raw), 700);
          }}
          onBlur={() => commit(text)}
          onKeyDown={(e) => e.key === 'Enter' && commit(text)}
          className="h-9 w-12 rounded-lg border border-neutral-700 bg-neutral-800/60 text-center text-sm text-neutral-100 tabular-nums focus:border-brand-500 focus:outline-none"
        />
        <IconButton
          label={`More ${label.toLowerCase()}`}
          icon={<Plus />}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        />
      </div>
    </div>
  );
}
