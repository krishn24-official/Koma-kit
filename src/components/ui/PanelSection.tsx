import type { ReactNode } from 'react';

interface PanelSectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function PanelSection({ title, action, children }: PanelSectionProps) {
  return (
    <section>
      <div className="mb-3 flex min-h-8 items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
