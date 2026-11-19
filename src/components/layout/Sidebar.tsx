import { PanelContent } from '@/components/panels/PanelContent';
import { PanelTabs } from '@/components/panels/PanelTabs';
import { useUiStore } from '@/store/useUiStore';

/** Settings sidebar on tablet and desktop. */
export function Sidebar() {
  const activePanel = useUiStore((s) => s.activePanel);
  const setActivePanel = useUiStore((s) => s.setActivePanel);

  return (
    <aside className="hidden w-80 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900/40 md:flex xl:w-96">
      <PanelTabs variant="sidebar" activeId={activePanel} onSelect={setActivePanel} />
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <PanelContent id={activePanel} />
      </div>
    </aside>
  );
}
