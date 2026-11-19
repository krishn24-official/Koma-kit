import { create } from 'zustand';
import { DEFAULT_ASPECT_RATIO_ID } from '@/constants/aspectRatios';
import { createDefaultText, DEFAULT_EXPORT_OPTIONS, DEFAULT_STYLE } from '@/constants/editor';
import { DEFAULT_LAYOUT_ID, getLayout } from '@/constants/layouts';
import type {
  AspectRatioId,
  CanvasStyle,
  CellMedia,
  ExportOptions,
  ImageTransform,
  Selection,
  TextOverlay,
} from '@/types';
import { clamp } from '@/utils/math';
import { revokeMedia } from '@/utils/media';

/** Items in a cell closer than this (seconds) count as the same time slot. */
const SAME_TIME = 0.01;
/** A trimmed video keeps at least this much (seconds). */
const MIN_CLIP_LENGTH = 0.1;

export interface EditorState {
  layoutId: string;
  aspectRatioId: AspectRatioId;
  style: CanvasStyle;
  /**
   * Media per cell index, sorted by start time. A cell shows the latest item that has
   * started. Cells beyond the current layout are kept, so switching back restores them.
   */
  cells: Record<number, CellMedia[]>;
  /** Video whose original audio is played in the preview and saved in the MP4. */
  audioSourceId: string | null;
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

  /** Replaces everything in a cell with one item shown from the start. */
  setCellMedia: (index: number, media: CellMedia) => void;
  /** Swaps one item for new media, keeping its start time. */
  replaceItem: (index: number, itemId: string, media: CellMedia) => void;
  /** Schedules media to appear in a cell at `start` seconds. */
  addItemAt: (index: number, media: CellMedia, start: number) => void;
  /** Places media into empty visible cells in order. Returns how many were placed. */
  fillEmptyCells: (media: CellMedia[]) => number;
  removeItem: (index: number, itemId: string) => void;
  clearMedia: () => void;
  updateItemTransform: (index: number, itemId: string, transform: ImageTransform) => void;
  setItemStart: (index: number, itemId: string, start: number) => void;
  /** Sets which part of a video plays (seconds into the file). Omitted ends stay put. */
  setItemTrim: (
    index: number,
    itemId: string,
    trim: { trimStart?: number; trimEnd?: number },
  ) => void;
  setAudioSource: (itemId: string | null) => void;

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
  cells: {},
  audioSourceId: null,
  texts: [],
  selection: null,
  swapSource: null,
  exportOptions: { ...DEFAULT_EXPORT_OPTIONS },
});

const sortByStart = (items: CellMedia[]): CellMedia[] =>
  [...items].sort((a, b) => a.start - b.start);

const allItems = (cells: Record<number, CellMedia[]>): CellMedia[] =>
  Object.keys(cells)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((key) => cells[key] ?? []);

/** Returns a copy of `cells` with `items` stored at `index` (removing the key if empty). */
function withItems(
  cells: Record<number, CellMedia[]>,
  index: number,
  items: CellMedia[],
): Record<number, CellMedia[]> {
  const next = { ...cells };
  if (items.length > 0) next[index] = items;
  else delete next[index];
  return next;
}

/**
 * Keeps the audio source valid:
 * - the current source stays if it still exists;
 * - if it was removed, the first remaining video takes over;
 * - if there was none, the first newly added video becomes the source.
 *   (When the user mutes all audio, it stays muted until they add another video.)
 */
