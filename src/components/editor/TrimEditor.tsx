import { Check, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { useEditorStore } from '@/store/useEditorStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import type { CellMedia } from '@/types';
import { cn } from '@/utils/cn';
import { clamp } from '@/utils/math';
import { formatTime as formatTimeDown, getPlayStart } from '@/utils/timeline';

/** Times rounded to the nearest tenth (dragging gives values like 3.99 for 4.0). */
const formatTime = (t: number) => formatTimeDown(Math.round(t * 10) / 10 + 1e-6);

/** Shortest clip that can be kept (seconds). */
const MIN_LENGTH = 0.2;
/** One tap on ‹ › moves an end by this much (seconds). */
const NUDGE = 0.1;
/** Pictures in the strip. */
const THUMBS = 10;

type Handle = 'start' | 'end' | 'scrub';

/** Pictures across the clip for the strip, made by seeking a hidden video. */
function useFilmstrip(src: string, duration: number) {
  const [frames, setFrames] = useState<string[]>([]);
  useEffect(() => {
    let canceled = false;
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'auto';
    video.playsInline = true;
    video.src = src;
    const canvas = document.createElement('canvas');
    const run = async () => {
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => resolve();
        video.onerror = () => reject(new Error('video'));
      });
      const h = 64;
      canvas.height = h;
      canvas.width = Math.max(
        1,
        Math.round((h * video.videoWidth) / Math.max(1, video.videoHeight)),
      );
      const ctx = canvas.getContext('2d')!;
      const out: string[] = [];
      for (let i = 0; i < THUMBS && !canceled; i++) {
        video.currentTime = Math.min(duration - 0.05, ((i + 0.5) / THUMBS) * duration);
        await new Promise<void>((resolve) => (video.onseeked = () => resolve()));
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        out.push(canvas.toDataURL('image/jpeg', 0.6));
        if (!canceled) setFrames([...out]);
      }
    };
    run().catch(() => undefined);
    return () => {
      canceled = true;
      video.removeAttribute('src');
      video.load();
    };
  }, [src, duration]);
  return frames;
}

/**
 * Trim a clip: drag the two handles over the picture strip (the preview shows the exact
 * frame), fine-tune with ‹ ›, play the selection, then Done. Nothing changes until Done.
 */
