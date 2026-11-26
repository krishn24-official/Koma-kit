import { create } from 'zustand';
import type { CanvasElement, CellMedia, CellRect } from '@/types';

export interface MediaCrop {
  index: number;
  itemId: string;
  rect: CellRect;
  bars: CellRect | null;
}

/** What a drawn outline applies to: a picture/frame on the canvas, or a box's picture. */
export type DrawTarget =
  { kind: 'element'; id: string } | { kind: 'cell'; index: number; itemId: string };

export type PanelId = 'layout' | 'canvas' | 'style' | 'elements' | 'templates';
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
  /**
   * Drawing an outline: corners so far (fractions of the canvas), and what it's for
   * (null = a new frame; a frame to reshape; a picture to cut out).
   */
  frameDraw: {
    points: Array<[number, number]>;
    target: DrawTarget | null;
    /** Earlier outlines, for Undo (each corner or trace is one step). */
    history: Array<Array<[number, number]>>;
  } | null;
  /**
   * One-step undo for the last cut / extraction / drawn frame: the design before and
   * right after it. Only offered while nothing else has changed since.
   */
  drawUndo: {
    before: { elements: CanvasElement[]; cells: Record<number, CellMedia[]> };
    after: { elements: CanvasElement[]; cells: Record<number, CellMedia[]> };
  } | null;

  setActivePanel: (id: PanelId) => void;
  setDownloadDialogOpen: (open: boolean) => void;
  setCropRect: (rect: CellRect | null) => void;
  setStickerCrop: (crop: { id: string; rect: CellRect } | null) => void;
  setMediaCrop: (crop: MediaCrop | null) => void;
  setFrameDraw: (draw: UiStore['frameDraw']) => void;
  setDrawUndo: (undo: UiStore['drawUndo']) => void;
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
  frameDraw: null,
  drawUndo: null,

  setActivePanel: (activePanel) => set({ activePanel }),
  setDownloadDialogOpen: (downloadDialogOpen) => set({ downloadDialogOpen }),
  setCropRect: (cropRect) => set({ cropRect }),
  setStickerCrop: (stickerCrop) => set({ stickerCrop }),
  setMediaCrop: (mediaCrop) => set({ mediaCrop }),
  setFrameDraw: (frameDraw) => set({ frameDraw }),
  setDrawUndo: (drawUndo) => set({ drawUndo }),
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
