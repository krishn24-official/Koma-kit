import { create } from 'zustand';
import { countCells } from '@/utils/layoutTree';
import { clamp } from '@/utils/math';
import { getTimelineDuration } from '@/utils/timeline';
import { useEditorStore } from './useEditorStore';

/**
 * A playing video that can report the true playback position. Following it keeps
 * pictures in sync with the sound.
 */
export interface ClockSource {
  id: string;
  /** True when its sound is on; audible clips are preferred as the clock. */
  audible: boolean;
  /** Current timeline time, or null when the video isn't actually playing. */
  read: () => number | null;
}

/**
 * Registered clocks. Kept outside the store on purpose: registering must not wake up
 * every subscriber, and only the playback loop reads it.
 */
const clocks = new Map<string, ClockSource>();

/** Adds a clock; returns a function that removes it again. */
export function registerClock(source: ClockSource): () => void {
  clocks.set(source.id, source);
  return () => {
    if (clocks.get(source.id) === source) clocks.delete(source.id);
  };
}

/** Timeline time from a playing video (audible ones first), or null if none is playing. */
export function readClock(): number | null {
  let fallback: number | null = null;
  for (const clock of clocks.values()) {
    const time = clock.read();
    if (time === null) continue;
    if (clock.audible) return time;
    fallback ??= time;
  }
  return fallback;
}

export interface PlaybackState {
  currentTime: number;
  isPlaying: boolean;
}

interface PlaybackActions {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
}

/** Timeline length for the current editor state. */
export const getCurrentDuration = (): number => {
  const s = useEditorStore.getState();
  return getTimelineDuration(s.cells, countCells(s.layoutRoot));
};

export const usePlaybackStore = create<PlaybackState & PlaybackActions>()((set, get) => ({
  currentTime: 0,
  isPlaying: false,

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
}));
