import type { PanelId } from '@/store/useUiStore';
import { cn } from '@/utils/cn';
import { PANELS } from './panelRegistry';

interface PanelTabsProps {
  activeId: PanelId | null;
  onSelect: (id: PanelId) => void;
  variant: 'sidebar' | 'bottom';
}

export function PanelTabs({ activeId, onSelect, variant }: PanelTabsProps) {
  return (
    <nav
      aria-label="Editor panels"
      className={cn(
        'grid shrink-0 grid-cols-5',
        variant === 'sidebar'
          ? 'gap-1 border-b border-neutral-800 p-2'
          : 'border-t border-neutral-800 bg-neutral-950 px-1 pb-[env(safe-area-inset-bottom)]',
      )}
    >
      {PANELS.map(({ id, label, icon: Icon }) => {
        const active = id === activeId;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(id)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition-colors',
              active ? 'text-brand-400' : 'text-neutral-400 hover:text-neutral-100',
              active && variant === 'sidebar' && 'bg-neutral-800/70',
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
