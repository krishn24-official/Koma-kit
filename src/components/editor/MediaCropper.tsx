import { useEffect, useRef } from 'react';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUiStore } from '@/store/useUiStore';
import type { CellMedia, Size } from '@/types';
import { detectContentBounds } from '@/utils/detectBars';
import { getVideoLocalTime } from '@/utils/timeline';
import { CropFrame } from './CropFrame';

/**
 * Crop mode for a box's picture or clip: shows the whole picture (or the current video
 * frame) fitted inside the box, with a crop frame over it. Black bars are detected so
 * edges snap to them and "Remove black bars" can cut them in one tap.
 */
export function MediaCropper({ item, size }: { item: CellMedia; size: Size }) {
  const crop = useUiStore((s) => s.mediaCrop);
  const setMediaCrop = useUiStore((s) => s.setMediaCrop);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Whole media fitted inside the box ("contain"), centred.
  const scale = Math.min(size.width / item.naturalWidth, size.height / item.naturalHeight);
  const width = item.naturalWidth * scale;
  const height = item.naturalHeight * scale;

  const saveBars = (source: CanvasImageSource) => {
    const current = useUiStore.getState().mediaCrop;
    if (!current || current.itemId !== item.id) return;
    setMediaCrop({
      ...current,
      bars: detectContentBounds(source, item.naturalWidth, item.naturalHeight),
    });
  };

  // Show the video at the current playhead, so the frame matches what you were watching.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || item.kind !== 'video') return;
    const time = getVideoLocalTime(item, usePlaybackStore.getState().currentTime);
    const seek = () => {
      video.currentTime = Math.max(0.001, time);
    };
    if (video.readyState >= 1) seek();
    else video.addEventListener('loadedmetadata', seek, { once: true });
  }, [item]);

  if (!crop || crop.itemId !== item.id) return null;
  const bars = crop.bars;

  return (
    <div className="absolute inset-0 z-20 bg-neutral-950">
      <div
        className="absolute"
        style={{
          left: (size.width - width) / 2,
          top: (size.height - height) / 2,
          width,
          height,
        }}
      >
        {item.kind === 'video' ? (
          <video
            ref={videoRef}
            src={item.src}
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 size-full"
            onSeeked={(e) => saveBars(e.currentTarget)}
          />
        ) : (
          <img
            src={item.src}
            alt=""
            draggable={false}
            className="absolute inset-0 size-full select-none"
            onLoad={(e) => saveBars(e.currentTarget)}
          />
        )}
        <CropFrame
          rect={crop.rect}
          onChange={(rect) => setMediaCrop({ ...crop, rect })}
          size={{ width, height }}
          minSize={0.05}
          snapLines={
            bars ? { xs: [bars.x, bars.x + bars.w], ys: [bars.y, bars.y + bars.h] } : undefined
          }
          label={`${Math.round(crop.rect.w * item.naturalWidth)} × ${Math.round(crop.rect.h * item.naturalHeight)}`}
        />
      </div>
    </div>
  );
}
