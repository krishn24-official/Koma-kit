import { useEffect } from 'react';
import { useMosaicStore } from '@/store/useMosaicStore';
import { useSheetStore } from '@/store/useSheetStore';
import { useUiStore, type PanelId } from '@/store/useUiStore';

/** `?open=…` values that open a panel (on phones, the panel is opened too). */
const PANELS: Record<string, PanelId> = {
  layout: 'layout',
  collage: 'layout',
  canvas: 'canvas',
  style: 'style',
  elements: 'elements',
  templates: 'templates',
};

/**
 * Links like koma-kit.vercel.app/?open=mosaic open that tool straight away (used by the
 * search landing pages). The parameter is removed from the address afterwards, so a
 * reload or a shared link shows the plain editor.
 */
export function useDeepLink(): void {
  useEffect(() => {
    const url = new URL(window.location.href);
    const open = url.searchParams.get('open')?.toLowerCase();
    if (!open) return;

    if (open === 'mosaic') void useMosaicStore.getState().open();
    else if (open === 'sheet') void useSheetStore.getState().open();
    else {
      const panel = PANELS[open];
      if (panel) useUiStore.setState({ activePanel: panel, mobilePanelOpen: true });
    }

    url.searchParams.delete('open');
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
  }, []);
}
