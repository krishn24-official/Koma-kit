import { forwardRef } from 'react';
import { ACCEPTED_MEDIA } from '@/utils/media';

interface HiddenFileInputProps {
  multiple?: boolean;
  /** Defaults to images and videos. */
  accept?: string;
  onFiles: (files: File[]) => void;
}

/** Hidden file picker. Open it with `ref.current?.click()`. */
export const HiddenFileInput = forwardRef<HTMLInputElement, HiddenFileInputProps>(
  function HiddenFileInput({ multiple = false, accept = ACCEPTED_MEDIA, onFiles }, ref) {
    return (
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = ''; // allow picking the same file again
          if (files.length > 0) onFiles(files);
        }}
      />
    );
  },
);
