import { DEFAULT_TRANSFORM } from '@/constants/editor';
import type { CellImage } from '@/types';
import { createId } from './id';

export const isImageFile = (file: File): boolean => file.type.startsWith('image/');

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Turns a local file into a CellImage backed by an object URL.
 * Images never leave the browser.
 */
export async function readImageFile(file: File): Promise<CellImage> {
  const src = URL.createObjectURL(file);
  try {
    const img = await loadImage(src);
    return {
      id: createId(),
      src,
      fileName: file.name,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      transform: { ...DEFAULT_TRANSFORM },
    };
  } catch (error) {
    URL.revokeObjectURL(src);
    throw error;
  }
}

export const revokeImage = (image: CellImage | undefined): void => {
  if (image) URL.revokeObjectURL(image.src);
};
