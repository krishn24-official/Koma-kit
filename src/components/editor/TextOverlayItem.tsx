import { useDrag } from '@use-gesture/react';
import { useEditorStore } from '@/store/useEditorStore';
import { useUiStore } from '@/store/useUiStore';
import type { Size, TextOverlay } from '@/types';
import { cn } from '@/utils/cn';
import { clamp } from '@/utils/math';
import { getTextRenderStyle } from '@/utils/textStyle';

interface TextOverlayItemProps {
  text: TextOverlay;
  /** Preview pixels per design unit. */
  unit: number;
  canvasSize: Size;
}

/** A text layer on the canvas. Tap to select, drag to move. */
export function TextOverlayItem({ text, unit, canvasSize }: TextOverlayItemProps) {
  const isSelected = useEditorStore(
    (s) => s.selection?.kind === 'text' && s.selection.id === text.id,
  );

  const bind = useDrag(
    ({ delta: [dx, dy], first, tap }) => {
      const { select, updateText, texts } = useEditorStore.getState();
      if (first || tap) {
        select({ kind: 'text', id: text.id });
        useUiStore.getState().setActivePanel('text');
      }
      if (tap) return;

      const current = texts.find((t) => t.id === text.id);
      if (!current) return;
      updateText(text.id, {
        x: clamp(current.x + dx / canvasSize.width, 0, 1),
        y: clamp(current.y + dy / canvasSize.height, 0, 1),
      });
    },
    { filterTaps: true },
  );

  const style = getTextRenderStyle(text, unit);

  return (
    <div
      {...bind()}
      className={cn(
        'pointer-events-auto absolute cursor-move touch-none text-center whitespace-pre select-none',
        isSelected && 'outline-2 outline-offset-4 outline-brand-500 outline-dashed',
      )}
      style={{
        left: text.x * canvasSize.width,
        top: text.y * canvasSize.height,
        transform: 'translate(-50%, -50%)',
        fontFamily: `"${style.font.family}"`,
        fontWeight: style.font.weight,
        fontSize: style.fontSize,
        lineHeight: `${style.lineHeight}px`,
        color: text.color,
        WebkitTextStroke:
          style.outline > 0 ? `${style.outline * 2}px ${text.strokeColor}` : undefined,
        paintOrder: 'stroke fill',
        textShadow: style.shadow
          ? `0 ${style.shadow.offsetY}px ${style.shadow.blur}px ${style.shadow.color}`
          : undefined,
      }}
    >
      {text.text || ' '}
    </div>
  );
}
