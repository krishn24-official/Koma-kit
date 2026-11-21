import { useMemo, useRef } from 'react';
import { useContainerSize } from '@/hooks/useContainerSize';
import { useCurrentAspectRatio, useCurrentLayout } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import { useUiStore } from '@/store/useUiStore';
import { gradientCss } from '@/utils/background';
import { getCellRects } from '@/utils/layoutMath';
import { CanvasBackground } from './CanvasBackground';
import { CanvasResizeHandles } from './CanvasResizeHandles';
import { CropOverlay } from './CropOverlay';
import { GridCell } from './GridCell';
import { LayoutDividers } from './LayoutDividers';
import { ElementView } from './ElementView';

/** Space kept around the canvas for its resize grips. */
const HANDLE_ROOM = 24;

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
  const elements = useEditorStore((s) => s.elements);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const isCropping = useUiStore((s) => s.cropRect !== null);

  const available = {
    width: container.width - HANDLE_ROOM * 2,
    height: container.height - HANDLE_ROOM * 2,
  };
  const unit =
    available.width > 0 && available.height > 0
      ? Math.min(available.width / aspectRatio.width, available.height / aspectRatio.height)
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
          data-canvas-area
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={canvasSize}
        >
          <div
            data-canvas
            className="absolute inset-0 overflow-hidden shadow-2xl ring-1 shadow-black/60 ring-white/10"
            style={{
              backgroundColor: style.backgroundColor,
              backgroundImage: style.backgroundType === 'gradient' ? gradientCss(style) : undefined,
            }}
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) clearSelection();
            }}
          >
            <CanvasBackground style={style} unit={unit} />

            {rects.map((rect, index) => (
              <GridCell
                key={index}
                index={index}
                rect={rect}
                radius={style.radius * unit}
                unit={unit}
              />
            ))}

            <LayoutDividers canvasSize={canvasSize} padding={style.padding * unit} />

            <div className="pointer-events-none absolute inset-0 z-20">
              {elements.map((element) => (
                <ElementView
                  key={element.id}
                  element={element}
                  unit={unit}
                  canvasSize={canvasSize}
                />
              ))}
            </div>
          </div>

          {isCropping ? (
            <CropOverlay size={canvasSize} unit={unit} />
          ) : (
            <CanvasResizeHandles size={canvasSize} />
          )}
        </div>
      )}
    </div>
  );
}
