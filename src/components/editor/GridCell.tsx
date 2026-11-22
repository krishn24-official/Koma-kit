import { ArrowLeftRight } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { canReadClipboard, usePaste } from '@/hooks/usePaste';
import { useActiveItem } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import { useUiStore } from '@/store/useUiStore';
import type { PixelRect } from '@/types';
import { boxFadeCss } from '@/utils/background';
import { adjustFilter, fadeMaskStyle, outlineFilter } from '@/utils/pictureEffects';
import { formatTime } from '@/utils/timeline';
import { CellImageView } from './CellImageView';
import { CellVideoView } from './CellVideoView';
import { EmptyCell } from './EmptyCell';
import { MediaCropper } from './MediaCropper';

interface GridCellProps {
  index: number;
  rect: PixelRect;
  radius: number;
  /** Preview pixels per design unit. */
  unit: number;
}

export function GridCell({ index, rect, radius, unit }: GridCellProps) {
  const items = useEditorStore((s) => s.cells[index]);
  const item = useActiveItem(index);
  const isSelected = useEditorStore(
    (s) => s.selection?.kind === 'cell' && s.selection.index === index,
  );
  const swapSource = useEditorStore((s) => s.swapSource);
  const fade = useEditorStore((s) => s.boxFades[index]);
  const boxEffects = useEditorStore((s) => s.boxEffects[index]);
  const cropItemId = useUiStore((s) => (s.mediaCrop?.index === index ? s.mediaCrop.itemId : null));
  const cropItem = cropItemId ? (items?.find((it) => it.id === cropItemId) ?? null) : null;
  const select = useEditorStore((s) => s.select);
  const swapCells = useEditorStore((s) => s.swapCells);
  const { uploadToCell } = useMediaUpload();
  const { pasteFromClipboard } = usePaste();

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const isSwapTarget = swapSource !== null && swapSource !== index;
  const upcoming = !item && items?.[0] ? items[0] : null;

  const handlePointerDown = () => {
    if (swapSource !== null && swapSource !== index) {
      swapCells(swapSource, index);
      return;
    }
    select({ kind: 'cell', index });
  };

  const handleDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    void uploadToCell(index, Array.from(e.dataTransfer.files));
  };

  const showRing = isSelected || isDragOver || swapSource === index;
  const size = { width: rect.width, height: rect.height };
  // Effects apply to a box's picture (like the download), not while cropping it.
  const effects = item && !cropItem ? boxEffects : undefined;

  // Layers (outside in): glow/shadow → edge-fade mask + clip → picture colors.
  return (
    <div
      className="absolute"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        filter: effects ? outlineFilter(effects, unit) : undefined,
      }}
    >
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ borderRadius: radius, ...(effects ? fadeMaskStyle(effects.fade) : {}) }}
        onPointerDown={handlePointerDown}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {item && (
          <div
            className="absolute inset-0"
            style={{ filter: effects ? adjustFilter(effects.adjust) : undefined }}
          >
            {item.kind === 'video' && (
              <CellVideoView key={item.id} index={index} item={item} size={size} />
            )}
            {item.kind === 'image' && (
              <CellImageView key={item.id} index={index} item={item} size={size} />
            )}
          </div>
        )}
        {!item && (
          <EmptyCell
            compact={rect.width < 90 || rect.height < 70}
            highlighted={isDragOver}
            upcomingLabel={upcoming ? `Starts at ${formatTime(upcoming.start)}` : undefined}
            onClick={() => {
              // Cells with something scheduled later just get selected (pointer down).
              if (!isSwapTarget && !upcoming) inputRef.current?.click();
            }}
            onPaste={
              canReadClipboard() && !upcoming
                ? () => void pasteFromClipboard({ kind: 'cell', index })
                : undefined
            }
          />
        )}

        {cropItem && <MediaCropper item={cropItem} size={size} />}

        {fade && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: boxFadeCss(fade) }}
          />
        )}

        {isSwapTarget && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-brand-500/30 text-white">
            <ArrowLeftRight className="size-6 drop-shadow" aria-hidden />
          </div>
        )}

        {showRing && (
          <div
            className="pointer-events-none absolute inset-0 ring-2 ring-brand-500 ring-inset"
            style={{ borderRadius: radius }}
          />
        )}

        <HiddenFileInput ref={inputRef} multiple onFiles={(files) => uploadToCell(index, files)} />
      </div>
    </div>
  );
}
