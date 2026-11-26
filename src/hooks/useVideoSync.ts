import { useEffect, type RefObject } from 'react';
import { registerClock, usePlaybackStore, type PlaybackState } from '@/store/usePlaybackStore';
import type { CellMedia } from '@/types';
import { getTimelineTimeOf, getVideoLocalTime, isVideoRunning } from '@/utils/timeline';

/** Videos further than this from the timeline (seconds) are re-seeked. */
const MAX_DRIFT = 0.3;
/** When paused, smaller differences than this aren't worth a seek. */
const SEEK_TOLERANCE = 0.02;

/**
 * Keeps a <video> element in step with the shared timeline:
 * plays/pauses with it, follows seeks, and holds the last frame after the clip ends.
 * Every clip plays its own sound unless it's muted.
 *
 * Each playing video also offers itself as the timeline's clock, so pictures follow
 * the sound rather than the other way round.
 */
export function useVideoSync(ref: RefObject<HTMLVideoElement>, item: CellMedia) {
  // Only timing and mute matter here. Depending on the whole item would restart
  // playback on every pan/zoom change.
  const { id, start, delay, trimStart, trimEnd, muted, loop, duration } = item;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = muted;
    const timing = { start, delay, trimStart, trimEnd, loop };
    // An untrimmed looping clip can loop on its own (seamless). A trimmed one jumps back
    // to the trim start as soon as it reaches the trim end.
    video.loop = Boolean(loop) && trimStart < 0.01 && trimEnd > duration - 0.01;
    const onTimeUpdate = () => {
      if (loop && !video.loop && video.currentTime >= trimEnd - 0.06) {
        video.currentTime = trimStart;
      }
    };
    video.addEventListener('timeupdate', onTimeUpdate);

    const sync = ({ currentTime, isPlaying }: PlaybackState) => {
      const target = getVideoLocalTime(timing, currentTime);

      if (isPlaying && isVideoRunning(timing, currentTime)) {
        if (video.paused) {
          video.currentTime = target;
          // Sound back on each time it starts (an earlier fallback may have muted it).
          video.muted = muted;
          video.play().catch((error: unknown) => {
            // Only when the browser blocks sound (before the first tap on the page) play
            // muted rather than not at all. Other failures, like a play interrupted by a
            // pause or a jump, are not about sound: leave the sound on.
            if (!(error instanceof DOMException && error.name === 'NotAllowedError')) return;
            video.muted = true;
            video.play().catch(() => undefined);
          });
        } else if (Math.abs(video.currentTime - target) > MAX_DRIFT) {
          video.currentTime = target;
        }
        return;
      }

      if (!video.paused) video.pause();
      if (Math.abs(video.currentTime - target) > SEEK_TOLERANCE) video.currentTime = target;
    };

    sync(usePlaybackStore.getState());
    const unsubscribe = usePlaybackStore.subscribe(sync);
    const unregister = registerClock({
      id,
      audible: !muted,
      read: () =>
        !video.paused && !video.ended && video.readyState >= 2
          ? getTimelineTimeOf(timing, video.currentTime, usePlaybackStore.getState().currentTime)
          : null,
    });

    return () => {
      unsubscribe();
      unregister();
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.pause();
    };
  }, [ref, id, start, delay, trimStart, trimEnd, muted, loop, duration]);
}
