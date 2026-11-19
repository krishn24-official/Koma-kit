import {
  ArrowLeftRight,
  CalendarClock,
  Expand,
  ImagePlus,
  MapPin,
  RefreshCw,
  Shrink,
  Trash2,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { IconButton } from '@/components/ui/IconButton';
import { Slider } from '@/components/ui/Slider';
import { DEFAULT_TRANSFORM } from '@/constants/editor';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useActiveItem, useDesignCellRects, useTimelineDuration } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import type { CellMedia, ImageTransform, PixelRect } from '@/types';
import {
  clampTransform,
  getFitTransform,
  getImageSize,
  getZoomBounds,
} from '@/utils/imageTransform';
import { clamp } from '@/utils/math';
import { formatTime } from '@/utils/timeline';

const ZOOM_STEP = 1.1;

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-center text-xs text-neutral-400 sm:text-sm">{children}</p>;
}

interface MediaControlsProps {
  index: number;
  item: CellMedia;
  cellRect: PixelRect;
}

/** Zoom, fit/fill, audio, replace, swap and remove for the item a cell is showing. */
function MediaControls({ index, item, cellRect }: MediaControlsProps) {
  const updateItemTransform = useEditorStore((s) => s.updateItemTransform);
  const removeItem = useEditorStore((s) => s.removeItem);
  const startSwap = useEditorStore((s) => s.startSwap);
  const isAudioSource = useEditorStore((s) => s.audioSourceId === item.id);
  const setAudioSource = useEditorStore((s) => s.setAudioSource);
  const { replaceInCell } = useMediaUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  const mediaSize = getImageSize(item);
  const bounds = getZoomBounds(mediaSize, cellRect);
  const scale = clamp(item.transform.scale, bounds.min, bounds.max);
  const setTransform = (transform: ImageTransform) =>
    updateItemTransform(index, item.id, clampTransform(transform, mediaSize, cellRect));
  const zoomTo = (next: number) => setTransform({ ...item.transform, scale: next });

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex flex-1 items-center gap-1">
        <IconButton
          label="Zoom out"
          icon={<ZoomOut />}
          disabled={scale <= bounds.min + 1e-3}
          onClick={() => zoomTo(scale / ZOOM_STEP)}
        />
        <Slider
          label="Zoom"
          hideLabel
          min={bounds.min}
          max={bounds.max}
          step={0.01}
          value={scale}
          onChange={zoomTo}
          formatValue={(v) => `${Math.round(v * 100)}%`}
        />
        <IconButton
          label="Zoom in"
          icon={<ZoomIn />}
          disabled={scale >= bounds.max - 1e-3}
          onClick={() => zoomTo(scale * ZOOM_STEP)}
        />
        <span className="w-11 shrink-0 text-right text-xs text-neutral-400 tabular-nums">
          {Math.round(scale * 100)}%
        </span>
      </div>

      <div className="flex items-center justify-center gap-1">
        {item.kind === 'video' && (
          <IconButton
            label={isAudioSource ? 'Mute this video' : "Use this video's sound"}
            variant={isAudioSource ? 'secondary' : 'ghost'}
            icon={isAudioSource ? <Volume2 /> : <VolumeX />}
            onClick={() => setAudioSource(isAudioSource ? null : item.id)}
          />
        )}
        <IconButton
          label="Fit whole picture"
          icon={<Shrink />}
          onClick={() => setTransform(getFitTransform(mediaSize, cellRect))}
        />
        <IconButton
          label="Fill cell"
          icon={<Expand />}
          onClick={() => setTransform(DEFAULT_TRANSFORM)}
        />
        <IconButton label="Replace" icon={<RefreshCw />} onClick={() => inputRef.current?.click()} />
        <IconButton
          label="Swap with another cell"
          icon={<ArrowLeftRight />}
          onClick={() => startSwap(index)}
        />
        <IconButton
          label="Remove"
          variant="danger"
          icon={<Trash2 />}
          onClick={() => removeItem(index, item.id)}
        />
        <HiddenFileInput ref={inputRef} onFiles={(files) => replaceInCell(index, item.id, files)} />
      </div>
    </div>
  );
}

