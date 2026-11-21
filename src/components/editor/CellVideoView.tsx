import { VolumeX } from 'lucide-react';
import { useRef } from 'react';
import { useCellGestures } from '@/hooks/useCellGestures';
import { useVideoSync } from '@/hooks/useVideoSync';
import type { CellMedia, Size } from '@/types';
import { getCroppedMediaLayout } from '@/utils/imageTransform';

interface CellVideoViewProps {
  index: number;
  item: CellMedia;
  size: Size;
}

/**
 * A video inside a cell, kept in sync with the timeline.
 * Same pan/zoom gestures as images.
 */
export function CellVideoView({ index, item, size }: CellVideoViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useCellGestures(containerRef, index, item.id, size);
  useVideoSync(videoRef, item);

  const { frame, media } = getCroppedMediaLayout(item, size);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
    >
      {/* Clipping frame = the cropped part; the full video is shifted inside it. */}
      <div
        className="pointer-events-none absolute overflow-hidden"
        style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height }}
      >
        <video
          ref={videoRef}
          src={item.src}
          playsInline
          preload="auto"
          disablePictureInPicture
          className="absolute max-w-none select-none"
          style={media}
        />
      </div>
      {item.muted && size.width > 60 && (
        <span
          className="pointer-events-none absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white"
          title="Muted"
        >
          <VolumeX className="size-3" aria-hidden />
        </span>
      )}
    </div>
  );
}
