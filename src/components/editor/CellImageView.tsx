import { useRef } from 'react';
import { useCellGestures } from '@/hooks/useCellGestures';
import type { CellMedia, Size } from '@/types';
import { getImageRect, getImageSize } from '@/utils/imageTransform';

interface CellImageViewProps {
  index: number;
  item: CellMedia;
  size: Size;
}

/** An image inside a cell. Drag to pan; wheel or pinch to zoom. */
export function CellImageView({ index, item, size }: CellImageViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  useCellGestures(ref, index, item.id, size);

  const rect = getImageRect(getImageSize(item), size, item.transform);

  return (
    <div ref={ref} className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing">
      <img
        src={item.src}
        alt={item.fileName}
        draggable={false}
        className="pointer-events-none absolute max-w-none select-none"
        style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
      />
    </div>
  );
}
