import { Check, LayoutGrid, Settings2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PanelSection } from '@/components/ui/PanelSection';
import { useSheetStore } from '@/store/useSheetStore';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/utils/cn';
import { SheetCardsPanel, SheetFormatPanel } from './SheetPanels';

/** Sidebar contents (tablet/desktop) while the sheet is open. */
export function SheetSidebar() {
  return (
    <aside className="hidden w-80 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900/40 md:flex xl:w-96">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
        <SheetCardsPanel />
        <SheetFormatPanel />
      </div>
    </aside>
  );
}

type SheetTab = 'cards' | 'format';
const TABS = [
  { id: 'cards', label: 'Cards', icon: LayoutGrid },
  { id: 'format', label: 'Format', icon: Settings2 },
] as const;

/** Phone: two tabs that open the Cards or Format panel under the sheet. */
export function SheetMobilePanel() {
  const open = useUiStore((s) => s.mobilePanelOpen);
  const [tab, setTab] = useState<SheetTab>('cards');

  const toggle = (id: SheetTab) => {
    const ui = useUiStore.getState();
    if (open && tab === id) ui.closeMobilePanel();
    else {
      setTab(id);
      useUiStore.setState({ mobilePanelOpen: true });
    }
  };

  return (
    <div className="shrink-0 md:hidden">
      {open && (
        <div className="max-h-[45dvh] overflow-y-auto overscroll-contain border-t border-neutral-800 bg-neutral-900 p-4">
          {tab === 'cards' ? <SheetCardsPanel /> : <SheetFormatPanel />}
        </div>
      )}
      <nav className="grid grid-cols-2 border-t border-neutral-800 bg-neutral-950 px-1 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = open && tab === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(id)}
              className={cn(
                'flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors',
                active ? 'text-brand-400' : 'text-neutral-400 hover:text-neutral-200',
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/** Shown above the editor while a sheet card is being edited. */
export function EditingCardBar() {
  const editingId = useSheetStore((s) => s.editingId);
  const index = useSheetStore((s) => s.cards.findIndex((c) => c.id === s.editingId));
  const busy = useSheetStore((s) => s.pending > 0);
  if (!editingId) return null;
  const { finishEditing, cancelEditing } = useSheetStore.getState();

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-brand-500/30 bg-brand-500/10 px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-100">
        Editing card {index + 1}
      </span>
      <Button size="sm" variant="ghost" icon={<X />} disabled={busy} onClick={cancelEditing}>
        Cancel
      </Button>
      <Button
        size="sm"
        variant="primary"
        icon={<Check />}
        loading={busy}
        onClick={() => void finishEditing()}
      >
        Done
      </Button>
    </div>
  );
}

/** Layout panel entry point. */
export function SheetEntrySection() {
  const editing = useSheetStore((s) => s.editingId !== null);
  if (editing) return null;
  return (
    <PanelSection title="Card sheet">
      <Button fullWidth icon={<LayoutGrid />} onClick={() => void useSheetStore.getState().open()}>
        Open card sheet
      </Button>
    </PanelSection>
  );
}
