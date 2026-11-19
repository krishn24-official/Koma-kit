import { create } from 'zustand';

export type PanelId = 'layout' | 'style' | 'text' | 'export';
export type ToastTone = 'info' | 'success' | 'error';

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

export interface VideoExportProgress {
  /** 0–1 */
  progress: number;
  cancel: () => void;
}

interface UiStore {
  activePanel: PanelId;
  /** Whether the settings panel is expanded on small screens. */
  mobilePanelOpen: boolean;
  toast: Toast | null;
  /** Set while an MP4 is being created. */
  videoExport: VideoExportProgress | null;

  setActivePanel: (id: PanelId) => void;
  setVideoExport: (state: VideoExportProgress | null) => void;
  toggleMobilePanel: (id: PanelId) => void;
  showToast: (message: string, tone?: ToastTone) => void;
  dismissToast: () => void;
}

let toastId = 0;

export const useUiStore = create<UiStore>()((set) => ({
  activePanel: 'layout',
  mobilePanelOpen: false,
  toast: null,
  videoExport: null,

  setActivePanel: (activePanel) => set({ activePanel }),
  setVideoExport: (videoExport) => set({ videoExport }),

  toggleMobilePanel: (id) =>
    set((s) =>
      s.mobilePanelOpen && s.activePanel === id
        ? { mobilePanelOpen: false }
        : { activePanel: id, mobilePanelOpen: true },
    ),

  showToast: (message, tone = 'info') => set({ toast: { id: ++toastId, message, tone } }),
  dismissToast: () => set({ toast: null }),
}));
