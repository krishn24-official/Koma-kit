import { DEFAULT_TRANSFORM } from '@/constants/editor';
import { FULL_CROP } from '@/constants/elements';
import type { CellMedia } from '@/types';
import { createId } from './id';

export const ACCEPTED_MEDIA = 'image/*,video/*';

export const isImageFile = (file: File): boolean => file.type.startsWith('image/');

export const isVideoFile = (file: File): boolean =>
  file.type.startsWith('video/') || /\.(mp4|m4v|mov|webm|mkv)$/i.test(file.name);

export const isMediaFile = (file: File): boolean => isImageFile(file) || isVideoFile(file);

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function waitForEvent(media: HTMLMediaElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      media.removeEventListener(event, onEvent);
      media.removeEventListener('error', onError);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Failed to load video'));
    };
    media.addEventListener(event, onEvent);
    media.addEventListener('error', onError);
  });
}

function createVideo(src: string, preload: 'metadata' | 'auto'): HTMLVideoElement {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = preload;
  video.src = src;
  return video;
}

/** Frees the decoder held by a detached video element. */
export function releaseVideo(video: HTMLVideoElement): void {
  video.removeAttribute('src');
  video.load();
}

async function readVideoInfo(src: string) {
  const video = createVideo(src, 'metadata');
  try {
    await waitForEvent(video, 'loadedmetadata');
    let duration = video.duration;

    // Some WebM files (e.g. screen recordings) report Infinity until you seek to the end.
    if (!Number.isFinite(duration)) {
      video.currentTime = Number.MAX_SAFE_INTEGER;
      await waitForEvent(video, 'timeupdate');
      duration = video.duration;
    }

    if (!video.videoWidth || !video.videoHeight) throw new Error('File has no video track');
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Unknown video length');

    return { width: video.videoWidth, height: video.videoHeight, duration };
  } finally {
    releaseVideo(video);
  }
}

/** Loads a video and seeks to `time`, ready to be drawn onto a canvas. */
export async function loadVideoFrame(src: string, time: number): Promise<HTMLVideoElement> {
  const video = createVideo(src, 'auto');
  await waitForEvent(video, 'loadeddata');
  video.currentTime = Math.max(0.001, time);
  await waitForEvent(video, 'seeked');
  return video;
}

/**
 * Turns a local image or video file into cell media backed by an object URL.
 * Files never leave the browser.
 */
export async function readMediaFile(file: File): Promise<CellMedia> {
  const src = URL.createObjectURL(file);
  const base = {
    id: createId(),
    src,
    file,
    fileName: file.name,
    start: 0,
    delay: 0,
    muted: false,
    crop: { ...FULL_CROP },
    transform: { ...DEFAULT_TRANSFORM },
  };

  try {
    if (isVideoFile(file)) {
      const info = await readVideoInfo(src);
      return {
        ...base,
        kind: 'video',
        naturalWidth: info.width,
        naturalHeight: info.height,
        duration: info.duration,
        trimStart: 0,
        trimEnd: info.duration,
      };
    }

    const img = await loadImage(src);
    return {
      ...base,
      kind: 'image',
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      duration: 0,
      trimStart: 0,
      trimEnd: 0,
    };
  } catch (error) {
    URL.revokeObjectURL(src);
    throw error;
  }
}

export const revokeMedia = (media: CellMedia | undefined): void => {
  if (media) URL.revokeObjectURL(media.src);
};

/** Pixel size of anything drawable on a canvas (image, video frame, canvas). */
export function sourceSize(source: CanvasImageSource): { width: number; height: number } {
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  if ('width' in source && typeof source.width === 'number') {
    return { width: source.width, height: (source as { height: number }).height };
  }
  return { width: 0, height: 0 };
}
