import { useCallback } from 'react';
import { toDesignSize } from '@/constants/canvasSizes';
import { getTemplateSnapshot } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUiStore, type DrawTarget } from '@/store/useUiStore';
import { cutOutCellPicture, cutOutSticker, stickerContains } from '@/utils/cutout';
import { createId } from '@/utils/id';
import type { Size, StickerElement } from '@/types';
import { getCellShapes } from '@/utils/layoutMath';
import { createFrame } from '@/utils/stickerShape';
import { getActiveItem } from '@/utils/timeline';

/** Corners closer than this (canvas pixels) to the first one close the shape. */
export const CLOSE_DISTANCE = 18;

/**
 * Drawing an outline on the canvas (tap corners, or trace with a finger), then:
 *  - no target: it becomes a new empty frame;
 *  - an empty frame: it gets that shape;
 *  - a picture (on the canvas or in a box): it's cut out — the part inside stays where
 *    it is, the rest is removed.
 */
export function useFrameDraw() {
  const start = useCallback((target: DrawTarget | null = null) => {
    const ui = useUiStore.getState();
    ui.setCropRect(null); // one mode at a time
    ui.setStickerCrop(null);
    ui.setMediaCrop(null);
    ui.closeMobilePanel();
    useEditorStore.getState().clearSelection();
    ui.setFrameDraw({ points: [], target, history: [] });
  }, []);

  const addPoint = useCallback((x: number, y: number) => {
    const draw = useUiStore.getState().frameDraw;
    if (!draw) return;
    useUiStore.getState().setFrameDraw({
      ...draw,
      points: [...draw.points, [x, y]],
      history: [...draw.history, draw.points],
    });
  }, []);

  /** A traced outline: replaces the corners (one Undo step brings them back). */
  const setTrace = useCallback((points: Array<[number, number]>) => {
    const draw = useUiStore.getState().frameDraw;
    if (!draw) return;
    useUiStore.getState().setFrameDraw({
      ...draw,
      points,
      history: [...draw.history, draw.points],
    });
  }, []);

  /** Removes the last corner or the last trace. */
  const undo = useCallback(() => {
    const draw = useUiStore.getState().frameDraw;
    if (!draw || draw.history.length === 0) return;
    useUiStore.getState().setFrameDraw({
      ...draw,
      points: draw.history[draw.history.length - 1]!,
      history: draw.history.slice(0, -1),
    });
  }, []);

  const cancel = useCallback(() => useUiStore.getState().setFrameDraw(null), []);

  const finish = useCallback(() => {
    const ui = useUiStore.getState();
    const draw = ui.frameDraw;
    if (!draw || draw.points.length < 3) return;
    const store = useEditorStore.getState();
    const design = toDesignSize(store.canvasSize);
    const tooSmall = () => ui.showToast('That outline is too small. Draw it a bit bigger', 'info');
    // For the one-step Undo afterwards.
    const before = { elements: store.elements, cells: store.cells };
    const done = (selectId: string) => {
      const now = useEditorStore.getState();
      ui.setDrawUndo({ before, after: { elements: now.elements, cells: now.cells } });
      ui.setFrameDraw(null);
      store.select({ kind: 'element', id: selectId });
      ui.setActivePanel('elements');
    };

    const { target } = draw;

    // A box's picture → a cut-out piece in the same place; the box is emptied.
    if (target?.kind === 'cell') {
      const snapshot = getTemplateSnapshot();
      const cells = getCellShapes(snapshot.layout, design, store.style, 1);
      const item = store.cells[target.index]?.find((it) => it.id === target.itemId);
      const cell = cells[target.index];
      const piece = item && cell ? cutOutCellPicture(item, cell, draw.points, design) : null;
      if (!piece) return tooSmall();
      store.addElement(piece);
      store.removeItem(target.index, target.itemId);
      ui.showToast('Cut out. The rest of the picture was removed', 'success');
      return done(piece.id);
    }

    const element =
      target?.kind === 'element' ? store.elements.find((e) => e.id === target.id) : undefined;

    // A picture on the canvas → cut it down in place.
    if (element?.type === 'sticker' && element.src) {
      const change = cutOutSticker(element, draw.points, design);
      if (!change) return tooSmall();
      store.updateElement(element.id, change);
      return done(element.id);
    }

    // A new outline drawn on top of a picture: that part comes out as its own piece, in
    // the same place; the picture itself stays (Cut out is for keeping only the part).
    if (!target) {
      const piece = extractUnder(draw.points, design);
      if (piece) {
        store.addElement(piece);
        ui.showToast('Copied that part out of the picture. The original stays', 'success');
        return done(piece.id);
      }
    }

    // Otherwise the outline is a frame shape: a new frame, or an empty frame reshaped.
    const xs = draw.points.map(([x]) => x);
    const ys = draw.points.map(([, y]) => y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const spanX = Math.max(...xs) - minX;
    const spanY = Math.max(...ys) - minY;
    const width = spanX * design.width;
    const height = spanY * design.height;
    if (width < 20 || height < 20) return tooSmall();
    const outline = {
      shape: 'custom' as const,
      points: draw.points.map(
        ([x, y]) => [(x - minX) / spanX, (y - minY) / spanY] as [number, number],
      ),
      slotAspect: width / height,
      width,
      x: minX + spanX / 2,
      y: minY + spanY / 2,
      rotation: 0,
    };
    if (element?.type === 'sticker') {
      store.updateElement(element.id, outline);
      return done(element.id);
    }
    const frame = createFrame(outline);
    store.addElement(frame);
    done(frame.id);
  }, []);

  return { start, addPoint, setTrace, undo, cancel, finish };
}

/**
 * The part inside `points` of the picture under the outline's centre, as a new piece:
 * the top-most picture on the canvas there, else the picture in the box there. Null
 * if there's no picture under it.
 */
function extractUnder(points: Array<[number, number]>, design: Size): StickerElement | null {
  const store = useEditorStore.getState();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

  // Pictures on the canvas, front-most first.
  for (let i = store.elements.length - 1; i >= 0; i--) {
    const el = store.elements[i]!;
    if (el.type !== 'sticker' || !el.src || el.hidden || !stickerContains(el, cx, cy, design)) {
      continue;
    }
    const change = cutOutSticker(el, points, design);
    if (!change) return null;
    return {
      ...el,
      ...change,
      id: createId(),
      label: 'Cut-out',
      cutFrom: { kind: 'element', id: el.id },
      // Its own picture URL, so deleting either piece keeps the other working.
      src: el.file ? URL.createObjectURL(el.file) : el.src,
    };
  }

  // The picture in the box under the centre.
  const cells = getCellShapes(getTemplateSnapshot().layout, design, store.style, 1);
  const index = cells.findIndex(
    (r) =>
      cx * design.width >= r.x &&
      cx * design.width <= r.x + r.width &&
      cy * design.height >= r.y &&
      cy * design.height <= r.y + r.height,
  );
  const item = index >= 0 ? cellPictureAt(index) : null;
  const cell = cells[index];
  const piece = item && cell ? cutOutCellPicture(item, cell, points, design) : null;
  return piece && item ? { ...piece, cutFrom: { kind: 'cell', index, itemId: item.id } } : null;
}

/** The picture showing in a box right now (for cutting it out), if it's a picture. */
export function cellPictureAt(index: number) {
  const { cells } = useEditorStore.getState();
  const item = getActiveItem(cells[index], usePlaybackStore.getState().currentTime);
  return item?.kind === 'image' ? item : null;
}

/** True while the last cut / extraction / drawn frame can still be undone. */
export const useCanUndoDraw = (): boolean => {
  const undo = useUiStore((s) => s.drawUndo);
  const elements = useEditorStore((s) => s.elements);
  const cells = useEditorStore((s) => s.cells);
  return Boolean(undo && undo.after.elements === elements && undo.after.cells === cells);
};

/** Puts the design back to just before the last cut / extraction / drawn frame. */
export function undoLastDraw(): void {
  const ui = useUiStore.getState();
  const undo = ui.drawUndo;
  if (!undo) return;
  ui.setDrawUndo(null);
  const s = useEditorStore.getState();
  if (s.elements !== undo.after.elements || s.cells !== undo.after.cells) return; // changed since

  // Box pictures removed by it had their picture URLs freed: make new ones.
  const kept = new Set(Object.values(undo.after.cells).flatMap((items) => items.map((i) => i.id)));
  const cells = Object.fromEntries(
    Object.entries(undo.before.cells).map(([key, items]) => [
      key,
      items.map((it) => (kept.has(it.id) ? it : { ...it, src: URL.createObjectURL(it.file) })),
    ]),
  );
  // Pieces it added go away: free their pictures.
  const existed = new Set(undo.before.elements.map((e) => e.id));
  for (const el of undo.after.elements) {
    if (!existed.has(el.id) && el.type === 'sticker' && el.src) URL.revokeObjectURL(el.src);
  }
  useEditorStore.setState({ elements: undo.before.elements, cells, selection: null });
  ui.showToast('Undone', 'info');
}
