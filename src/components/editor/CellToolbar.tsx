import {
  ClipboardPaste,
  ArrowLeftRight,
  CalendarClock,
  Check,
  Crop as CropIcon,
  Expand,
  ImageMinus,
  ImagePlus,
  ListVideo,
  LogIn,
  LogOut,
  MapPin,
  PenTool,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  Scan,
  Scissors,
  Shrink,
  SquarePlus,
  Trash2,
  Undo2,
  Volume2,
  VolumeX,
  ZoomIn,
  X,
  ZoomOut,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { AddLogoButton } from './AddLogoButton';
import { AddTimedPictureButton } from './AddTimedPictureButton';
import { TrimEditor } from './TrimEditor';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { IconButton } from '@/components/ui/IconButton';
import { Slider } from '@/components/ui/Slider';
import { DEFAULT_TRANSFORM } from '@/constants/editor';
import { useCrop } from '@/hooks/useCrop';
import { useFitToPictures } from '@/hooks/useFitToPictures';
import { undoLastDraw, useCanUndoDraw, useFrameDraw } from '@/hooks/useFrameDraw';
import { isPiece, useCutoutActions } from '@/hooks/useCutoutActions';
import { useMediaCrop } from '@/hooks/useMediaCrop';
import { useStickerCrop } from '@/hooks/useStickerCrop';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { canReadClipboard, usePaste, type PasteTarget } from '@/hooks/usePaste';
import {
  useActiveItem,
  useCurrentLayout,
  useDesignCellRects,
  useTimelineDuration,
} from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useUiStore } from '@/store/useUiStore';
import type { CellMedia, ImageTransform, PixelRect } from '@/types';

/** Pastes a copied picture (shown only where the browser can read the clipboard). */
function PasteButton({
  target,
  label,
  withText = false,
}: {
  target: PasteTarget;
  label: string;
  withText?: boolean;
}) {
  const { pasteFromClipboard } = usePaste();
  if (!canReadClipboard()) return null;
  return withText ? (
    <Button size="sm" icon={<ClipboardPaste />} onClick={() => void pasteFromClipboard(target)}>
      {label}
    </Button>
  ) : (
    <IconButton
      label={label}
      icon={<ClipboardPaste />}
      onClick={() => void pasteFromClipboard(target)}
    />
  );
}

/**
 * Times the selected element from the playhead: "from" makes it appear here (and show
 * for 3 s if it had no timing), "until" makes it disappear here.
 */
function setElementTime(id: string, which: 'from' | 'until') {
  const store = useEditorStore.getState();
  const el = store.elements.find((e) => e.id === id);
  if (!el) return;
  const now = usePlaybackStore.getState().currentTime;
  const timing = el.timing ?? { ...DEFAULT_TIMING, from: 0, until: null };
  if (which === 'from') {
    const until =
      !el.timing || (timing.until !== null && timing.until <= now + 0.2) ? now + 3 : timing.until;
    store.updateElement(id, { timing: { ...timing, from: now, until } });
  } else {
    if (now <= timing.from + 0.2) {
      useUiStore.getState().showToast('Move the playhead after where it appears', 'info');
      return;
    }
    store.updateElement(id, { timing: { ...timing, until: now } });
  }
}

