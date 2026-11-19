import { useMemo, useRef } from 'react';
import { useContainerSize } from '@/hooks/useContainerSize';
import { useCurrentAspectRatio, useCurrentLayout } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import { getCellRects } from '@/utils/layoutMath';
import { GridCell } from './GridCell';
import { TextOverlayItem } from './TextOverlayItem';

/**
 * Live preview of the template, scaled to fit the available space.
 * Everything is stored in design units and multiplied by `unit` here.
 */
export function TemplateCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const container = useContainerSize(containerRef);
  const layout = useCurrentLayout();
  const aspectRatio = useCurrentAspectRatio();
  const style = useEditorStore((s) => s.style);
  const texts = useEditorStore((s) => s.texts);
  const clearSelection = useEditorStore((s) => s.clearSelection);

  const unit =
    container.width > 0 && container.height > 0
      ? Math.min(container.width / aspectRatio.width, container.height / aspectRatio.height)
      : 0;
  const canvasSize = { width: aspectRatio.width * unit, height: aspectRatio.height * unit };

  const rects = useMemo(
    () =>
      getCellRects(
        layout.cells,
        { width: aspectRatio.width * unit, height: aspectRatio.height * unit },
        style,
        unit,
      ),
    [layout, aspectRatio, style, unit],
  );

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {unit > 0 && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden shadow-2xl ring-1 shadow-black/60 ring-white/10"
          style={{ ...canvasSize, backgroundColor: style.backgroundColor }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) clearSelection();
          }}
        >
          {rects.map((rect, index) => (
            <GridCell key={index} index={index} rect={rect} radius={style.radius * unit} />
          ))}

          <div className="pointer-events-none absolute inset-0">
            {texts.map((text) => (
              <TextOverlayItem key={text.id} text={text} unit={unit} canvasSize={canvasSize} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
