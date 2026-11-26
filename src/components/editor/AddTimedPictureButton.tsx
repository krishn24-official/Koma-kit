import { ImagePlus } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { useAddTimedPicture } from '@/hooks/useStickerUpload';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { formatTime } from '@/utils/timeline';

/**
 * "Add picture at 0:05.3": puts a picture on the pictures line at the playhead, shown
 * until the next picture (like "Show new at" for boxes).
 */
export function AddTimedPictureButton() {
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const add = useAddTimedPicture();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        size="sm"
        icon={<ImagePlus />}
        title="A picture on top of the video from this moment until the next picture"
        onClick={() => inputRef.current?.click()}
      >
        Add picture at {formatTime(currentTime)}
      </Button>
      <HiddenFileInput ref={inputRef} accept="image/*" multiple onFiles={(f) => void add(f)} />
    </>
  );
}
