import type { PanelId } from '@/store/useUiStore';
import { PANELS } from './panelRegistry';

export function PanelContent({ id }: { id: PanelId }) {
  const panel = PANELS.find((p) => p.id === id);
  if (!panel) return null;
  const Component = panel.component;
  return <Component />;
}
