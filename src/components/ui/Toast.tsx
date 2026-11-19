import { useEffect } from 'react';
import { useUiStore, type ToastTone } from '@/store/useUiStore';
import { cn } from '@/utils/cn';

const TONES: Record<ToastTone, string> = {
  info: 'bg-neutral-100 text-neutral-900',
  success: 'bg-emerald-500 text-white',
  error: 'bg-red-500 text-white',
};

export function Toast() {
  const toast = useUiStore((s) => s.toast);
  const dismiss = useUiStore((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, 3000);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8"
    >
      {toast && (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto max-w-sm rounded-full px-4 py-2 text-center text-sm font-medium shadow-lg',
            TONES[toast.tone],
          )}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
