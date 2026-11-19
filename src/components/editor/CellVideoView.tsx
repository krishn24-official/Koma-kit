import { VolumeX } from 'lucide-react';
import { useRef } from 'react';
import { useCellGestures } from '@/hooks/useCellGestures';
import { useVideoSync } from '@/hooks/useVideoSync';
import { useEditorStore } from '@/store/useEditorStore';
import type { CellMedia, Size } from '@/types';
import { getImageRect, getImageSize } from '@/utils/imageTransform';

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
  const isAudioSource = useEditorStore((s) => s.audioSourceId === item.id);

  useCellGestures(containerRef, index, item.id, size);
  useVideoSync(videoRef, item, isAudioSource);

  const rect = getImageRect(getImageSize(item), size, item.transform);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
    >
      <video
        ref={videoRef}
        src={item.src}
        playsInline
        preload="auto"
        disablePictureInPicture
        className="pointer-events-none absolute max-w-none select-none"
        style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
      />
      {!isAudioSource && size.width > 60 && (
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
