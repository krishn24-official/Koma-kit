import {
  ArrowLeftRight,
  Expand,
  ImagePlus,
  RefreshCw,
  Shrink,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { IconButton } from '@/components/ui/IconButton';
import { Slider } from '@/components/ui/Slider';
import { DEFAULT_TRANSFORM } from '@/constants/editor';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useDesignCellRects } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import type { ImageTransform } from '@/types';
import {
  clampTransform,
  getFitTransform,
  getImageSize,
  getZoomBounds,
} from '@/utils/imageTransform';
import { clamp } from '@/utils/math';

function Hint({ children }: { children: ReactNode }) {
  return <p className="text-center text-xs text-neutral-400 sm:text-sm">{children}</p>;
}

function CellControls({ index }: { index: number }) {
  const image = useEditorStore((s) => s.images[index]);
  const cellRect = useDesignCellRects()[index];
  const updateCellTransform = useEditorStore((s) => s.updateCellTransform);
  const removeCellImage = useEditorStore((s) => s.removeCellImage);
  const startSwap = useEditorStore((s) => s.startSwap);
  const { uploadToCell } = useImageUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  const fileInput = (
    <HiddenFileInput ref={inputRef} onFiles={(files) => uploadToCell(index, files)} />
  );

  if (!image || !cellRect) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-400">Cell {index + 1} is empty</span>
        <Button
          variant="primary"
          size="sm"
          icon={<ImagePlus />}
          onClick={() => inputRef.current?.click()}
        >
          Upload image
        </Button>
        {fileInput}
      </div>
    );
  }

  const imageSize = getImageSize(image);
  const bounds = getZoomBounds(imageSize, cellRect);
  const setTransform = (transform: ImageTransform) =>
    updateCellTransform(index, clampTransform(transform, imageSize, cellRect));

  return (
    <div className="flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex flex-1 items-center gap-2 text-neutral-400">
        <ZoomOut className="size-4 shrink-0" aria-hidden />
        <Slider
          label="Zoom"
          hideLabel
          min={bounds.min}
          max={bounds.max}
          step={0.01}
          value={clamp(image.transform.scale, bounds.min, bounds.max)}
          onChange={(scale) => setTransform({ ...image.transform, scale })}
          formatValue={(v) => `${Math.round(v * 100)}%`}
        />
        <ZoomIn className="size-4 shrink-0" aria-hidden />
        <span className="w-11 shrink-0 text-right text-xs tabular-nums">
          {Math.round(image.transform.scale * 100)}%
        </span>
      </div>

      <div className="flex items-center justify-center gap-1">
        <IconButton
          label="Fit whole image"
          icon={<Shrink />}
          onClick={() => setTransform(getFitTransform(imageSize, cellRect))}
        />
        <IconButton
          label="Fill cell"
          icon={<Expand />}
          onClick={() => setTransform(DEFAULT_TRANSFORM)}
        />
        <IconButton
          label="Replace image"
          icon={<RefreshCw />}
          onClick={() => inputRef.current?.click()}
        />
        <IconButton
          label="Swap with another cell"
          icon={<ArrowLeftRight />}
          onClick={() => startSwap(index)}
        />
        <IconButton
          label="Remove image"
          variant="danger"
          icon={<Trash2 />}
          onClick={() => removeCellImage(index)}
        />
        {fileInput}
      </div>
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
      <Hint>Tap a cell to add an image · Drag to reposition · Scroll or pinch to zoom</Hint>
    );
  }

  return (
    <div className="flex min-h-16 shrink-0 items-center justify-center border-t border-neutral-800 bg-neutral-900/60 px-3 py-2">
      {content}
    </div>
  );
}
