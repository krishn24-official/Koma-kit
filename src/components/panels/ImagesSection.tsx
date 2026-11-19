import { ImagePlus } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { PanelSection } from '@/components/ui/PanelSection';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useCurrentLayout, useFilledCellCount } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';

export function ImagesSection() {
  const cellCount = useCurrentLayout().cells.length;
  const filled = useFilledCellCount();
  const hasAnyImage = useEditorStore((s) => Object.keys(s.images).length > 0);
  const clearImages = useEditorStore((s) => s.clearImages);
  const { uploadMany } = useImageUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <PanelSection
      title="Images"
      action={
        hasAnyImage && (
          <Button variant="ghost" size="sm" onClick={clearImages}>
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
        {filled >= cellCount ? 'All cells filled' : 'Add images'}
      </Button>
      <p className="mt-2 text-xs leading-relaxed text-neutral-400">
        <span className="font-medium text-neutral-200">
          {filled} / {cellCount}
        </span>{' '}
        cells filled. New images go into empty cells in order. You can also drop files onto
        the canvas.
      </p>
      <HiddenFileInput ref={inputRef} multiple onFiles={uploadMany} />
    </PanelSection>
  );
}
