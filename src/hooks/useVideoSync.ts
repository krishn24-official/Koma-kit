import { useEffect, type RefObject } from 'react';
import { usePlaybackStore, type PlaybackState } from '@/store/usePlaybackStore';
import type { CellMedia } from '@/types';
import { getTimelineTimeOf, getVideoLocalTime, isVideoRunning } from '@/utils/timeline';

/** Videos further than this from the timeline (seconds) are re-seeked. */
const MAX_DRIFT = 0.3;
/** When paused, smaller differences than this aren't worth a seek. */
const SEEK_TOLERANCE = 0.02;

/**
 * Keeps a <video> element in step with the shared timeline:
 * plays/pauses with it, follows seeks, and holds the last frame after the clip ends.
 *
 * The audio-source video also becomes the timeline's clock, so pictures follow the
 * sound rather than the other way round.
 */
export function useVideoSync(
  ref: RefObject<HTMLVideoElement>,
  item: CellMedia,
  isAudioSource: boolean,
) {
  // Only timing matters here. Depending on the whole item would restart playback on
  // every pan/zoom change.
  const { id, start, trimStart, trimEnd } = item;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = !isAudioSource;
    const timing = { start, trimStart, trimEnd };

    const sync = ({ currentTime, isPlaying }: PlaybackState) => {
      const target = getVideoLocalTime(timing, currentTime);

      if (isPlaying && isVideoRunning(timing, currentTime)) {
        if (video.paused) {
          video.currentTime = target;
          // Runs inside the Play tap, so sound is allowed. If the browser still refuses,
          // play muted rather than not at all.
          video.play().catch(() => {
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

    const { setClockSource } = usePlaybackStore.getState();
    if (isAudioSource) {
      setClockSource({
        id,
        read: () =>
          !video.paused && !video.ended && video.readyState >= 2
            ? getTimelineTimeOf(timing, video.currentTime)
            : null,
      });
    }

    return () => {
      unsubscribe();
      video.pause();
      if (usePlaybackStore.getState().clockSource?.id === id) setClockSource(null);
    };
  }, [ref, id, start, trimStart, trimEnd, isAudioSource]);
}
