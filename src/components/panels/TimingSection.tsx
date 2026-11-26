import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PanelSection } from '@/components/ui/PanelSection';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import { useTimelineDuration } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import type { CanvasElement, ElementTiming, ElementTransition } from '@/types';
import { cn } from '@/utils/cn';
import { DEFAULT_TIMING, TRANSITIONS } from '@/utils/elementTiming';
import { formatTime } from '@/utils/timeline';

/** How long a newly timed element shows by default (seconds). */
const DEFAULT_LENGTH = 3;

function TransitionPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ElementTransition;
  onChange: (value: ElementTransition) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm text-neutral-300">{label}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {TRANSITIONS.map(({ id, label: name }) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => onChange(id)}
            className={cn(
              'rounded-lg border px-2 py-1.5 text-xs transition-colors',
              value === id
                ? 'border-brand-500 bg-brand-500/10 text-white'
                : 'border-neutral-800 text-neutral-300 hover:border-neutral-600',
            )}
          >
            {name}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * When the element shows on the timeline (appear / disappear times, set from the
 * playhead) and how it comes and goes.
 */
export function TimingSection({ element }: { element: CanvasElement }) {
  const updateElement = useEditorStore((s) => s.updateElement);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const seek = usePlaybackStore((s) => s.seek);
  const duration = useTimelineDuration();
  const timing = element.timing;
  const set = (patch: Partial<ElementTiming> | null) =>
    updateElement(element.id, {
      timing: patch === null ? undefined : { ...(timing ?? DEFAULT_TIMING), ...patch },
    });

  const enable = (on: boolean) => {
    if (!on) return set(null);
    const from = currentTime;
    set({ ...DEFAULT_TIMING, from, until: from + DEFAULT_LENGTH });
  };

  return (
    <PanelSection title="Timing">
      <div className="space-y-4">
        <Toggle label="Show only at certain times" checked={Boolean(timing)} onChange={enable} />
        {timing && (
          <>
            <div className="space-y-2 text-sm text-neutral-300">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="tabular-nums hover:text-white"
                  title="Go there"
                  onClick={() => seek(timing.from)}
                >
                  Appears at <b className="text-white">{formatTime(timing.from)}</b>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<MapPin />}
                  onClick={() =>
                    set({
                      from: currentTime,
                      // Keep it showing for a moment if the end would come first.
                      until:
                        timing.until !== null && timing.until <= currentTime + 0.2
                          ? currentTime + DEFAULT_LENGTH
                          : timing.until,
                    })
                  }
                >
                  Here ({formatTime(currentTime)})
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="tabular-nums hover:text-white"
                  title="Go there"
                  onClick={() => timing.until !== null && seek(Math.max(0, timing.until - 0.05))}
                >
                  Disappears{' '}
                  <b className="text-white">
                    {timing.until === null ? 'at the end' : `at ${formatTime(timing.until)}`}
                  </b>
                </button>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<MapPin />}
                    disabled={currentTime <= timing.from + 0.2}
                    onClick={() => set({ until: currentTime })}
                  >
                    Here
                  </Button>
                  {timing.until !== null && duration > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => set({ until: null })}>
                      To end
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <TransitionPicker
              label="Comes in with"
              value={timing.enter}
              onChange={(enter) => set({ enter })}
            />
            <TransitionPicker
              label="Goes out with"
              value={timing.exit}
              onChange={(exit) => set({ exit })}
            />
            <Slider
              label="Effect length"
              min={0.1}
              max={1.5}
              step={0.1}
              value={timing.duration}
              onChange={(d) => set({ duration: d })}
              formatValue={(v) => `${v.toFixed(1)} s`}
            />
            <Toggle
              label="Slow zoom while shown"
              checked={timing.slowZoom}
              onChange={(slowZoom) => set({ slowZoom })}
            />
          </>
        )}
      </div>
    </PanelSection>
  );
}
