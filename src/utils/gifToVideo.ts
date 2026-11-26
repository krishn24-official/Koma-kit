/**
 * Animated GIFs → short MP4 clips, so they play in boxes, on the timeline and in MP4
 * downloads exactly like videos. Frames are read with the browser's ImageDecoder
 * (Chrome, Edge, Android Chrome, Firefox) and encoded with Mediabunny, all on the device.
 */
import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH } from 'mediabunny';

/** Minimal typing for the WebCodecs ImageDecoder (not in TypeScript's DOM types yet). */
interface DecodedImage {
  image: VideoFrame;
}
interface ImageDecoderLike {
  tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } | null };
  decode(options: { frameIndex: number }): Promise<DecodedImage>;
  close(): void;
}
type ImageDecoderClass = {
  new (init: { data: ArrayBuffer; type: string }): ImageDecoderLike;
  isTypeSupported(type: string): Promise<boolean>;
};

const getImageDecoder = (): ImageDecoderClass | null =>
  (globalThis as { ImageDecoder?: ImageDecoderClass }).ImageDecoder ?? null;

/** True if this browser can turn GIFs into clips. */
export async function canConvertGifs(): Promise<boolean> {
  const Decoder = getImageDecoder();
  return Boolean(Decoder && (await Decoder.isTypeSupported('image/gif').catch(() => false)));
}

export const isGifFile = (file: File): boolean =>
  file.type === 'image/gif' || /\.gif$/i.test(file.name);

/** GIF frames without a delay are shown for 0.1 s, like browsers do. */
const DEFAULT_FRAME_SECONDS = 0.1;
/** Frames faster than this are slowed to it (very short GIF delays are usually mistakes). */
const MIN_FRAME_SECONDS = 0.02;
/** Larger GIFs are scaled down to this on their longest side. */
const MAX_SIDE = 1280;

/**
 * Converts an animated GIF to an MP4 file. Returns null for a still (one-frame) GIF or
 * when the browser can't read GIF frames — then it's used as a picture.
 */
export async function gifToVideo(file: File): Promise<File | null> {
  const Decoder = getImageDecoder();
  if (!Decoder || !(await canConvertGifs())) return null;

  const decoder = new Decoder({ data: await file.arrayBuffer(), type: 'image/gif' });
  try {
    await decoder.tracks.ready;
    const frameCount = decoder.tracks.selectedTrack?.frameCount ?? 0;
    if (frameCount < 2) return null;

    const first = (await decoder.decode({ frameIndex: 0 })).image;
    const scale = Math.min(1, MAX_SIDE / Math.max(first.displayWidth, first.displayHeight));
    // H.264 needs even sizes.
    const width = Math.max(2, Math.round((first.displayWidth * scale) / 2) * 2);
    const height = Math.max(2, Math.round((first.displayHeight * scale) / 2) * 2);
    first.close();

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';

    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: new BufferTarget(),
    });
    // Frequent key frames: looping jumps back to the start often, which is then instant.
    const source = new CanvasSource(canvas, {
      codec: 'avc',
      bitrate: QUALITY_HIGH,
      keyFrameInterval: 0.5,
    });
    output.addVideoTrack(source);
    await output.start();

    let time = 0;
    for (let i = 0; i < frameCount; i++) {
      const frame = (await decoder.decode({ frameIndex: i })).image;
      const seconds = frame.duration ? frame.duration / 1e6 : DEFAULT_FRAME_SECONDS;
      const length = Math.max(MIN_FRAME_SECONDS, seconds);
      // GIFs may be transparent: show them on black, like other clips.
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(frame, 0, 0, width, height);
      frame.close();
      await source.add(time, length);
      time += length;
    }
    await output.finalize();

    const buffer = (output.target as BufferTarget).buffer;
    if (!buffer) return null;
    const name = file.name.replace(/\.gif$/i, '') + '.mp4';
    return new File([buffer], name, { type: 'video/mp4' });
  } finally {
    decoder.close();
  }
}
