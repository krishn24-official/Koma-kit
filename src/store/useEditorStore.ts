import { create } from 'zustand';
import { DEFAULT_CANVAS_SIZE, getExactScale } from '@/constants/canvasSizes';
import { createId } from '@/utils/id';
import {
  DEFAULT_EXPORT_OPTIONS,
  DEFAULT_STYLE,
  DEFAULT_TRANSFORM,
  EXPORT_SCALES,
} from '@/constants/editor';
import { DEFAULT_LAYOUT_ID, getPreset, MAX_CELLS } from '@/constants/layouts';
import {
  addLayer as addLayerToTree,
  addStrip,
  countCells,
  equalizeLayout as equalizeTree,
  removeCell,
  resizeDivider as resizeTreeDivider,
  setDividerTilt as setTreeDividerTilt,
  straightenLayout as straightenTree,
  resolveLayout,
} from '@/utils/layoutTree';
import { cropCanvas as cropCanvasContent } from '@/utils/cropCanvas';
import type {
  BackgroundImage,
  CanvasSize,
  CanvasStyle,
  CellMedia,
  CellRect,
  ExportOptions,
  ImageTransform,
  LayoutNode,
  Selection,
  BoxFade,
  PictureEffects,
  CanvasElement,
} from '@/types';
import { clamp } from '@/utils/math';
import { revokeMedia } from '@/utils/media';

/** Items in a cell closer than this (seconds) count as the same time slot. */
const SAME_TIME = 0.01;
/** A trimmed video keeps at least this much (seconds). */
const MIN_CLIP_LENGTH = 0.1;

export interface EditorState {
  /** The layout tree: how the canvas is split into boxes (see LayoutNode). */
  layoutRoot: LayoutNode;
  /** Preset the layout came from; null once boxes are added, removed or resized. */
  presetId: string | null;
  canvasSize: CanvasSize;
  style: CanvasStyle;
  /**
   * Media per cell index, sorted by start time. A cell shows the latest item that has
   * started. Cells beyond the current layout are kept, so switching back restores them.
   */
  cells: Record<number, CellMedia[]>;
  /** Box fades (color gradients over a box), by box number. */
  boxFades: Record<number, BoxFade>;
  /** Fade edges, glow, shadow and colors per box; like fades, they stay with the box. */
  boxEffects: Record<number, PictureEffects>;
  /** Text, stickers and badges placed freely on the canvas, bottom to top. */
  elements: CanvasElement[];
  selection: Selection;
  /** Cell waiting for a second cell to swap with. */
  swapSource: number | null;
  exportOptions: ExportOptions;
}

export interface EditorActions {
  /** Starts from a preset layout. Media stays in its box numbers. */
  setLayout: (presetId: string) => void;
  /** Adds a row (row stacks) or a column (everything else), keeping boxes equal. */
  addLayer: () => void;
  addRow: () => void;
  addColumn: () => void;
  /** Deletes a box and its media; later boxes move up one number. */
  removeBox: (index: number) => void;
  /** Drags a divider: `delta` is a fraction of the split's length. */
  resizeDivider: (path: number[], boundary: number, delta: number) => void;
  equalizeLayout: () => void;
  /** Slants a divider (0 = straight); limited so it never crosses its neighbours. */
  setDividerTilt: (path: number[], boundary: number, tilt: number) => void;
  /** Makes every divider straight again. */
  straightenLayout: () => void;
  /**
   * Changes the canvas shape. Exact sizes (platforms, typed) also set the export to
   * that exact resolution.
   */
  setCanvasSize: (size: CanvasSize) => void;
  /** Crops the canvas to `rect` (fractions of the canvas), keeping the content in place. */
  cropCanvas: (rect: CellRect) => void;
  /** Sets or clears the background picture (frees the old one). */
  setBackgroundImage: (image: BackgroundImage | null) => void;
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
  /** Seconds a video waits on its first frame before playing (0 = plays right away). */
  setItemDelay: (index: number, itemId: string, delay: number) => void;
  /** Crops a box's picture/clip; it is then re-fitted to fill its box. */
  setItemCrop: (index: number, itemId: string, crop: CellRect) => void;
  /** Leaves a video's sound out (true) or puts it back (false). */
  setItemMuted: (index: number, itemId: string, muted: boolean) => void;
  /** Repeats a video until the next item / the end (true), or plays it once (false). */
  setItemLoop: (index: number, itemId: string, loop: boolean) => void;

  startSwap: (index: number) => void;
  cancelSwap: () => void;
  swapCells: (a: number, b: number) => void;

  select: (selection: Selection) => void;
  clearSelection: () => void;

