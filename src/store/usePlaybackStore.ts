import { create } from 'zustand';
import { getLayout } from '@/constants/layouts';
import { clamp } from '@/utils/math';
import { getTimelineDuration } from '@/utils/timeline';
import { useEditorStore } from './useEditorStore';

/**
 * Something that can report the true playback position, normally the video whose
 * audio is playing. Following it keeps pictures in sync with the sound.
 */
export interface ClockSource {
  id: string;
  /** Current timeline time, or null when the source isn't actually playing. */
  read: () => number | null;
}

export interface PlaybackState {
  currentTime: number;
  isPlaying: boolean;
  clockSource: ClockSource | null;
}

interface PlaybackActions {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  setClockSource: (source: ClockSource | null) => void;
}

/** Timeline length for the current editor state. */
export const getCurrentDuration = (): number => {
  const s = useEditorStore.getState();
  return getTimelineDuration(s.cells, getLayout(s.layoutId).cells.length);
};

export const usePlaybackStore = create<PlaybackState & PlaybackActions>()((set, get) => ({
  currentTime: 0,
  isPlaying: false,
  clockSource: null,

  play: () => {
    const duration = getCurrentDuration();
    if (duration <= 0) return;
    // Pressing play at the end starts again from the beginning.
    set((s) => ({
      isPlaying: true,
      currentTime: s.currentTime >= duration - 0.01 ? 0 : s.currentTime,
    }));
  },

  pause: () => set({ isPlaying: false }),

  toggle: () => (get().isPlaying ? get().pause() : get().play()),

  seek: (time) => set({ currentTime: clamp(time, 0, getCurrentDuration()) }),

  setClockSource: (clockSource) => set({ clockSource }),
}));
