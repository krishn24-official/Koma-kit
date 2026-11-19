export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export const BUTTON_BASE =
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors select-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:shrink-0';

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/25',
  secondary: 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700',
  ghost: 'text-neutral-300 hover:bg-neutral-800 hover:text-white',
  danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20',
};
