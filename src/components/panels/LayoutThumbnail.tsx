import type { CellRect } from '@/types';
import { getCellRects } from '@/utils/layoutMath';

interface LayoutThumbnailProps {
  cells: CellRect[];
  /** height / width of the canvas */
  ratio: number;
}

const WIDTH = 100;

/** Small SVG preview of a layout; uses the same math as the real canvas. */
export function LayoutThumbnail({ cells, ratio }: LayoutThumbnailProps) {
  const height = WIDTH * ratio;
  const rects = getCellRects(cells, { width: WIDTH, height }, { gap: 6, padding: 0 }, 1);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${height}`} className="h-full w-full" aria-hidden>
      {rects.map((rect, i) => (
        <rect
          key={i}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          rx={3}
          className="fill-current"
        />
      ))}
    </svg>
  );
}
