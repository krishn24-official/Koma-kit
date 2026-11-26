import type { ResolvedLayout } from '@/types';
import { cellOutlinePath, getCellShapes } from '@/utils/layoutMath';

interface LayoutThumbnailProps {
  layout: ResolvedLayout;
  /** height / width of the canvas */
  ratio: number;
}

const WIDTH = 100;

/** Small SVG preview of a layout (slanted panels too); same math as the real canvas. */
export function LayoutThumbnail({ layout, ratio }: LayoutThumbnailProps) {
  const height = WIDTH * ratio;
  const shapes = getCellShapes(layout, { width: WIDTH, height }, { gap: 6, padding: 0 }, 1);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-full w-full" aria-hidden>
      {shapes.map((shape, i) => (
        <path
          key={i}
          d={cellOutlinePath(shape, 3)}
          transform={`translate(${shape.x} ${shape.y})`}
          className="fill-current"
        />
      ))}
    </svg>
  );
}