  /** Adds an element on top and selects it. */
  addElement: (element: CanvasElement) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>) => void;
  removeElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  /** Moves an element one step up (+1) or down (-1) in the stacking order. */
  moveElement: (id: string, step: 1 | -1) => void;
  /** Brings an element in front of all others, or sends it behind all others. */
  moveElementToEnd: (id: string, end: 'front' | 'back') => void;
  /** Replaces all elements (frees pictures of removed ones). */
  replaceElements: (elements: CanvasElement[]) => void;
  /** Adds several elements at once and selects the last one. */
  addElements: (elements: CanvasElement[]) => void;
  setBoxFade: (index: number, fade: BoxFade | null) => void;
  setBoxEffects: (index: number, effects: PictureEffects | null) => void;
  /** Replaces the whole design with a starter template. */
  loadTemplate: (design: TemplateDesign) => void;

  updateExportOptions: (patch: Partial<ExportOptions>) => void;
  resetProject: () => void;
}

export type EditorStore = EditorState & EditorActions;

/** What a starter template sets; anything left out starts from the defaults. */
export type TemplateDesign = Partial<
  Pick<
    EditorState,
    | 'layoutRoot'
    | 'presetId'
    | 'canvasSize'
    | 'style'
    | 'boxFades'
    | 'boxEffects'
    | 'elements'
    | 'cells'
  >
>;

/** Frees every object URL the design holds (media, stickers, background). */
function freeAllPictures(s: EditorState): void {
  allItems(s.cells).forEach(revokeMedia);
  if (s.style.backgroundImage) URL.revokeObjectURL(s.style.backgroundImage.src);
  s.elements.forEach((el) => {
    if (el.type === 'sticker' && el.src) URL.revokeObjectURL(el.src);
  });
}

