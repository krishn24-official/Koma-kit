import { create } from 'zustand';
import { DEFAULT_ASPECT_RATIO_ID } from '@/constants/aspectRatios';
import { createDefaultText, DEFAULT_EXPORT_OPTIONS, DEFAULT_STYLE } from '@/constants/editor';
import { DEFAULT_LAYOUT_ID, getLayout } from '@/constants/layouts';
import type {
  AspectRatioId,
  CanvasStyle,
  CellImage,
  ExportOptions,
  ImageTransform,
  Selection,
  TextOverlay,
} from '@/types';
import { revokeImage } from '@/utils/image';

export interface EditorState {
  layoutId: string;
  aspectRatioId: AspectRatioId;
  style: CanvasStyle;
  /**
   * Images keyed by cell index. Images in cells beyond the current layout are kept,
   * so switching back to a bigger layout restores them.
   */
  images: Record<number, CellImage>;
  texts: TextOverlay[];
  selection: Selection;
  /** Cell waiting for a second cell to swap with. */
  swapSource: number | null;
  exportOptions: ExportOptions;
}

export interface EditorActions {
  setLayout: (layoutId: string) => void;
  setAspectRatio: (id: AspectRatioId) => void;
  updateStyle: (patch: Partial<CanvasStyle>) => void;

  setCellImage: (index: number, image: CellImage) => void;
  /** Places images into empty visible cells in order. Returns how many were placed. */
  fillEmptyCells: (images: CellImage[]) => number;
  removeCellImage: (index: number) => void;
  clearImages: () => void;
  updateCellTransform: (index: number, transform: ImageTransform) => void;

  startSwap: (index: number) => void;
  cancelSwap: () => void;
  swapCells: (a: number, b: number) => void;

  select: (selection: Selection) => void;
  clearSelection: () => void;

  addText: (partial?: Partial<Omit<TextOverlay, 'id'>>) => string;
  updateText: (id: string, patch: Partial<Omit<TextOverlay, 'id'>>) => void;
  removeText: (id: string) => void;

  updateExportOptions: (patch: Partial<ExportOptions>) => void;
  resetProject: () => void;
}

export type EditorStore = EditorState & EditorActions;

const createInitialState = (): EditorState => ({
  layoutId: DEFAULT_LAYOUT_ID,
  aspectRatioId: DEFAULT_ASPECT_RATIO_ID,
  style: { ...DEFAULT_STYLE },
  images: {},
  texts: [],
  selection: null,
  swapSource: null,
  exportOptions: { ...DEFAULT_EXPORT_OPTIONS },
});

export const useEditorStore = create<EditorStore>()((set, get) => ({
  ...createInitialState(),

  setLayout: (layoutId) =>
    set((s) => {
      const cellCount = getLayout(layoutId).cells.length;
      const selectionOutOfRange = s.selection?.kind === 'cell' && s.selection.index >= cellCount;
      return {
        layoutId,
        swapSource: null,
        selection: selectionOutOfRange ? null : s.selection,
      };
    }),

  setAspectRatio: (aspectRatioId) => set({ aspectRatioId }),

  updateStyle: (patch) => set((s) => ({ style: { ...s.style, ...patch } })),

  setCellImage: (index, image) =>
    set((s) => {
      revokeImage(s.images[index]);
      return {
        images: { ...s.images, [index]: image },
        selection: { kind: 'cell', index },
      };
    }),

  fillEmptyCells: (newImages) => {
    const { images, layoutId } = get();
    const cellCount = getLayout(layoutId).cells.length;
    const next = { ...images };
    let placed = 0;

    for (let i = 0; i < cellCount && placed < newImages.length; i++) {
      if (!next[i]) {
        next[i] = newImages[placed]!;
        placed++;
      }
    }

    newImages.slice(placed).forEach(revokeImage);
    set({ images: next });
    return placed;
  },

  removeCellImage: (index) =>
    set((s) => {
      const { [index]: removed, ...rest } = s.images;
      revokeImage(removed);
      return { images: rest };
    }),

  clearImages: () =>
    set((s) => {
      Object.values(s.images).forEach(revokeImage);
      return { images: {}, selection: null, swapSource: null };
    }),

  updateCellTransform: (index, transform) =>
    set((s) => {
      const image = s.images[index];
      if (!image) return {};
      return { images: { ...s.images, [index]: { ...image, transform } } };
    }),

  startSwap: (index) => set({ swapSource: index }),
  cancelSwap: () => set({ swapSource: null }),

  swapCells: (a, b) =>
    set((s) => {
      const images = { ...s.images };
      const imageA = images[a];
      const imageB = images[b];
      delete images[a];
      delete images[b];
      if (imageA) images[b] = imageA;
      if (imageB) images[a] = imageB;
      return { images, swapSource: null, selection: { kind: 'cell', index: b } };
    }),

  select: (selection) => set({ selection }),
  clearSelection: () => set({ selection: null, swapSource: null }),

  addText: (partial) => {
    const text: TextOverlay = { ...createDefaultText(), ...partial };
    set((s) => ({ texts: [...s.texts, text], selection: { kind: 'text', id: text.id } }));
    return text.id;
  },

  updateText: (id, patch) =>
    set((s) => ({ texts: s.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

  removeText: (id) =>
    set((s) => ({
      texts: s.texts.filter((t) => t.id !== id),
      selection: s.selection?.kind === 'text' && s.selection.id === id ? null : s.selection,
    })),

  updateExportOptions: (patch) =>
    set((s) => ({ exportOptions: { ...s.exportOptions, ...patch } })),

  resetProject: () => {
    const { images, exportOptions } = get();
    Object.values(images).forEach(revokeImage);
    set({ ...createInitialState(), exportOptions });
  },
}));