export function TrimEditor({
  index,
  item,
  onClose,
}: {
  index: number;
  item: CellMedia;
  onClose: () => void;
}) {
  const duration = item.duration;
  const [start, setStart] = useState(item.trimStart);
  const [end, setEnd] = useState(item.trimEnd);
  const [position, setPosition] = useState(item.trimStart);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<Handle | null>(null);
  const frames = useFilmstrip(item.src, duration);

  // The preview shows the frame at `position` (unless it's playing the selection).
  useEffect(() => {
    const video = videoRef.current;
    if (video && !playing && Math.abs(video.currentTime - position) > 0.01) {
      video.currentTime = position;
    }
  }, [position, playing]);

  // Playing the selection stops at its end.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playing) return;
    let frame = 0;
    const tick = () => {
      if (video.currentTime >= end - 0.03 || video.ended) {
        video.pause();
        video.muted = true;
        setPlaying(false);
        setPosition(end);
        return;
      }
      setPosition(video.currentTime);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, end]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
      setPlaying(false);
      return;
    }
    video.currentTime = position >= end - 0.05 || position < start ? start : position;
    // Play the selection with its sound (unless the clip is muted); scrubbing stays silent.
    video.muted = Boolean(item.muted);
    video
      .play()
      .then(() => setPlaying(true))
      .catch((error: unknown) => {
        // A browser that blocks sound before the first tap: play silently instead.
        if (!(error instanceof DOMException && error.name === 'NotAllowedError')) return;
        video.muted = true;
        void video
          .play()
          .then(() => setPlaying(true))
          .catch(() => undefined);
      });
  };

  const timeAt = (clientX: number) => {
    const rect = stripRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return 0;
    return clamp((clientX - rect.left) / rect.width, 0, 1) * duration;
  };

  const moveTo = (handle: Handle, t: number) => {
    if (handle === 'start') {
      const next = clamp(t, 0, end - MIN_LENGTH);
      setStart(next);
      setPosition(next);
    } else if (handle === 'end') {
      const next = clamp(t, start + MIN_LENGTH, duration);
      setEnd(next);
      setPosition(Math.max(start, next - 0.04));
    } else {
      setPosition(clamp(t, 0, duration));
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>, handle: Handle) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = handle;
    if (playing) {
      videoRef.current?.pause();
      setPlaying(false);
    }
    moveTo(handle, timeAt(e.clientX));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) moveTo(dragging.current, timeAt(e.clientX));
  };
  const onPointerUp = () => {
    dragging.current = null;
  };

  const apply = () => {
    useEditorStore.getState().setItemTrim(index, item.id, { trimStart: start, trimEnd: end });
    // Show the clip from its (new) beginning.
    usePlaybackStore.getState().seek(getPlayStart(item));
    onClose();
  };

  const pct = (t: number) => `${(t / duration) * 100}%`;
  const changed = Math.abs(start - item.trimStart) > 0.005 || Math.abs(end - item.trimEnd) > 0.005;
  const trimmed = start > 0.005 || end < duration - 0.005;

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
      <div className="flex items-start gap-3">
        <video
          ref={videoRef}
          src={item.src}
          muted
          playsInline
          preload="auto"
          className="h-16 shrink-0 rounded-md bg-black sm:h-20"
          style={{ aspectRatio: `${item.naturalWidth} / ${item.naturalHeight}` }}
          onPause={() => setPlaying(false)}
        />
        <div className="min-w-0 flex-1">
          {/* Strip: pictures of the whole clip; the kept part is bright, the rest dimmed. */}
          <div
            ref={stripRef}
            className="relative h-14 touch-none overflow-hidden rounded-md bg-neutral-800 select-none"
            onPointerDown={(e) => onPointerDown(e, 'scrub')}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="slider"
            aria-label="Preview position"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration * 10) / 10}
            aria-valuenow={Math.round(position * 10) / 10}
          >
            <div className="absolute inset-0 flex">
              {frames.map((frame, i) => (
                <img
                  key={i}
                  src={frame}
                  alt=""
                  draggable={false}
                  className="h-full min-w-0 flex-1 object-cover"
                />
              ))}
            </div>
            <div className="absolute inset-y-0 left-0 bg-black/65" style={{ width: pct(start) }} />
            <div className="absolute inset-y-0 right-0 bg-black/65" style={{ left: pct(end) }} />
            <div
              className="pointer-events-none absolute inset-y-0 border-y-2 border-brand-500"
              style={{ left: pct(start), width: pct(end - start) }}
            />
            {/* Preview position */}
            <div
              className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
              style={{ left: pct(position) }}
            />
            {(['start', 'end'] as const).map((handle) => (
              <div
                key={handle}
                role="slider"
                aria-label={handle === 'start' ? 'Trim start' : 'Trim end'}
                aria-valuemin={0}
                aria-valuemax={Math.round(duration * 10) / 10}
                aria-valuenow={Math.round((handle === 'start' ? start : end) * 10) / 10}
                className={cn(
                  'absolute inset-y-0 flex w-5 cursor-ew-resize items-center justify-center bg-brand-500',
                  handle === 'start' ? 'rounded-l-md' : 'rounded-r-md',
                )}
                style={
                  handle === 'start'
                    ? { left: `calc(${pct(start)} - 0px)` }
                    : { left: `calc(${pct(end)} - 20px)` }
                }
                onPointerDown={(e) => onPointerDown(e, handle)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                <span className="h-5 w-0.5 rounded-full bg-white/90" />
              </div>
            ))}
          </div>

          {/* Times, with ‹ › to fine-tune each end. */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-300 tabular-nums">
            <div className="flex items-center gap-0.5">
              <IconButton
                label="Start earlier"
                icon={<ChevronLeft />}
                className="size-7"
                onClick={() => moveTo('start', start - NUDGE)}
              />
              <span>Start {formatTime(start)}</span>
              <IconButton
                label="Start later"
                icon={<ChevronRight />}
                className="size-7"
                onClick={() => moveTo('start', start + NUDGE)}
              />
            </div>
            <span className="font-medium text-neutral-100">Plays {formatTime(end - start)}</span>
            <div className="flex items-center gap-0.5">
              <IconButton
                label="End earlier"
                icon={<ChevronLeft />}
                className="size-7"
                onClick={() => moveTo('end', end - NUDGE)}
              />
              <span>End {formatTime(end)}</span>
              <IconButton
                label="End later"
                icon={<ChevronRight />}
                className="size-7"
                onClick={() => moveTo('end', end + NUDGE)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" icon={playing ? <Pause /> : <Play />} onClick={togglePlay}>
          {playing ? 'Pause' : 'Play selection'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => moveTo('start', position)}
          title="Start the clip at the white line"
        >
          Start here
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => moveTo('end', position)}
          title="End the clip at the white line"
        >
          End here
        </Button>
        {trimmed && (
          <Button
            size="sm"
            variant="ghost"
            icon={<RotateCcw />}
            onClick={() => {
              setStart(0);
              setEnd(duration);
              setPosition(0);
            }}
          >
            Reset
          </Button>
        )}
        <Button size="sm" icon={<X />} onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" icon={<Check />} disabled={!changed} onClick={apply}>
          Done
        </Button>
      </div>
    </div>
  );
}
