import { Download, LayoutGrid, Palette, Type, type LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';
import type { PanelId } from '@/store/useUiStore';
import { ExportPanel } from './ExportPanel';
import { LayoutPanel } from './LayoutPanel';
import { StylePanel } from './StylePanel';
import { TextPanel } from './TextPanel';

export interface PanelDefinition {
  id: PanelId;
  label: string;
  icon: LucideIcon;
  component: ComponentType;
}

/** One list for both the desktop sidebar and the mobile tab bar. */
export const PANELS: PanelDefinition[] = [
  { id: 'layout', label: 'Layout', icon: LayoutGrid, component: LayoutPanel },
  { id: 'style', label: 'Style', icon: Palette, component: StylePanel },
  { id: 'text', label: 'Text', icon: Type, component: TextPanel },
  { id: 'export', label: 'Export', icon: Download, component: ExportPanel },
];
