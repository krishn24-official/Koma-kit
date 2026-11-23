import { ImagePlus } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { useStickerUpload } from '@/hooks/useStickerUpload';
import { useUiStore } from '@/store/useUiStore';

/**
 * Picks a picture and adds it as a logo in the middle of the canvas, then shows its
 * settings (shape, zoom, crop, size) in the Elements tab.
 */
export function AddLogoButton({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadSticker = useStickerUpload();

  return (
    <>
      <Button size={size} icon={<ImagePlus />} onClick={() => inputRef.current?.click()}>
        Add logo
      </Button>
      <HiddenFileInput
        ref={inputRef}
        accept="image/*"
        onFiles={async (files) => {
          await uploadSticker(null, files, 'Logo');
          useUiStore.getState().setActivePanel('elements');
        }}
      />
    </>
  );
}
