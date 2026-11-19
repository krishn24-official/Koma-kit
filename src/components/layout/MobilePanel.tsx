import { PanelContent } from '@/components/panels/PanelContent';
import { PanelTabs } from '@/components/panels/PanelTabs';
import { useUiStore } from '@/store/useUiStore';

/**
 * Bottom tab bar plus a collapsible settings panel on phones.
 * The panel takes space from the canvas instead of covering it, so changes stay visible.
 */
export function MobilePanel() {
  const activePanel = useUiStore((s) => s.activePanel);
  const open = useUiStore((s) => s.mobilePanelOpen);
  const togglePanel = useUiStore((s) => s.toggleMobilePanel);

  return (
    <div className="shrink-0 md:hidden">
      {open && (
        <div className="max-h-[45dvh] overflow-y-auto overscroll-contain border-t border-neutral-800 bg-neutral-900 p-4">
          <PanelContent id={activePanel} />
        </div>
      )}
      <PanelTabs variant="bottom" activeId={open ? activePanel : null} onSelect={togglePanel} />
    </div>
  );
}
