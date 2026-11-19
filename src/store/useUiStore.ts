import { create } from 'zustand';

export type PanelId = 'layout' | 'style' | 'text' | 'export';
export type ToastTone = 'info' | 'success' | 'error';

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface UiStore {
  activePanel: PanelId;
  /** Whether the settings panel is expanded on small screens. */
  mobilePanelOpen: boolean;
  toast: Toast | null;

  setActivePanel: (id: PanelId) => void;
  toggleMobilePanel: (id: PanelId) => void;
  showToast: (message: string, tone?: ToastTone) => void;
  dismissToast: () => void;
}

let toastId = 0;

export const useUiStore = create<UiStore>()((set) => ({
  activePanel: 'layout',
  mobilePanelOpen: false,
  toast: null,

  setActivePanel: (activePanel) => set({ activePanel }),

  toggleMobilePanel: (id) =>
    set((s) =>
      s.mobilePanelOpen && s.activePanel === id
        ? { mobilePanelOpen: false }
        : { activePanel: id, mobilePanelOpen: true },
    ),

  showToast: (message, tone = 'info') => set({ toast: { id: ++toastId, message, tone } }),
  dismissToast: () => set({ toast: null }),
}));