function nextAudioSource(
  current: string | null,
  cells: Record<number, CellMedia[]>,
  added: CellMedia[] = [],
): string | null {
  const items = allItems(cells);
  if (current && items.some((item) => item.id === current)) return current;
  const firstVideo = (list: CellMedia[]) => list.find((item) => item.kind === 'video')?.id ?? null;
  return current ? firstVideo(items) : firstVideo(added);
}

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

  setCellMedia: (index, media) =>
    set((s) => {
      (s.cells[index] ?? []).forEach(revokeMedia);
      const cells = withItems(s.cells, index, [{ ...media, start: 0 }]);
      return {
        cells,
        audioSourceId: nextAudioSource(s.audioSourceId, cells, [media]),
        selection: { kind: 'cell', index },
      };
    }),

  replaceItem: (index, itemId, media) =>
    set((s) => {
      const items = s.cells[index] ?? [];
      const old = items.find((item) => item.id === itemId);
      if (!old) return {};
      revokeMedia(old);
      const cells = withItems(
        s.cells,
        index,
        items.map((item) => (item.id === itemId ? { ...media, start: old.start } : item)),
      );
      return { cells, audioSourceId: nextAudioSource(s.audioSourceId, cells, [media]) };
    }),

  addItemAt: (index, media, start) =>
    set((s) => {
      const time = Math.max(0, start);
      const items = s.cells[index] ?? [];
      // Adding at a time that is already used replaces that item.
      const clash = items.find((item) => Math.abs(item.start - time) < SAME_TIME);
      revokeMedia(clash);
      const rest = items.filter((item) => item !== clash);
      const cells = withItems(s.cells, index, sortByStart([...rest, { ...media, start: time }]));
      return {
        cells,
        audioSourceId: nextAudioSource(s.audioSourceId, cells, [media]),
        selection: { kind: 'cell', index },
      };
    }),

  fillEmptyCells: (newMedia) => {
    const { cells, layoutId, audioSourceId } = get();
    const cellCount = getLayout(layoutId).cells.length;
    let next = cells;
    let placed = 0;

    for (let i = 0; i < cellCount && placed < newMedia.length; i++) {
      if (!next[i]?.length) {
        next = withItems(next, i, [{ ...newMedia[placed]!, start: 0 }]);
        placed++;
      }
    }

    newMedia.slice(placed).forEach(revokeMedia);
    set({
      cells: next,
      audioSourceId: nextAudioSource(audioSourceId, next, newMedia.slice(0, placed)),
    });
    return placed;
  },

  removeItem: (index, itemId) =>
    set((s) => {
      const items = s.cells[index] ?? [];
      revokeMedia(items.find((item) => item.id === itemId));
      const cells = withItems(
        s.cells,
        index,
        items.filter((item) => item.id !== itemId),
      );
      return { cells, audioSourceId: nextAudioSource(s.audioSourceId, cells) };
    }),

  clearMedia: () =>
    set((s) => {
      allItems(s.cells).forEach(revokeMedia);
      return { cells: {}, audioSourceId: null, selection: null, swapSource: null };
    }),

  updateItemTransform: (index, itemId, transform) =>
    set((s) => {
      const items = s.cells[index];
      if (!items) return {};
      return {
        cells: withItems(
          s.cells,
          index,
          items.map((item) => (item.id === itemId ? { ...item, transform } : item)),
        ),
      };
    }),

  setItemStart: (index, itemId, start) =>
    set((s) => {
      const items = s.cells[index];
      if (!items) return {};
      const time = Math.max(0, start);
      return {
        cells: withItems(
          s.cells,
          index,
          sortByStart(items.map((item) => (item.id === itemId ? { ...item, start: time } : item))),
        ),
      };
    }),

  setItemTrim: (index, itemId, trim) =>
    set((s) => {
      const items = s.cells[index];
      if (!items) return {};
      return {
        cells: withItems(
          s.cells,
          index,
          items.map((item) => {
            if (item.id !== itemId || item.kind !== 'video') return item;
            const end = clamp(trim.trimEnd ?? item.trimEnd, MIN_CLIP_LENGTH, item.duration);
            const begin = clamp(trim.trimStart ?? item.trimStart, 0, end - MIN_CLIP_LENGTH);
            return { ...item, trimStart: begin, trimEnd: end };
          }),
        ),
      };
    }),

  setAudioSource: (audioSourceId) => set({ audioSourceId }),

  startSwap: (index) => set({ swapSource: index }),
  cancelSwap: () => set({ swapSource: null }),

  swapCells: (a, b) =>
    set((s) => {
      const cells = { ...s.cells };
      const itemsA = cells[a];
      const itemsB = cells[b];
      delete cells[a];
      delete cells[b];
      if (itemsA) cells[b] = itemsA;
      if (itemsB) cells[a] = itemsB;
      return { cells, swapSource: null, selection: { kind: 'cell', index: b } };
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
    const { cells, exportOptions } = get();
    allItems(cells).forEach(revokeMedia);
    set({ ...createInitialState(), exportOptions });
  },
}));
