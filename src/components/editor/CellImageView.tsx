import { useRef } from 'react';
import { useCellGestures } from '@/hooks/useCellGestures';
import type { CellMedia, Size } from '@/types';
import { getCroppedMediaLayout } from '@/utils/imageTransform';

interface CellImageViewProps {
  index: number;
  item: CellMedia;
  size: Size;
}

/** An image inside a cell. Drag to pan; wheel or pinch to zoom. */
export function CellImageView({ index, item, size }: CellImageViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  useCellGestures(ref, index, item.id, size);

  const { frame, media } = getCroppedMediaLayout(item, size);

  return (
    <div ref={ref} className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing">
      {/* Clipping frame = the cropped part; the full picture is shifted inside it. */}
      <div
        className="pointer-events-none absolute overflow-hidden"
        style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height }}
      >
        <img
          src={item.src}
          alt={item.fileName}
          draggable={false}
          className="absolute max-w-none select-none"
          style={media}
        />
      </div>
    </div>
  );
}
