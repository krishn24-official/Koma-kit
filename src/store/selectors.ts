import { useMemo } from 'react';
import { getAspectRatio } from '@/constants/aspectRatios';
import { getLayout } from '@/constants/layouts';
import type { AspectRatio, LayoutPreset, PixelRect, TextOverlay } from '@/types';
import { getCellRects } from '@/utils/layoutMath';
import { useEditorStore } from './useEditorStore';

export const useCurrentLayout = (): LayoutPreset => getLayout(useEditorStore((s) => s.layoutId));

export const useCurrentAspectRatio = (): AspectRatio =>
  getAspectRatio(useEditorStore((s) => s.aspectRatioId));

export const useSelectedText = (): TextOverlay | null =>
  useEditorStore((s) => {
    const selection = s.selection;
    if (selection?.kind !== 'text') return null;
    return s.texts.find((t) => t.id === selection.id) ?? null;
  });

/** Number of visible cells that have an image. */
export const useFilledCellCount = (): number => {
  const cellCount = useCurrentLayout().cells.length;
  return useEditorStore(
    (s) => Object.keys(s.images).filter((key) => Number(key) < cellCount).length,
  );
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
