import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PanelSection } from '@/components/ui/PanelSection';
import { Slider } from '@/components/ui/Slider';
import { TimeInput } from '@/components/ui/TimeInput';
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

  /** Typed or picked start: keeps it showing for a moment if the end would come first. */
  const setFrom = (value: number) => {
    if (!timing) return;
    const from = Math.max(0, value);
    const until =
      timing.until !== null && timing.until <= from + 0.2 ? from + DEFAULT_LENGTH : timing.until;
    set({ from, until });
  };
  /** Typed or picked end (null = until the end); never before the start. */
  const setUntil = (value: number | null) => {
    if (!timing) return;
    set({ until: value === null ? null : Math.max(timing.from + 0.2, value) });
  };

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
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <TimeInput
                  label="Appears at"
                  value={timing.from}
                  onChange={(v) => setFrom(v ?? 0)}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<MapPin />}
                  title="Use the playhead"
                  onClick={() => setFrom(currentTime)}
                >
                  Here
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <TimeInput
                  label="Disappears at"
                  value={timing.until}
                  emptyText="end"
                  onChange={setUntil}
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<MapPin />}
                    title="Use the playhead"
                    disabled={currentTime <= timing.from + 0.2}
                    onClick={() => setUntil(currentTime)}
                  >
                    Here
                  </Button>
                  {timing.until !== null && duration > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setUntil(null)}>
                      To end
                    </Button>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-neutral-500 hover:text-neutral-300"
                onClick={() => seek(timing.from)}
              >
                Go to where it appears ({formatTime(timing.from)})
              </button>
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
