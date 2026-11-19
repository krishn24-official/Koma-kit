import { useMemo } from 'react';
import { toDesignSize } from '@/constants/canvasSizes';
import type { AspectRatio, CellMedia, PixelRect, ResolvedLayout, TextOverlay } from '@/types';
import { getCellRects } from '@/utils/layoutMath';
import { resolveLayout } from '@/utils/layoutTree';
import type { TemplateSnapshot } from '@/utils/renderToCanvas';
import { getActiveItemIndex, getTimelineDuration } from '@/utils/timeline';
import { useEditorStore } from './useEditorStore';
import { usePlaybackStore } from './usePlaybackStore';

/** Current layout as per-cell rectangles. Stable while the layout tree is unchanged. */
export const useCurrentLayout = (): ResolvedLayout =>
  resolveLayout(useEditorStore((s) => s.layoutRoot));

/** Canvas size in design units (1080 wide). Stable while the canvas size is unchanged. */
export const useCurrentAspectRatio = (): AspectRatio => {
  const canvasSize = useEditorStore((s) => s.canvasSize);
  return useMemo(() => toDesignSize(canvasSize), [canvasSize]);
};

export const useSelectedText = (): TextOverlay | null =>
  useEditorStore((s) => {
    const selection = s.selection;
    if (selection?.kind !== 'text') return null;
    return s.texts.find((t) => t.id === selection.id) ?? null;
  });

/** Number of visible cells that have at least one item. */
export const useFilledCellCount = (): number => {
  const cellCount = useCurrentLayout().cells.length;
  return useEditorStore(
    (s) => Object.keys(s.cells).filter((key) => Number(key) < cellCount).length,
  );
};

/** Timeline length in seconds; 0 when the template has no video or scheduled images. */
export const useTimelineDuration = (): number => {
  const cellCount = useCurrentLayout().cells.length;
  return useEditorStore((s) => getTimelineDuration(s.cells, cellCount));
};

/** True if any visible cell holds a video. */
export const useHasVideo = (): boolean => {
  const cellCount = useCurrentLayout().cells.length;
  return useEditorStore((s) =>
    Object.entries(s.cells).some(
      ([key, items]) => Number(key) < cellCount && items.some((item) => item.kind === 'video'),
    ),
  );
};

/** The item a cell is showing at the current playhead. Re-renders only when it changes. */
export const useActiveItem = (index: number): CellMedia | null => {
  const items = useEditorStore((s) => s.cells[index]);
  const activeIndex = usePlaybackStore((s) => getActiveItemIndex(items, s.currentTime));
  return activeIndex >= 0 ? (items?.[activeIndex] ?? null) : null;
};

/**
 * Cell rectangles in design units. Cell proportions are the same at every scale,
 * so these are used for zoom bounds outside the canvas preview.
 */
export const useDesignCellRects = (): PixelRect[] => {
  const layout = useCurrentLayout();
  const aspectRatio = useCurrentAspectRatio();
  const style = useEditorStore((s) => s.style);
  return useMemo(
    () => getCellRects(layout.cells, aspectRatio, style, 1),
    [layout, aspectRatio, style],
  );
};

/** Everything the exporters need, read once at export time (not a hook). */
export function getTemplateSnapshot(): TemplateSnapshot {
  const s = useEditorStore.getState();
  return {
    layout: resolveLayout(s.layoutRoot),
    aspectRatio: toDesignSize(s.canvasSize),
    style: s.style,
    cells: s.cells,
    texts: s.texts,
    audioSourceId: s.audioSourceId,
  };
}
