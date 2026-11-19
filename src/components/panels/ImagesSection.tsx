import { ImagePlus } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { PanelSection } from '@/components/ui/PanelSection';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useCurrentLayout, useFilledCellCount } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';

export function ImagesSection() {
  const cellCount = useCurrentLayout().cells.length;
  const filled = useFilledCellCount();
  const hasAnyMedia = useEditorStore((s) => Object.keys(s.cells).length > 0);
  const clearMedia = useEditorStore((s) => s.clearMedia);
  const { uploadMany } = useMediaUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <PanelSection
      title="Images & videos"
      action={
        hasAnyMedia && (
          <Button variant="ghost" size="sm" onClick={clearMedia}>
            Clear all
          </Button>
        )
      }
    >
      <Button
        variant="primary"
        fullWidth
        icon={<ImagePlus />}
        disabled={filled >= cellCount}
        onClick={() => inputRef.current?.click()}
      >
        {filled >= cellCount ? 'All cells filled' : 'Add images or videos'}
      </Button>
      <p className="mt-2 text-xs leading-relaxed text-neutral-400">
        <span className="font-medium text-neutral-200">
          {filled} / {cellCount}
        </span>{' '}
        cells filled. New files go into empty cells in order. You can also drop files onto the
        canvas. To change a cell's picture partway through a video, select the cell and use{' '}
        <span className="text-neutral-200">Show new at…</span> under the canvas.
      </p>
      <HiddenFileInput ref={inputRef} multiple onFiles={uploadMany} />
    </PanelSection>
  );
}
