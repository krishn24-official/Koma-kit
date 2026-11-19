import { useEffect } from 'react';
import { useTimelineDuration } from '@/store/selectors';
import { getCurrentDuration, usePlaybackStore } from '@/store/usePlaybackStore';

/**
 * Advances the timeline while playing. Mount once, at the app root.
 * Uses the audio video's position as the clock when one is playing, and wall-clock
 * time otherwise (e.g. while only images are scheduled).
 */
export function usePlaybackLoop() {
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const duration = useTimelineDuration();

  // Keep the playhead inside the timeline when media is added or removed.
  useEffect(() => {
    const { currentTime, pause, seek } = usePlaybackStore.getState();
    if (duration <= 0) {
      pause();
      if (currentTime !== 0) seek(0);
    } else if (currentTime > duration) {
      seek(duration);
    }
  }, [duration]);

  useEffect(() => {
    if (!isPlaying) return;
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      const { currentTime, clockSource } = usePlaybackStore.getState();
      const end = getCurrentDuration();
      const next = clockSource?.read() ?? currentTime + dt;

      if (next >= end) {
        usePlaybackStore.setState({ currentTime: end, isPlaying: false });
        return;
      }
      usePlaybackStore.setState({ currentTime: next });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying]);
}
