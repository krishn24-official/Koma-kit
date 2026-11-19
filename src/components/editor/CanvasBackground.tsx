import type { CanvasStyle } from '@/types';
import { blurMargin } from '@/utils/background';

interface CanvasBackgroundProps {
  style: CanvasStyle;
  /** Preview pixels per design unit. */
  unit: number;
}

/**
 * Picture background in the editor (blurred and dimmed). Solid colors and gradients
 * are plain CSS on the canvas element itself. The export draws the same thing in
 * utils/background.ts.
 */
export function CanvasBackground({ style, unit }: CanvasBackgroundProps) {
  const image = style.backgroundImage;
  if (style.backgroundType !== 'image' || !image) return null;

  const blur = style.backgroundBlur * unit;
  const margin = blurMargin(blur);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute bg-cover bg-center"
        style={{
          inset: -margin,
          backgroundImage: `url("${image.src}")`,
          filter: blur > 0 ? `blur(${blur}px)` : undefined,
        }}
      />
      {style.backgroundDim > 0 && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0, 0, 0, ${style.backgroundDim})` }}
        />
      )}
    </div>
  );
}
