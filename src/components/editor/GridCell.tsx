import { ArrowLeftRight } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useEditorStore } from '@/store/useEditorStore';
import type { PixelRect } from '@/types';
import { CellImageView } from './CellImageView';
import { EmptyCell } from './EmptyCell';

interface GridCellProps {
  index: number;
  rect: PixelRect;
  radius: number;
}

export function GridCell({ index, rect, radius }: GridCellProps) {
  const image = useEditorStore((s) => s.images[index]);
  const isSelected = useEditorStore(
    (s) => s.selection?.kind === 'cell' && s.selection.index === index,
  );
  const swapSource = useEditorStore((s) => s.swapSource);
  const select = useEditorStore((s) => s.select);
  const swapCells = useEditorStore((s) => s.swapCells);
  const { uploadToCell } = useImageUpload();

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const isSwapTarget = swapSource !== null && swapSource !== index;

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

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        borderRadius: radius,
      }}
      onPointerDown={handlePointerDown}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {image ? (
        <CellImageView index={index} image={image} size={rect} />
      ) : (
        <EmptyCell
          compact={rect.width < 90 || rect.height < 70}
          highlighted={isDragOver}
          onClick={() => {
            if (!isSwapTarget) inputRef.current?.click();
          }}
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
  );
}
