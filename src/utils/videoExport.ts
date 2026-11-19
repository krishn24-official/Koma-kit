/**
 * MP4 export. Loaded on demand (dynamic import), so Mediabunny is only downloaded when
 * someone exports a video.
 *
 * Every frame is drawn with the same `drawTemplate` used for still images. Frames are
 * encoded to H.264 with WebCodecs, and the original audio of the chosen video is
 * re-encoded (AAC when available) and muxed alongside.
 */
import {
  ALL_FORMATS,
  AudioBufferSink,
  AudioBufferSource,
  BlobSource,
  BufferTarget,
  CanvasSink,
  CanvasSource,
  canEncodeVideo,
  getFirstEncodableAudioCodec,
  Input,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  QUALITY_MEDIUM,
  type InputAudioTrack,
  type WrappedCanvas,
} from 'mediabunny';
import type { CellMedia } from '@/types';
import { loadImage } from './media';
import { drawTemplate, loadTextFonts, type TemplateSnapshot } from './renderToCanvas';
import {
  getActiveItem,
  getPlayLength,
  getTimelineDuration,
  getVideoLocalTime,
} from './timeline';

export interface VideoExportOptions {
  width: number;
  fps: number;
  signal: AbortSignal;
  /** Called with 0–1 as frames are encoded. */
  onProgress: (fraction: number) => void;
}

export interface VideoExportResult {
  blob: Blob;
  /** Something the user should know (e.g. no sound), or null. */
  warning: string | null;
}

interface FrameReader {
  frames: AsyncGenerator<WrappedCanvas | null, void, unknown>;
  current: CanvasImageSource | null;
}

/** H.264 needs even dimensions. */
const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

const throwIfAborted = (signal: AbortSignal) => {
  if (signal.aborted) throw new DOMException('Export canceled', 'AbortError');
};

