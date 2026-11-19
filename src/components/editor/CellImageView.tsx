import { useRef } from 'react';
import { useCellGestures } from '@/hooks/useCellGestures';
import type { CellImage, Size } from '@/types';
import { getImageRect, getImageSize } from '@/utils/imageTransform';

interface CellImageViewProps {
  index: number;
  image: CellImage;
  size: Size;
}

/** An image inside a cell. Drag to pan; wheel or pinch to zoom. */
export function CellImageView({ index, image, size }: CellImageViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  useCellGestures(ref, index, size);

  const rect = getImageRect(getImageSize(image), size, image.transform);

  return (
    <div ref={ref} className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing">
      <img
        src={image.src}
        alt={image.fileName}
        draggable={false}
        className="pointer-events-none absolute max-w-none select-none"
        style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
      />
    </div>
  );
}
