/**
 * MP4 export. Loaded on demand (dynamic import), so Mediabunny is only downloaded when
 * someone exports a video.
 *
 * Every frame is drawn with the same `drawTemplate` used for still images. Frames are
 * encoded to H.264 with WebCodecs. The original sound of every unmuted video is mixed
 * into one soundtrack, re-encoded (AAC when available) and muxed alongside.
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
import { drawTemplate, loadDrawAssets, type TemplateSnapshot } from './renderToCanvas';
import {
  getActiveItem,
  getPlayLength,
  getPlayStart,
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
  const { layout, aspectRatio, cells } = snapshot;
  const { fps, signal } = options;
  const cellCount = layout.cells.length;

  const duration = getTimelineDuration(cells, cellCount, snapshot.elements);
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
    // Pictures, fonts and stickers are loaded once up front.
    const [images, assets] = await Promise.all([
      Promise.all(
        visibleItems
          .filter((item) => item.kind === 'image')
          .map(async (item) => [item.id, await loadImage(item.src)] as const),
      ).then((entries) => new Map(entries)),
      loadDrawAssets(snapshot),
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

    // Audio: the sound of every unmuted video, each placed where it plays, mixed together.
    let writeAudio: (() => Promise<void>) | null = null;
    const audioClips: AudioClip[] = [];
    for (const items of visibleCells) {
      for (const item of items) {
        if (item.kind !== 'video' || item.muted) continue;
        const track = await openInput(item.file).getPrimaryAudioTrack();
        if (!track) continue; // a clip without sound
        if (!(await track.canDecode())) {
          warning = "This browser can't read some clips' sound, so they are silent";
          continue;
        }
        audioClips.push({ item, track, cellItems: items });
      }
    }
    if (audioClips.length > 0) {
      const codec = await getFirstEncodableAudioCodec(['aac', 'opus'], {
        numberOfChannels: MIX_CHANNELS,
        sampleRate: MIX_SAMPLE_RATE,
        bitrate: QUALITY_MEDIUM,
      });
      if (!codec) {
        warning = "This browser can't encode sound, so the MP4 is silent";
      } else {
        if (codec !== 'aac') warning = 'Sound was saved as Opus; some apps may not play it';
        const audioSource = new AudioBufferSource({ codec, bitrate: QUALITY_MEDIUM });
        output.addAudioTrack(audioSource);
        writeAudio = () => writeMixedAudio(audioSource, audioClips, duration, signal);
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

        drawTemplate(
          ctx,
          snapshot,
          size,
          t,
          (item) =>
            item.kind === 'image'
              ? (images.get(item.id) ?? null)
              : (readers.get(item.id)?.current ?? null),
          assets,
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

/** A video whose sound goes into the mix. */
interface AudioClip {
  item: CellMedia;
  track: InputAudioTrack;
  /** All items of its box, to know when the next one replaces it. */
  cellItems: CellMedia[];
}

/** The mixed soundtrack is stereo at 48 kHz, whatever the clips use. */
const MIX_SAMPLE_RATE = 48000;
const MIX_CHANNELS = 2;
/** Mixed audio is handed to the encoder in 1-second pieces. */
const MIX_CHUNK = MIX_SAMPLE_RATE;

/**
 * When a clip's sound plays on the timeline and which part of the file it uses:
 * from when it starts playing (after any delay) until its trimmed end, until the next
 * item replaces it in its box, or until the timeline ends.
 */
function clipSegment(clip: AudioClip, duration: number) {
  const { item, cellItems } = clip;
  const playStart = getPlayStart(item);
  const next = cellItems[cellItems.indexOf(item) + 1];
  // A looping clip repeats until the next item in its box or the end of the video.
  const end = item.loop
    ? Math.min(duration, next?.start ?? Infinity)
    : Math.min(duration, playStart + getPlayLength(item), next?.start ?? Infinity);
  const to = item.loop ? item.trimEnd : item.trimStart + Math.max(0, end - playStart);
  return { playStart, end, from: item.trimStart, to };
}

/**
 * Decodes the part of a track between `from` and `to` (seconds into the file) into one
 * buffer. Decoded packets don't line up with the trim points, so the first one is cut
 * to the exact sample.
 */
async function readAudioRange(
  track: InputAudioTrack,
  from: number,
  to: number,
  signal: AbortSignal,
): Promise<AudioBuffer | null> {
  const { sampleRate, numberOfChannels } = track;
  const total = Math.round((to - from) * sampleRate);
  if (total <= 0) return null;

  const out = new AudioBuffer({ length: total, numberOfChannels, sampleRate });
  let written = 0;
  for await (const { buffer, timestamp } of new AudioBufferSink(track).buffers(from, to)) {
    throwIfAborted(signal);
    if (written >= total) break;
    const skip = Math.max(0, Math.round((from - timestamp) * sampleRate));
    const take = Math.min(buffer.length - skip, total - written);
    if (take <= 0) continue;
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const source = buffer.getChannelData(Math.min(ch, buffer.numberOfChannels - 1));
      out.getChannelData(ch).set(source.subarray(skip, skip + take), written);
    }
    written += take;
  }
  return written > 0 ? out : null;
}

/**
 * Mixes every clip's sound into one soundtrack for the whole video and writes it.
 * The browser's offline audio engine places each clip at its start time and converts
 * sample rates and mono/stereo as needed.
 */
async function writeMixedAudio(
  source: AudioBufferSource,
  clips: AudioClip[],
  duration: number,
  signal: AbortSignal,
): Promise<void> {
  const length = Math.max(1, Math.ceil(duration * MIX_SAMPLE_RATE));
  const mixer = new OfflineAudioContext(MIX_CHANNELS, length, MIX_SAMPLE_RATE);

  for (const clip of clips) {
    const { playStart, end, from, to } = clipSegment(clip, duration);
    if (end <= playStart) continue;
    const buffer = await readAudioRange(clip.track, from, to, signal);
    if (!buffer) continue;
    const node = mixer.createBufferSource();
    node.buffer = buffer;
    node.connect(mixer.destination);
    if (clip.item.loop) {
      // One pass of the trimmed sound, repeated until the clip's end.
      node.loop = true;
      node.loopStart = 0;
      node.loopEnd = buffer.duration;
      node.start(playStart);
      node.stop(end);
    } else {
      node.start(playStart);
    }
  }
  throwIfAborted(signal);

  const mixed = await mixer.startRendering();
  preventClipping(mixed);

  for (let offset = 0; offset < mixed.length; offset += MIX_CHUNK) {
    throwIfAborted(signal);
    await source.add(sliceAudioBuffer(mixed, offset, Math.min(MIX_CHUNK, mixed.length - offset)));
  }
}

/** Two loud clips at once can add up past full volume; scale down so nothing distorts. */
function preventClipping(buffer: AudioBuffer): void {
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    for (const sample of buffer.getChannelData(ch)) peak = Math.max(peak, Math.abs(sample));
  }
  if (peak <= 1) return;
  const gain = 0.98 / peak;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) data[i]! *= gain;
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
