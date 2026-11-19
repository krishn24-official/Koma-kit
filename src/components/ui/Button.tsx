import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { BUTTON_BASE, BUTTON_VARIANTS, type ButtonVariant } from './buttonStyles';

type ButtonSize = 'sm' | 'md' | 'lg';

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 gap-1.5 px-3 text-sm [&_svg]:size-4',
  md: 'h-10 gap-2 px-4 text-sm [&_svg]:size-4',
  lg: 'h-12 gap-2 px-5 text-base [&_svg]:size-5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  fullWidth = false,
  disabled,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        BUTTON_BASE,
        BUTTON_VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}