function EmptyCellControls({ index }: { index: number }) {
  const hasScheduled = useEditorStore((s) => (s.cells[index]?.length ?? 0) > 0);
  const { uploadToCell, addToCellAt } = useMediaUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  // A cell with media scheduled later keeps it; the new file is added at the playhead.
  const handleFiles = (files: File[]) =>
    hasScheduled
      ? addToCellAt(index, usePlaybackStore.getState().currentTime, files)
      : uploadToCell(index, files);

  return (
    <div className="flex items-center justify-center gap-3">
      <span className="text-sm text-neutral-400">Cell {index + 1} is empty here</span>
      <Button
        variant="primary"
        size="sm"
        icon={<ImagePlus />}
        onClick={() => inputRef.current?.click()}
      >
        Add media
      </Button>
      <HiddenFileInput ref={inputRef} onFiles={handleFiles} />
    </div>
  );
}

/** Scheduling: add media at the playhead, or move the current item's start. */
function TimingControls({ index, item }: { index: number; item: CellMedia | null }) {
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const setItemStart = useEditorStore((s) => s.setItemStart);
  const { addToCellAt } = useMediaUpload();
  const inputRef = useRef<HTMLInputElement>(null);
  const now = formatTime(currentTime);
  const startsNow = item ? Math.abs(item.start - currentTime) < 0.05 : false;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-t border-neutral-800 pt-2">
      <Button
        size="sm"
        icon={<CalendarClock />}
        onClick={() => inputRef.current?.click()}
        title="The new image or video appears in this cell from this moment"
      >
        Show new at {now}
      </Button>
      {item && (
        <>
          <span className="text-xs text-neutral-400 tabular-nums">
            Current starts {formatTime(item.start)}
          </span>
          <Button
            size="sm"
            variant="ghost"
            icon={<MapPin />}
            disabled={startsNow}
            onClick={() => setItemStart(index, item.id, currentTime)}
          >
            Start at {now}
          </Button>
        </>
      )}
      <HiddenFileInput
        ref={inputRef}
        onFiles={(files) => addToCellAt(index, usePlaybackStore.getState().currentTime, files)}
      />
    </div>
  );
}

function CellControls({ index }: { index: number }) {
  const item = useActiveItem(index);
  const cellRect = useDesignCellRects()[index];
  const hasTimeline = useTimelineDuration() > 0;

  return (
    <div className="flex w-full max-w-3xl flex-col gap-2">
      {item && cellRect ? (
        <MediaControls index={index} item={item} cellRect={cellRect} />
      ) : (
        <EmptyCellControls index={index} />
      )}
      {hasTimeline && <TimingControls index={index} item={item} />}
    </div>
  );
}

/** Context-aware controls shown under the canvas. */
export function CellToolbar() {
  const selection = useEditorStore((s) => s.selection);
  const swapSource = useEditorStore((s) => s.swapSource);
  const cancelSwap = useEditorStore((s) => s.cancelSwap);
  const removeText = useEditorStore((s) => s.removeText);

  let content: ReactNode;

  if (swapSource !== null) {
    content = (
      <div className="flex items-center gap-3">
        <Hint>Tap another cell to swap with cell {swapSource + 1}</Hint>
        <Button size="sm" onClick={cancelSwap}>
          Cancel
        </Button>
      </div>
    );
  } else if (selection?.kind === 'cell') {
    content = <CellControls key={selection.index} index={selection.index} />;
  } else if (selection?.kind === 'text') {
    content = (
      <div className="flex items-center gap-3">
        <Hint>Drag to move. Edit the text in the Text panel.</Hint>
        <IconButton
          label="Delete text"
          variant="danger"
          icon={<Trash2 />}
          onClick={() => removeText(selection.id)}
        />
      </div>
    );
  } else {
    content = (
      <Hint>Tap a cell to add an image or video · Drag to reposition · Scroll or pinch to zoom</Hint>
    );
  }

  return (
    <div className="flex min-h-16 shrink-0 items-center justify-center border-t border-neutral-800 bg-neutral-900/60 px-3 py-2">
      {content}
    </div>
  );
}