/** Zooms a logo/picture inside its frame (see zoomSticker). */
function zoomSelectedSticker(id: string, factor: number) {
  const store = useEditorStore.getState();
  const el = store.elements.find((e) => e.id === id);
  if (el?.type === 'sticker' && el.src) store.updateElement(id, zoomSticker(el, factor));
}
import {
  clampTransform,
  getFitTransform,
  getImageSize,
  getZoomBounds,
} from '@/utils/imageTransform';
import { hasBars } from '@/utils/detectBars';
import { clamp } from '@/utils/math';
import { zoomSticker } from '@/utils/stickerShape';
import { DEFAULT_TIMING } from '@/utils/elementTiming';
import { formatTime, getPlayLength, getPlayStart } from '@/utils/timeline';

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
  const setItemMuted = useEditorStore((s) => s.setItemMuted);
  const { replaceInCell } = useMediaUpload();
  const { start: startMediaCrop } = useMediaCrop();
  const { start: startDraw } = useFrameDraw();
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
            label={item.muted ? 'Turn sound on' : 'Mute this clip'}
            variant={item.muted ? 'ghost' : 'secondary'}
            icon={item.muted ? <VolumeX /> : <Volume2 />}
            onClick={() => setItemMuted(index, item.id, !item.muted)}
          />
        )}
        <IconButton
          label={item.kind === 'video' ? 'Crop this clip' : 'Crop this picture'}
          icon={<CropIcon />}
          onClick={() => startMediaCrop(index, item.id)}
        />
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
        <IconButton
          label="Replace"
          icon={<RefreshCw />}
          onClick={() => inputRef.current?.click()}
        />
        <PasteButton target={{ kind: 'cell', index }} label="Paste to replace" />
        {item.kind === 'image' && (
          <IconButton
            label="Cut out (draw around the part to keep)"
            icon={<PenTool />}
            onClick={() => startDraw({ kind: 'cell', index, itemId: item.id })}
          />
        )}
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
      {!hasScheduled && <PasteButton target={{ kind: 'cell', index }} label="Paste" withText />}
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
      <AddTimedPictureButton />
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

/** Cut a video at the playhead: drop everything after (end) or before (start) it. */
/**
 * A clip's play settings: Trim (opens the trim editor), Loop, and which part plays.
 */
function TrimControls({
  index,
  item,
  editing,
  setEditing,
}: {
  index: number;
  item: CellMedia;
  /** The trim editor is open (owned by CellControls, which hides other rows meanwhile). */
  editing: boolean;
  setEditing: (editing: boolean) => void;
}) {
  const tenth = (t: number) => formatTime(Math.round(t * 10) / 10 + 1e-6);
  const setItemTrim = useEditorStore((s) => s.setItemTrim);
  const setItemLoop = useEditorStore((s) => s.setItemLoop);
  const isTrimmed = item.trimStart > 0.01 || item.trimEnd < item.duration - 0.01;

  if (editing) return <TrimEditor index={index} item={item} onClose={() => setEditing(false)} />;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-t border-neutral-800 pt-2">
      <Button size="sm" icon={<Scissors />} onClick={() => setEditing(true)}>
        Trim
      </Button>
      <Button
        size="sm"
        variant={item.loop ? 'primary' : 'ghost'}
        icon={<Repeat />}
        aria-pressed={Boolean(item.loop)}
        title="Repeat the clip until the next item in this box or the end of the video"
        onClick={() => setItemLoop(index, item.id, !item.loop)}
      >
        Loop
      </Button>
      <span className="text-xs text-neutral-400 tabular-nums">
        {isTrimmed
          ? `Plays ${tenth(item.trimStart)}–${tenth(item.trimEnd)} of ${tenth(item.duration)}`
          : `Plays the whole clip (${tenth(item.duration)})`}
        {item.loop ? ' · loops' : ''}
      </span>
      {isTrimmed && (
        <Button
          size="sm"
          variant="ghost"
          icon={<Undo2 />}
          onClick={() => setItemTrim(index, item.id, { trimStart: 0, trimEnd: item.duration })}
        >
          Undo trim
        </Button>
      )}
    </div>
  );
}

/**
 * When a video starts playing. It stays on its first frame until then, e.g. to play
 * after the clip in another box ends.
 */
function DelayControls({ index, item }: { index: number; item: CellMedia }) {
  const cellCount = useCurrentLayout().cells.length;
  const cells = useEditorStore((s) => s.cells);
  const setItemDelay = useEditorStore((s) => s.setItemDelay);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const playStart = getPlayStart(item);

  // The latest moment a video in each other box finishes.
  const otherBoxes: Array<{ box: number; end: number }> = [];
  for (let i = 0; i < cellCount; i++) {
    if (i === index) continue;
    const ends = (cells[i] ?? [])
      .filter((other) => other.kind === 'video')
      .map((other) => getPlayStart(other) + getPlayLength(other));
    if (ends.length > 0) otherBoxes.push({ box: i, end: Math.max(...ends) });
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-t border-neutral-800 pt-2">
      {otherBoxes.map(({ box, end }) => (
        <Button
          key={box}
          size="sm"
          icon={<ListVideo />}
          title={`Wait on the first frame, then play when box ${box + 1}'s video ends`}
          onClick={() => setItemDelay(index, item.id, end - item.start)}
        >
          Play after box {box + 1}
        </Button>
      ))}
      <Button
        size="sm"
        variant="ghost"
        icon={<Play />}
        disabled={currentTime <= item.start + 0.05}
        onClick={() => setItemDelay(index, item.id, currentTime - item.start)}
      >
        Play from {formatTime(currentTime)}
      </Button>
      {item.delay > 0 && (
        <>
          <span className="text-xs text-neutral-400 tabular-nums">
            Plays at {formatTime(playStart)}
          </span>
          <Button
            size="sm"
            variant="ghost"
            icon={<Undo2 />}
            onClick={() => setItemDelay(index, item.id, 0)}
          >
            Play right away
          </Button>
        </>
      )}
    </div>
  );
}

