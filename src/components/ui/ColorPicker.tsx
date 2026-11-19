import { useId } from 'react';
import { cn } from '@/utils/cn';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  swatches?: string[];
}

const SWATCH = 'size-7 shrink-0 rounded-full border border-white/15 transition-transform hover:scale-110';
const ACTIVE = 'ring-2 ring-brand-500 ring-offset-2 ring-offset-neutral-900';

export function ColorPicker({ label, value, onChange, swatches = [] }: ColorPickerProps) {
  const id = useId();
  const isCustom = !swatches.some((c) => c.toLowerCase() === value.toLowerCase());

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-neutral-300">{label}</span>
        <span className="font-mono text-xs uppercase text-neutral-400">{value}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {swatches.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${label}: ${color}`}
            title={color}
            onClick={() => onChange(color)}
            className={cn(SWATCH, value.toLowerCase() === color.toLowerCase() && ACTIVE)}
            style={{ backgroundColor: color }}
          />
        ))}
        <label
          htmlFor={id}
          title="Custom color"
          className={cn(SWATCH, 'relative cursor-pointer overflow-hidden', isCustom && ACTIVE)}
          style={{
            background: 'conic-gradient(#f43f5e, #f59e0b, #84cc16, #06b6d4, #6366f1, #d946ef, #f43f5e)',
          }}
        >
          <span className="sr-only">{`${label}: custom color`}</span>
          <input
            id={id}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}
