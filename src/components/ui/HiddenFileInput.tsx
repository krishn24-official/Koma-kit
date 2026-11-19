import { forwardRef } from 'react';

interface HiddenFileInputProps {
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}

/** Hidden image picker. Open it with `ref.current?.click()`. */
export const HiddenFileInput = forwardRef<HTMLInputElement, HiddenFileInputProps>(
  function HiddenFileInput({ multiple = false, onFiles }, ref) {
    return (
      <input
        ref={ref}
        type="file"
        accept="image/*"
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