export async function exportVideo(
  snapshot: TemplateSnapshot,
  options: VideoExportOptions,
): Promise<VideoExportResult> {
  const { layout, aspectRatio, cells, audioSourceId } = snapshot;
  const { fps, signal } = options;
  const cellCount = layout.cells.length;

  const duration = getTimelineDuration(cells, cellCount);
  if (duration <= 0) throw new Error('Add a video to export an MP4');

  const width = even(options.width);
  const height = even((options.width * aspectRatio.height) / aspectRatio.width);
  const frameCount = Math.max(1, Math.ceil(duration * fps));

  if (!(await canEncodeVideo('avc', { width, height, bitrate: QUALITY_HIGH }))) {
    throw new Error("This browser can't create MP4 videos. Try the latest Chrome.");
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser');

  const visibleCells = Array.from({ length: cellCount }, (_, i) => cells[i] ?? []);
  const visibleItems = visibleCells.flat();

  const inputs: Input[] = [];
  const openInput = (file: File) => {
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
    inputs.push(input);
    return input;
  };
  const readers = new Map<string, FrameReader>();
  let warning: string | null = null;

  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target: new BufferTarget(),
  });

  try {
    // Images and fonts are loaded once up front.
    const [images] = await Promise.all([
      Promise.all(
        visibleItems
          .filter((item) => item.kind === 'image')
          .map(async (item) => [item.id, await loadImage(item.src)] as const),
      ).then((entries) => new Map(entries)),
      loadTextFonts(snapshot.texts),
    ]);

    // One frame decoder per video. It is asked for exactly the timestamps where that
    // video is on screen, in order, so it decodes sequentially (fast).
    for (const items of visibleCells) {
      for (const item of items) {
        if (item.kind !== 'video') continue;
        const track = await openInput(item.file).getPrimaryVideoTrack();
        if (!track) continue;

        const firstTimestamp = await track.getFirstTimestamp();
        const times: number[] = [];
        for (let f = 0; f < frameCount; f++) {
          const t = f / fps;
          if (getActiveItem(items, t)?.id === item.id) {
            times.push(Math.max(firstTimestamp, getVideoLocalTime(item, t)));
          }
        }
        if (times.length === 0) continue;

        // Decode no larger than the output to save memory on phones.
        const shrink = Math.min(
          1,
          Math.max(width, height) / Math.max(track.displayWidth, track.displayHeight),
        );
        const sink = new CanvasSink(track, {
          width: Math.max(2, Math.round(track.displayWidth * shrink)),
          height: Math.max(2, Math.round(track.displayHeight * shrink)),
          fit: 'fill',
          poolSize: 2,
        });
        readers.set(item.id, { frames: sink.canvasesAtTimestamps(times), current: null });
      }
    }

    const videoSource = new CanvasSource(canvas, { codec: 'avc', bitrate: QUALITY_HIGH });
    output.addVideoTrack(videoSource, { frameRate: fps });

    // Audio: the chosen video's original sound, placed at the time the video starts.
    let writeAudio: (() => Promise<void>) | null = null;
    const audioItem = visibleItems.find(
      (item) => item.id === audioSourceId && item.kind === 'video',
    );
    if (audioItem) {
      const track = await openInput(audioItem.file).getPrimaryAudioTrack();
      if (!track) {
        warning = 'The selected video has no sound';
      } else if (!(await track.canDecode())) {
        warning = "This browser can't read the video's sound, so the MP4 is silent";
      } else {
        const codec = await getFirstEncodableAudioCodec(['aac', 'opus'], {
          numberOfChannels: track.numberOfChannels,
          sampleRate: track.sampleRate,
          bitrate: QUALITY_MEDIUM,
        });
        if (!codec) {
          warning = "This browser can't encode sound, so the MP4 is silent";
        } else {
          if (codec !== 'aac') warning = 'Sound was saved as Opus; some apps may not play it';
          const audioSource = new AudioBufferSource({ codec, bitrate: QUALITY_MEDIUM });
          output.addAudioTrack(audioSource);
          const cellItems = visibleCells.find((items) => items.includes(audioItem)) ?? [];
          writeAudio = () =>
            writeAudioTrack(audioSource, track, audioItem, cellItems, duration, signal);
        }
      }
    }

    await output.start();

    const writeVideo = async () => {
      const size = { width, height };
      for (let f = 0; f < frameCount; f++) {
        throwIfAborted(signal);
        const t = f / fps;

        for (const items of visibleCells) {
          const item = getActiveItem(items, t);
          const reader = item?.kind === 'video' ? readers.get(item.id) : undefined;
          if (!reader) continue;
          const next = await reader.frames.next();
          if (!next.done && next.value) reader.current = next.value.canvas;
        }

        drawTemplate(ctx, snapshot, size, t, (item) =>
          item.kind === 'image'
            ? (images.get(item.id) ?? null)
            : (readers.get(item.id)?.current ?? null),
        );
        await videoSource.add(t, 1 / fps);
        options.onProgress((f + 1) / frameCount);
      }
    };

    // Audio and video are written in parallel, so Mediabunny can interleave them.
    await Promise.all([writeVideo(), writeAudio?.()]);
    throwIfAborted(signal);
    await output.finalize();

    const buffer = output.target.buffer;
    if (!buffer) throw new Error('Video encoding produced no data');
    return { blob: new Blob([buffer], { type: 'video/mp4' }), warning };
  } catch (error) {
    if (output.state === 'started' || output.state === 'pending') {
      await output.cancel().catch(() => undefined);
    }
    throw error;
  } finally {
    await Promise.all(
      [...readers.values()].map((reader) => reader.frames.return().catch(() => undefined)),
    );
    inputs.forEach((input) => input.dispose());
  }
}

async function writeAudioTrack(
  source: AudioBufferSource,
  track: InputAudioTrack,
  item: CellMedia,
  cellItems: CellMedia[],
  duration: number,
  signal: AbortSignal,
): Promise<void> {
  const { sampleRate, numberOfChannels } = track;

  // Silence until the video appears.
  const leadIn = Math.round(item.start * sampleRate);
  if (leadIn > 0) {
    await source.add(new AudioBuffer({ length: leadIn, numberOfChannels, sampleRate }));
  }

  // Sound plays until the (trimmed) video ends, is replaced in its cell, or the timeline ends.
  const next = cellItems[cellItems.indexOf(item) + 1];
  const end = Math.min(duration, item.start + getPlayLength(item), next?.start ?? Infinity);
  const from = item.trimStart;
  const to = from + (end - item.start);

  // Decoded buffers don't line up with the trim points, so cut them to the exact sample.
  let remaining = Math.round((to - from) * sampleRate);
  for await (const { buffer, timestamp } of new AudioBufferSink(track).buffers(from, to)) {
    throwIfAborted(signal);
    if (remaining <= 0) break;
    const skip = Math.max(0, Math.round((from - timestamp) * sampleRate));
    const take = Math.min(buffer.length - skip, remaining);
    if (take <= 0) continue;
    await source.add(
      skip === 0 && take === buffer.length ? buffer : sliceAudioBuffer(buffer, skip, take),
    );
    remaining -= take;
  }
}

function sliceAudioBuffer(buffer: AudioBuffer, offset: number, length: number): AudioBuffer {
  const out = new AudioBuffer({
    length,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
  });
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    out.getChannelData(ch).set(buffer.getChannelData(ch).subarray(offset, offset + length));
  }
  return out;
}
