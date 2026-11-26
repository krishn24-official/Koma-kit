import { Film, Image, Type } from 'lucide-react';
import { useCurrentLayout } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import type { CanvasElement } from '@/types';
import { cn } from '@/utils/cn';
import { formatTime } from '@/utils/timeline';

const pct = (value: number) => `${value * 100}%`;

/**
 * One row per cell that has media, showing when each item is on screen.
 * Tap a block to jump to its start and select its cell.
 */
export function TimelineTracks({ duration }: { duration: number }) {
  const cells = useEditorStore((s) => s.cells);
  const selectedIndex = useEditorStore((s) =>
    s.selection?.kind === 'cell' ? s.selection.index : null,
  );
  const select = useEditorStore((s) => s.select);
  const cellCount = useCurrentLayout().cells.length;
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const seek = usePlaybackStore((s) => s.seek);

  const elements = useEditorStore((s) => s.elements);
  const selectedElement = useEditorStore((s) =>
    s.selection?.kind === 'element' ? s.selection.id : null,
  );
  // Pictures / text shown at certain times, one row each.
  const byStart = (a: CanvasElement, b: CanvasElement) => a.timing!.from - b.timing!.from;
  const timed = elements.filter((el) => el.timing && !el.hidden).sort(byStart);
  // One line for all timed pictures, one for timed text and badges.
  const lines = [
    { key: 'P', title: 'Pictures', items: timed.filter((el) => el.type === 'sticker') },
    { key: 'T', title: 'Text', items: timed.filter((el) => el.type !== 'sticker') },
  ].filter((line) => line.items.length > 0);

  const rows = Array.from({ length: cellCount }, (_, index) => ({
    index,
    items: cells[index] ?? [],
  })).filter((row) => row.items.length > 0);

  return (
    <div className="max-h-28 space-y-1 overflow-y-auto overscroll-contain">
      {rows.map(({ index, items }) => (
        <div key={index} className="flex items-center gap-2">
          <span className="w-4 shrink-0 text-right text-[10px] text-neutral-500 tabular-nums">
            {index + 1}
          </span>
          <div
            className={cn(
              'relative h-6 flex-1 rounded bg-neutral-800/60',
              selectedIndex === index && 'ring-1 ring-brand-500/70',
            )}
          >
            {items.map((item, i) => {
              const end = Math.min(items[i + 1]?.start ?? duration, duration);
              const Icon = item.kind === 'video' ? Film : Image;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={`${item.fileName} · from ${formatTime(item.start)}`}
                  onClick={() => {
                    seek(item.start);
                    select({ kind: 'cell', index });
                  }}
                  className={cn(
                    'absolute inset-y-0.5 flex items-center gap-1 overflow-hidden rounded-sm border-l-2 px-1 text-[10px] whitespace-nowrap',
                    item.kind === 'video'
                      ? 'border-brand-400 bg-brand-500/35 text-brand-100'
                      : 'border-sky-300 bg-sky-500/25 text-sky-100',
                  )}
                  style={{
                    left: pct(item.start / duration),
                    width: pct(Math.max(0, end - item.start) / duration),
                  }}
                >
                  <Icon className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">{item.fileName}</span>
                </button>
              );
            })}
            <div
              className="pointer-events-none absolute -inset-y-0.5 w-0.5 bg-white"
              style={{ left: pct(Math.min(1, currentTime / duration)) }}
            />
          </div>
        </div>
      ))}
      {lines.map((line) => (
        <div key={line.key} className="flex items-center gap-2">
          <span
            className="w-4 shrink-0 text-right text-[10px] text-amber-300/80"
            title={line.title}
          >
            {line.key}
          </span>
          <div
            className={cn(
              'relative h-6 flex-1 rounded bg-neutral-800/60',
              line.items.some((el) => el.id === selectedElement) && 'ring-1 ring-brand-500/70',
            )}
          >
            {line.items.map((el) => {
              const timing = el.timing!;
              const until = Math.min(timing.until ?? duration, duration);
              const Icon = el.type === 'sticker' ? Image : Type;
              const name =
                el.type === 'sticker'
                  ? (el.file?.name ?? el.label)
                  : el.text.split(String.fromCharCode(10))[0] || 'Text';
              return (
                <button
                  key={el.id}
                  type="button"
                  title={`${name} · ${formatTime(timing.from)}–${timing.until === null ? 'end' : formatTime(timing.until)}`}
                  onClick={() => {
                    seek(timing.from);
                    select({ kind: 'element', id: el.id });
                  }}
                  className={cn(
                    'absolute inset-y-0.5 flex items-center gap-1 overflow-hidden rounded-sm border-l-2 px-1 text-[10px] whitespace-nowrap',
                    el.id === selectedElement
                      ? 'border-white bg-amber-500/60 text-white'
                      : 'border-amber-300 bg-amber-500/25 text-amber-100',
                  )}
                  style={{
                    left: pct(Math.min(1, timing.from / duration)),
                    width: pct(Math.max(0, until - timing.from) / duration),
                  }}
                >
                  <Icon className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">{name}</span>
                </button>
              );
            })}
            <div
              className="pointer-events-none absolute -inset-y-0.5 w-0.5 bg-white"
              style={{ left: pct(Math.min(1, currentTime / duration)) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
