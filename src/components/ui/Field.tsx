import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const INPUT_BASE =
  'w-full rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 text-sm text-neutral-100 ' +
  'placeholder:text-neutral-500 focus:border-brand-500 focus:outline-none';

interface FieldProps {
  label: string;
  children: (id: string) => ReactNode;
}

/** Label + control. The control gets the generated id through a render prop. */
export function Field({ label, children }: FieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-neutral-300">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" className={cn(INPUT_BASE, 'h-10', className)} {...props} />;
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(INPUT_BASE, 'resize-y py-2 leading-snug', className)} {...props} />;
}