const createInitialState = (): EditorState => ({
  layoutRoot: getPreset(DEFAULT_LAYOUT_ID).root,
  presetId: DEFAULT_LAYOUT_ID,
  canvasSize: DEFAULT_CANVAS_SIZE,
  style: { ...DEFAULT_STYLE },
  cells: {},
  boxFades: {},
  boxEffects: {},
  elements: [],
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
 * State update for a layout that gained boxes. New boxes always start empty: any media
 * left over at those numbers from an earlier, bigger layout is dropped.
 */
function growLayout(s: EditorState, layoutRoot: LayoutNode): Partial<EditorState> {
  const before = countCells(s.layoutRoot);
  const after = countCells(layoutRoot);
  if (after > MAX_CELLS) return {};

  const cells = { ...s.cells };
  const boxFades = { ...s.boxFades };
  const boxEffects = { ...s.boxEffects };
  for (let i = before; i < after; i++) {
    (cells[i] ?? []).forEach(revokeMedia);
    delete cells[i];
    delete boxFades[i];
    delete boxEffects[i];
  }
  return {
    layoutRoot,
    presetId: null,
    cells,
    boxFades,
    boxEffects,
    swapSource: null,
  };
}

/**
 * The new media for "Replace": it keeps the old item's start time. Swapping a video for
 * another video (e.g. the same edit in another language) also keeps how it's shown and
 * played: zoom and position, crop, delay, loop, sound on/off, and the trim when it fits
 * the new video's length.
 */
function keepSettings(old: CellMedia, media: CellMedia): CellMedia {
  if (old.kind !== 'video' || media.kind !== 'video') return { ...media, start: old.start };
  const trimEnd = Math.min(old.trimEnd, media.duration);
  const keepTrim = trimEnd - old.trimStart >= MIN_CLIP_LENGTH;
  return {
    ...media,
    start: old.start,
    delay: old.delay,
    loop: old.loop,
    muted: old.muted,
    crop: old.crop,
    transform: old.transform,
    trimStart: keepTrim ? old.trimStart : 0,
    trimEnd: keepTrim ? trimEnd : media.duration,
  };
}

export const useEditorStore = create<EditorStore>()((set, get) => ({
  ...createInitialState(),

  setLayout: (presetId) =>
    set((s) => {
      const layoutRoot = getPreset(presetId).root;
      const cellCount = countCells(layoutRoot);
      const selectionOutOfRange = s.selection?.kind === 'cell' && s.selection.index >= cellCount;
      return {
        layoutRoot,
        presetId,
        swapSource: null,
        selection: selectionOutOfRange ? null : s.selection,
      };
    }),

  addLayer: () => set((s) => growLayout(s, addLayerToTree(s.layoutRoot))),
  addRow: () => set((s) => growLayout(s, addStrip(s.layoutRoot, 'vertical'))),
  addColumn: () => set((s) => growLayout(s, addStrip(s.layoutRoot, 'horizontal'))),

  removeBox: (index) =>
    set((s) => {
      const layoutRoot = removeCell(s.layoutRoot, index);
      if (!layoutRoot) return {};

      // Drop this box's media and move every later box's media down one number.
      const cells: Record<number, CellMedia[]> = {};
      for (const [key, items] of Object.entries(s.cells)) {
        const i = Number(key);
        if (i === index) items.forEach(revokeMedia);
        else cells[i > index ? i - 1 : i] = items;
      }

      const boxFades: Record<number, BoxFade> = {};
      for (const [key, fade] of Object.entries(s.boxFades)) {
        const i = Number(key);
        if (i !== index) boxFades[i > index ? i - 1 : i] = fade;
      }

      const boxEffects: Record<number, PictureEffects> = {};
      for (const [key, effects] of Object.entries(s.boxEffects)) {
        const i = Number(key);
        if (i !== index) boxEffects[i > index ? i - 1 : i] = effects;
      }

      const remaining = countCells(layoutRoot);
      return {
        layoutRoot,
        presetId: null,
        cells,
        boxFades,
        boxEffects,
        swapSource: null,
        selection: remaining > 0 ? { kind: 'cell', index: Math.min(index, remaining - 1) } : null,
      };
    }),

  resizeDivider: (path, boundary, delta) =>
    set((s) => ({
      layoutRoot: resizeTreeDivider(s.layoutRoot, path, boundary, delta),
      presetId: null,
    })),

  equalizeLayout: () => set((s) => ({ layoutRoot: equalizeTree(s.layoutRoot), presetId: null })),

  setDividerTilt: (path, boundary, tilt) =>
    set((s) => ({
      layoutRoot: setTreeDividerTilt(s.layoutRoot, path, boundary, tilt),
      presetId: null,
    })),

  straightenLayout: () =>
    set((s) => ({ layoutRoot: straightenTree(s.layoutRoot), presetId: null })),

  setCanvasSize: (canvasSize) =>
    set((s) => {
      const standard = EXPORT_SCALES.some((option) => option.value === s.exportOptions.scale);
      const scale = canvasSize.exact
        ? getExactScale(canvasSize)
        : standard
          ? s.exportOptions.scale
          : DEFAULT_EXPORT_OPTIONS.scale;
      return { canvasSize, exportOptions: { ...s.exportOptions, scale } };
    }),

  cropCanvas: (rect) =>
    set((s) => ({
      ...cropCanvasContent(
        {
          canvasSize: s.canvasSize,
          style: s.style,
          layoutCells: resolveLayout(s.layoutRoot).cells,
          cells: s.cells,
          elements: s.elements,
        },
        rect,
      ),
    })),

  setBackgroundImage: (image) =>
    set((s) => {
      const old = s.style.backgroundImage;
      if (old && old.src !== image?.src) URL.revokeObjectURL(old.src);
      return {
        style: {
          ...s.style,
          backgroundImage: image,
          backgroundType: image ? 'image' : s.style.backgroundType,
        },
      };
    }),

  updateStyle: (patch) => set((s) => ({ style: { ...s.style, ...patch } })),

  setCellMedia: (index, media) =>
    set((s) => {
      (s.cells[index] ?? []).forEach(revokeMedia);
      const cells = withItems(s.cells, index, [{ ...media, start: 0 }]);
      return {
        cells,
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
        items.map((item) => (item.id === itemId ? keepSettings(old, media) : item)),
      );
      return { cells };
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
        selection: { kind: 'cell', index },
      };
    }),

  fillEmptyCells: (newMedia) => {
    const { cells, layoutRoot } = get();
    const cellCount = countCells(layoutRoot);
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
      return { cells };
    }),

  clearMedia: () =>
    set((s) => {
      allItems(s.cells).forEach(revokeMedia);
      return { cells: {}, selection: null, swapSource: null };
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

  setItemDelay: (index, itemId, delay) =>
    set((s) => {
      const items = s.cells[index];
      if (!items) return {};
      return {
        cells: withItems(
          s.cells,
          index,
          items.map((item) =>
            item.id === itemId && item.kind === 'video'
              ? { ...item, delay: Math.max(0, delay) }
              : item,
          ),
        ),
      };
    }),

  setItemCrop: (index, itemId, crop) =>
    set((s) => {
      const items = s.cells[index];
      if (!items) return {};
      return {
        cells: withItems(
          s.cells,
          index,
          items.map((item) =>
            item.id === itemId ? { ...item, crop, transform: { ...DEFAULT_TRANSFORM } } : item,
          ),
        ),
      };
    }),

  setItemLoop: (index, itemId, loop) =>
    set((s) => {
      const items = s.cells[index];
      if (!items) return {};
      return {
        cells: withItems(
          s.cells,
          index,
          items.map((item) =>
            item.id === itemId && item.kind === 'video' ? { ...item, loop } : item,
          ),
        ),
      };
    }),

  setItemMuted: (index, itemId, muted) =>
    set((s) => {
      const items = s.cells[index];
      if (!items) return {};
      return {
        cells: withItems(
          s.cells,
          index,
          items.map((item) => (item.id === itemId ? { ...item, muted } : item)),
        ),
      };
    }),

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
      // Fades stay with their boxes: they belong to the position, not the picture.
      return { cells, swapSource: null, selection: { kind: 'cell', index: b } };
    }),

  select: (selection) => set({ selection }),
  clearSelection: () => set({ selection: null, swapSource: null }),

  addElement: (element) =>
    set((s) => ({
      elements: [...s.elements, element],
      selection: { kind: 'element', id: element.id },
    })),

  updateElement: (id, patch) =>
    set((s) => ({
      elements: s.elements.map((el) => {
        if (el.id !== id) return el;
        // Replacing a sticker's picture frees the old one.
        if (el.type === 'sticker' && 'src' in patch && el.src && patch.src !== el.src) {
          URL.revokeObjectURL(el.src);
        }
        return { ...el, ...patch } as CanvasElement;
      }),
    })),

  removeElement: (id) =>
    set((s) => {
      const el = s.elements.find((e) => e.id === id);
      if (el?.type === 'sticker' && el.src) URL.revokeObjectURL(el.src);
      return {
        elements: s.elements.filter((e) => e.id !== id),
        selection: s.selection?.kind === 'element' && s.selection.id === id ? null : s.selection,
      };
    }),

  duplicateElement: (id) =>
    set((s) => {
      const el = s.elements.find((e) => e.id === id);
      if (!el) return {};
      // A copied sticker gets its own object URL, so deleting one keeps the other.
      const src = el.type === 'sticker' && el.file ? URL.createObjectURL(el.file) : null;
      const copy = {
        ...el,
        ...(el.type === 'sticker' ? { src: src ?? el.src } : {}),
        id: createId(),
        x: Math.min(1, el.x + 0.03),
        y: Math.min(1, el.y + 0.03),
      } as CanvasElement;
      return { elements: [...s.elements, copy], selection: { kind: 'element', id: copy.id } };
    }),

  moveElement: (id, step) =>
    set((s) => {
      const from = s.elements.findIndex((e) => e.id === id);
      const to = from + step;
      if (from < 0 || to < 0 || to >= s.elements.length) return {};
      const elements = [...s.elements];
      [elements[from], elements[to]] = [elements[to]!, elements[from]!];
      return { elements };
    }),

  moveElementToEnd: (id, end) =>
    set((s) => {
      const el = s.elements.find((e) => e.id === id);
      if (!el) return {};
      const rest = s.elements.filter((e) => e.id !== id);
      return { elements: end === 'front' ? [...rest, el] : [el, ...rest] };
    }),

  replaceElements: (elements) =>
    set((s) => {
      const kept = new Set(elements.map((el) => el.id));
      s.elements.forEach((el) => {
        if (!kept.has(el.id) && el.type === 'sticker' && el.src) URL.revokeObjectURL(el.src);
      });
      const selection =
        s.selection?.kind === 'element' && !kept.has(s.selection.id) ? null : s.selection;
      return { elements, selection };
    }),

  addElements: (added) =>
    set((s) => {
      const last = added[added.length - 1];
      if (!last) return {};
      return {
        elements: [...s.elements, ...added],
        selection: { kind: 'element', id: last.id },
      };
    }),

  setBoxEffects: (index, effects) =>
    set((s) => {
      const boxEffects = { ...s.boxEffects };
      if (effects) boxEffects[index] = effects;
      else delete boxEffects[index];
      return { boxEffects };
    }),

  setBoxFade: (index, fade) =>
    set((s) => {
      const boxFades = { ...s.boxFades };
      if (fade) boxFades[index] = fade;
      else delete boxFades[index];
      return { boxFades };
    }),

  loadTemplate: (design) => {
    freeAllPictures(get());
    const canvasSize = design.canvasSize ?? DEFAULT_CANVAS_SIZE;
    set({
      ...createInitialState(),
      ...design,
      exportOptions: {
        ...get().exportOptions,
        scale: canvasSize.exact ? getExactScale(canvasSize) : DEFAULT_EXPORT_OPTIONS.scale,
      },
    });
  },

  updateExportOptions: (patch) => set((s) => ({ exportOptions: { ...s.exportOptions, ...patch } })),

  resetProject: () => {
    const { exportOptions } = get();
    freeAllPictures(get());
    // Keep the user's export preferences, except an exact size tied to the old canvas.
    set({
      ...createInitialState(),
      exportOptions: { ...exportOptions, scale: DEFAULT_EXPORT_OPTIONS.scale },
    });
  },
}));
