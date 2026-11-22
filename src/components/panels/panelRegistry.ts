import { BookMarked, Frame, LayoutGrid, Palette, Shapes, type LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';
import type { PanelId } from '@/store/useUiStore';
import { CanvasPanel } from './CanvasPanel';
import { LayoutPanel } from './LayoutPanel';
import { StylePanel } from './StylePanel';
import { ElementsPanel } from './ElementsPanel';
import { TemplatesPanel } from './TemplatesPanel';

export interface PanelDefinition {
  id: PanelId;
  label: string;
  icon: LucideIcon;
  component: ComponentType;
}

/** One list for both the desktop sidebar and the mobile tab bar. */
export const PANELS: PanelDefinition[] = [
  { id: 'layout', label: 'Layout', icon: LayoutGrid, component: LayoutPanel },
  { id: 'canvas', label: 'Canvas', icon: Frame, component: CanvasPanel },
  { id: 'style', label: 'Style', icon: Palette, component: StylePanel },
  { id: 'elements', label: 'Elements', icon: Shapes, component: ElementsPanel },
  { id: 'templates', label: 'Templates', icon: BookMarked, component: TemplatesPanel },
];
