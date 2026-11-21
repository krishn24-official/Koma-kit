import { create } from 'zustand';
import type { CellRect } from '@/types';

export interface MediaCrop {
  index: number;
  itemId: string;
  rect: CellRect;
  bars: CellRect | null;
}

export type PanelId = 'layout' | 'canvas' | 'style' | 'elements';
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
  /** The download screen (format, size, file name). */
  downloadDialogOpen: boolean;
  /** Crop frame while cropping (fractions of the canvas); null when not cropping. */
  cropRect: CellRect | null;
  /** Logo/picture being cropped and its crop frame (fractions of the picture). */
  stickerCrop: { id: string; rect: CellRect } | null;
  /**
   * Picture/clip in a box being cropped: its crop frame (fractions of the media) and
   * the detected picture area inside black bars, once known.
   */
  mediaCrop: MediaCrop | null;

  setActivePanel: (id: PanelId) => void;
  setDownloadDialogOpen: (open: boolean) => void;
  setCropRect: (rect: CellRect | null) => void;
  setStickerCrop: (crop: { id: string; rect: CellRect } | null) => void;
  setMediaCrop: (crop: MediaCrop | null) => void;
  setVideoExport: (state: VideoExportProgress | null) => void;
  toggleMobilePanel: (id: PanelId) => void;
  closeMobilePanel: () => void;
  showToast: (message: string, tone?: ToastTone) => void;
  dismissToast: () => void;
}

let toastId = 0;

export const useUiStore = create<UiStore>()((set) => ({
  activePanel: 'layout',
  mobilePanelOpen: false,
  toast: null,
  videoExport: null,
  downloadDialogOpen: false,
  cropRect: null,
  stickerCrop: null,
  mediaCrop: null,

  setActivePanel: (activePanel) => set({ activePanel }),
  setDownloadDialogOpen: (downloadDialogOpen) => set({ downloadDialogOpen }),
  setCropRect: (cropRect) => set({ cropRect }),
  setStickerCrop: (stickerCrop) => set({ stickerCrop }),
  setMediaCrop: (mediaCrop) => set({ mediaCrop }),
  setVideoExport: (videoExport) => set({ videoExport }),

  toggleMobilePanel: (id) =>
    set((s) =>
      s.mobilePanelOpen && s.activePanel === id
        ? { mobilePanelOpen: false }
        : { activePanel: id, mobilePanelOpen: true },
    ),

  closeMobilePanel: () => set({ mobilePanelOpen: false }),

  showToast: (message, tone = 'info') => set({ toast: { id: ++toastId, message, tone } }),
  dismissToast: () => set({ toast: null }),
}));