function CellControls({ index }: { index: number }) {
  const item = useActiveItem(index);
  const cellRect = useDesignCellRects()[index];
  const hasTimeline = useTimelineDuration() > 0;
  const [trimming, setTrimming] = useState(false);

  return (
    <div className="flex w-full max-w-3xl flex-col gap-2">
      {item && cellRect ? (
        <MediaControls index={index} item={item} cellRect={cellRect} />
      ) : (
        <EmptyCellControls index={index} />
      )}
      {item?.kind === 'video' && (
        <TrimControls index={index} item={item} editing={trimming} setEditing={setTrimming} />
      )}
      {/* While trimming, the other clip rows step aside (more room on phones). */}
      {item?.kind === 'video' && !trimming && <DelayControls index={index} item={item} />}
      {hasTimeline && !trimming && <TimingControls index={index} item={item} />}
    </div>
  );
}

/** Context-aware controls shown under the canvas. */
export function CellToolbar() {
  const selection = useEditorStore((s) => s.selection);
  const swapSource = useEditorStore((s) => s.swapSource);
  const cancelSwap = useEditorStore((s) => s.cancelSwap);
  const removeElement = useEditorStore((s) => s.removeElement);
  const addLayer = useEditorStore((s) => s.addLayer);
  const fitToPictures = useFitToPictures();
  const isCropping = useUiStore((s) => s.cropRect !== null);
  const crop = useCrop();
  const stickerCrop = useStickerCrop();
  const mediaCrop = useMediaCrop();
  const mediaCropping = useUiStore((s) => s.mediaCrop !== null);
  const frameDraw = useUiStore((s) => s.frameDraw);
  const frameDrawing = useFrameDraw();
  const canRemoveBars = useUiStore((s) => Boolean(s.mediaCrop?.bars && hasBars(s.mediaCrop.bars)));
  const stickerCropping = useUiStore((s) => s.stickerCrop !== null);
  const selectedIsPicture = useEditorStore((s) => {
    const sel = s.selection;
    if (sel?.kind !== 'element') return false;
    const el = s.elements.find((e) => e.id === sel.id);
    return el?.type === 'sticker' && Boolean(el.src);
  });
  // A cut-out piece (for Remove original / Move to new box).
  const selectedPiece = useEditorStore((s) => {
    const sel = s.selection;
    if (sel?.kind !== 'element') return null;
    const el = s.elements.find((e) => e.id === sel.id);
    return el?.type === 'sticker' && isPiece(el) ? el : null;
  });
  const cutout = useCutoutActions();
  const canUndoDraw = useCanUndoDraw();
  const hasTimeline = useTimelineDuration() > 0;
  const selectedIsSticker = useEditorStore((s) => {
    const sel = s.selection;
    return (
      sel?.kind === 'element' && s.elements.some((e) => e.id === sel.id && e.type === 'sticker')
    );
  });

  let content: ReactNode;

  if (frameDraw) {
    content = (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <Hint>
          {frameDraw.target
            ? 'Draw around the part to keep: drag to trace, or tap corners, then Done'
            : 'Draw on a picture to take that part out, or on empty space for a frame · drag to trace, or tap corners, then Done'}
        </Hint>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={<Undo2 />}
            disabled={frameDraw.history.length === 0}
            onClick={frameDrawing.undo}
          >
            Undo
          </Button>
          <Button size="sm" icon={<X />} onClick={frameDrawing.cancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<Check />}
            disabled={frameDraw.points.length < 3}
            onClick={frameDrawing.finish}
          >
            Done
          </Button>
        </div>
      </div>
    );
  } else if (mediaCropping) {
    content = (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <Hint>Drag the frame's edges or corners to cut the picture.</Hint>
        <div className="flex flex-wrap justify-center gap-2">
          {canRemoveBars && (
            <Button size="sm" icon={<Scan />} onClick={mediaCrop.removeBars}>
              Remove black bars
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={mediaCrop.reset}>
            Reset
          </Button>
          <Button size="sm" onClick={mediaCrop.cancel}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" icon={<Check />} onClick={mediaCrop.apply}>
            Apply crop
          </Button>
        </div>
      </div>
    );
  } else if (stickerCropping) {
    content = (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <Hint>Drag the frame's edges or corners to cut the logo.</Hint>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={stickerCrop.reset}>
            Reset
          </Button>
          <Button size="sm" onClick={stickerCrop.cancel}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" icon={<Check />} onClick={stickerCrop.apply}>
            Apply crop
          </Button>
        </div>
      </div>
    );
  } else if (isCropping) {
    content = (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <Hint>Drag the edges or corners. They snap to your pictures.</Hint>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={crop.reset}>
            Reset
          </Button>
          <Button size="sm" onClick={crop.cancel}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" icon={<Check />} onClick={crop.apply}>
            Apply crop
          </Button>
        </div>
      </div>
    );
  } else if (swapSource !== null) {
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
  } else if (selection?.kind === 'element') {
    content = (
      <div className="flex items-center gap-3">
        <Hint>Drag to move. Drag a corner dot or pinch to resize.</Hint>
        {selectedIsSticker && (
          <PasteButton target={{ kind: 'sticker', id: selection.id }} label="Paste picture" />
        )}
        {selectedIsPicture && (
          <IconButton
            label="Cut out (draw around the part to keep)"
            icon={<PenTool />}
            onClick={() => frameDrawing.start({ kind: 'element', id: selection.id })}
          />
        )}
        <IconButton
          label="Appear here (from the playhead)"
          icon={<LogIn />}
          onClick={() => setElementTime(selection.id, 'from')}
        />
        <IconButton
          label="Disappear here (at the playhead)"
          icon={<LogOut />}
          onClick={() => setElementTime(selection.id, 'until')}
        />
        {canUndoDraw && <IconButton label="Undo cut" icon={<Undo2 />} onClick={undoLastDraw} />}
        {selectedPiece?.cutFrom && (
          <IconButton
            label="Remove original picture"
            icon={<ImageMinus />}
            onClick={() => cutout.removeOriginal(selectedPiece)}
          />
        )}
        {selectedPiece && (
          <IconButton
            label="Move to new box"
            icon={<SquarePlus />}
            onClick={() => void cutout.moveToNewBox(selectedPiece)}
          />
        )}
        {selectedIsPicture && (
          <>
            <IconButton
              label="Zoom out"
              icon={<ZoomOut />}
              onClick={() => zoomSelectedSticker(selection.id, 1 / 1.15)}
            />
            <IconButton
              label="Zoom in"
              icon={<ZoomIn />}
              onClick={() => zoomSelectedSticker(selection.id, 1.15)}
            />
            <Button size="sm" icon={<CropIcon />} onClick={() => stickerCrop.start(selection.id)}>
              Crop
            </Button>
          </>
        )}
        <IconButton
          label="Delete"
          variant="danger"
          icon={<Trash2 />}
          onClick={() => removeElement(selection.id)}
        />
      </div>
    );
  } else {
    content = (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Hint>Tap a box to add a picture · Drag a line to resize, tap it to tilt</Hint>
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" icon={<Plus />} onClick={addLayer}>
            Add layer
          </Button>
          <AddLogoButton />
          {hasTimeline && <AddTimedPictureButton />}
          <Button size="sm" icon={<CropIcon />} onClick={crop.start}>
            Crop
          </Button>
          <Button size="sm" icon={<Scan />} onClick={fitToPictures}>
            Fit to pictures
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-16 shrink-0 items-center justify-center border-t border-neutral-800 bg-neutral-900/60 px-3 py-2">
      {content}
    </div>
  );
}
