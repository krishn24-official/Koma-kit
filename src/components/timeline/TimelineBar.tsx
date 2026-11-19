import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { FRAME_DURATION } from '@/constants/editor';
import { useTimelineDuration } from '@/store/selectors';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { formatTime } from '@/utils/timeline';
import { TimelineTracks } from './TimelineTracks';

/**
 * Playback controls and scrubber. Appears once the template has a video or an image
 * scheduled after the start.
 */
export function TimelineBar() {
  const duration = useTimelineDuration();
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const toggle = usePlaybackStore((s) => s.toggle);
  const seek = usePlaybackStore((s) => s.seek);

  if (duration <= 0) return null;

  const step = (frames: number) => {
    usePlaybackStore.getState().pause();
    seek(usePlaybackStore.getState().currentTime + frames * FRAME_DURATION);
  };

  return (
    <div className="shrink-0 space-y-2 border-t border-neutral-800 bg-neutral-950 px-3 py-2">
      <div className="flex items-center gap-1">
        <IconButton
          label={isPlaying ? 'Pause' : 'Play'}
          variant="primary"
          icon={isPlaying ? <Pause /> : <Play />}
          onClick={toggle}
        />
        <IconButton label="Back one frame" icon={<ChevronLeft />} onClick={() => step(-1)} />
        <IconButton label="Forward one frame" icon={<ChevronRight />} onClick={() => step(1)} />
        <span className="ml-1 text-xs text-neutral-300 tabular-nums">
          {formatTime(currentTime)}
          <span className="text-neutral-500"> / {formatTime(duration)}</span>
        </span>
      </div>

      <input
        type="range"
        aria-label="Timeline position"
        aria-valuetext={formatTime(currentTime)}
        min={0}
        max={duration}
        step={0.01}
        value={Math.min(currentTime, duration)}
        onChange={(e) => seek(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-brand-500"
      />

      <TimelineTracks duration={duration} />
    </div>
  );
}
