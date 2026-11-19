import { FONTS } from '@/constants/fonts';
import { cn } from '@/utils/cn';

interface FontPickerProps {
  value: string;
  onChange: (fontId: string) => void;
}

/** Font choices, each shown in its own typeface. */
export function FontPicker({ value, onChange }: FontPickerProps) {
  return (
    <div role="radiogroup" aria-label="Font" className="grid grid-cols-2 gap-2">
      {FONTS.map((font) => {
        const active = font.id === value;
        return (
          <button
            key={font.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(font.id)}
            className={cn(
              'truncate rounded-lg border px-3 py-2 text-left text-lg transition-colors',
              active
                ? 'border-brand-500 bg-brand-500/10 text-white'
                : 'border-neutral-800 text-neutral-300 hover:border-neutral-600',
            )}
            style={{ fontFamily: `"${font.family}"`, fontWeight: font.weight }}
          >
            {font.label}
          </button>
        );
      })}
    </div>
  );
}
