import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { BUTTON_BASE, BUTTON_VARIANTS, type ButtonVariant } from './buttonStyles';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accessible name, also shown as a tooltip. */
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
}

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  type = 'button',
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], 'size-9 [&_svg]:size-[18px]', className)}
      {...rest}
    >
      {icon}
    </button>
  );
}
