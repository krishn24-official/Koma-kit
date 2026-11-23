/**
 * Photo mosaic: rebuilds a main picture out of many small tile pictures.
 *
 * Every grid cell of the main picture and every tile is described by the average
 * color of its 4 quarters (2×2 zones), in Lab so distances match how different colors
 * look. Each cell gets the tile with the closest 4 colors; optionally a tile isn't
 * reused right next to itself. Color match then moves each tile quarter toward the
 * main picture's color there, so it stays recognisable even with few or similar tiles.
 */
import type { CellRect } from '@/types';
import { canvasToBlob } from './download';

/** Tiles are previewed (and matched) as squares this big. */
export const TILE_RES = 128;
/** Sharper copy of every tile, kept as a JPEG and used for downloads. */
export const TILE_SOURCE_RES = 256;
const ZONES = 4; // 2×2
const VALUES = ZONES * 3;
/** Main picture samples per cell side when measuring colors. */
const SAMPLES = 8;

export interface MosaicTile {
  id: string;
  name: string;
  /** Square, center-cropped copy, TILE_RES wide. */
  image: HTMLCanvasElement;
  /** Lab of the 4 zones: L,a,b × 4. */
  lab: Float32Array;
  /** sRGB of the 4 zones, for matching colors when drawing. */
  rgb: Uint8ClampedArray;
  /**
   * JPEG copy (up to TILE_SOURCE_RES wide): drawn in downloads for sharp tiles, and
   * stored so tiles survive closing the browser.
   */
  blob: Blob;
}

export interface MosaicTarget {
  file: File;
  url: string;
  width: number;
  height: number;
  /** Part of the picture used, as fractions (x, y, w, h). Full = 0, 0, 1, 1. */
  crop: CellRect;
}

export interface MosaicGrid {
  cols: number;
  rows: number;
  /** Lab per cell zone (cols × rows × 12). */
  lab: Float32Array;
  /** sRGB per cell zone (cols × rows × 12), for the tint. */
  rgb: Uint8ClampedArray;
}

export interface MosaicSettings {
  /** Cells across. */
  cols: number;
  /** Download pixels per tile. */
  tileSize: number;
  /** How strongly tiles take on the main picture's brightness and colors, 0–1. */
  blend: number;
  avoidRepeats: boolean;
}

export const DEFAULT_MOSAIC_SETTINGS: MosaicSettings = {
  cols: 60,
  tileSize: 48,
  blend: 0.5,
  avoidRepeats: true,
};

export const MOSAIC_LIMITS = {
  cols: { min: 10, max: 150 },
  tileSize: { min: 16, max: TILE_SOURCE_RES },
  blend: { min: 0, max: 1 },
} as const;

export const MAX_TILES = 1000;

// ─── Color ───────────────────────────────────────────────────────────────────

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const labF = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

/** sRGB (0–255) → CIE Lab (D65). */
function rgbToLab(r: number, g: number, b: number, out: Float32Array, at: number): void {
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  const x = labF((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
  const y = labF(R * 0.2126 + G * 0.7152 + B * 0.0722);
  const z = labF((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  out[at] = 116 * y - 16;
  out[at + 1] = 500 * (x - y);
  out[at + 2] = 200 * (y - z);
}

/**
 * Averages each 2×2 zone of every `size`-pixel cell in `data` (an image of
 * cols·size × rows·size), writing sRGB and Lab per zone.
 */
function zoneColors(
  data: Uint8ClampedArray,
  width: number,
  cols: number,
  rows: number,
  size: number,
  rgbOut: Uint8ClampedArray | null,
  labOut: Float32Array,
): void {
  const half = size / 2;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (let z = 0; z < ZONES; z++) {
        const x0 = col * size + (z % 2) * half;
        const y0 = row * size + Math.floor(z / 2) * half;
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let y = y0; y < y0 + half; y++) {
          for (let x = x0; x < x0 + half; x++) {
            const i = (y * width + x) * 4;
            // Transparent pixels count as black, like on a dark background.
            const a = data[i + 3]! / 255;
            r += data[i]! * a;
            g += data[i + 1]! * a;
            b += data[i + 2]! * a;
            n++;
          }
        }
        const at = ((row * cols + col) * ZONES + z) * 3;
        r /= n;
        g /= n;
        b /= n;
        if (rgbOut) {
          rgbOut[at] = r;
          rgbOut[at + 1] = g;
          rgbOut[at + 2] = b;
        }
        rgbToLab(r, g, b, labOut, at);
      }
    }
  }
}

/**
 * All mosaic canvases are read back (color match), so they stay in normal memory:
 * drawing between them is then fast, without GPU round trips.
 */
function canvas2d(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not supported in this browser');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

// ─── Tiles ───────────────────────────────────────────────────────────────────

/** Loads a picture as a square tile and measures its colors. */
export async function prepareTile(file: File, id: string): Promise<MosaicTile> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    // Sharp square copy for downloads (not bigger than the picture itself).
    const sourceSide = Math.min(TILE_SOURCE_RES, Math.max(TILE_RES, side));
    const source = canvas2d(sourceSide, sourceSide);
    source.ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      sourceSide,
      sourceSide,
    );
    const blob = await canvasToBlob(source.canvas, 'image/jpeg', 0.9);
    // Smaller copy for the preview and color measuring.
    const { canvas, ctx } = canvas2d(TILE_RES, TILE_RES);
    ctx.drawImage(source.canvas, 0, 0, TILE_RES, TILE_RES);
    source.canvas.width = source.canvas.height = 0;
    // Measure on a small copy (8×8 is plenty for 4 averages).
    const small = canvas2d(SAMPLES, SAMPLES);
    small.ctx.drawImage(canvas, 0, 0, SAMPLES, SAMPLES);
    const lab = new Float32Array(VALUES);
    const rgb = new Uint8ClampedArray(VALUES);
    zoneColors(
      small.ctx.getImageData(0, 0, SAMPLES, SAMPLES).data,
      SAMPLES,
      1,
      1,
      SAMPLES,
      rgb,
      lab,
    );
    return { id, name: file.name, image: canvas, lab, rgb, blob };
  } finally {
    bitmap.close();
  }
}

/** What's stored for a tile (its colors are kept, so nothing is measured again). */
export type SavedTile = Omit<MosaicTile, 'image'>;

export const saveTile = (tile: MosaicTile): SavedTile => ({
  id: tile.id,
  name: tile.name,
  lab: tile.lab,
  rgb: tile.rgb,
  blob: tile.blob,
});

/** Rebuilds a tile from storage. */
export async function restoreTile(saved: SavedTile): Promise<MosaicTile> {
  const bitmap = await createImageBitmap(saved.blob);
  try {
    const { canvas, ctx } = canvas2d(TILE_RES, TILE_RES);
    ctx.drawImage(bitmap, 0, 0, TILE_RES, TILE_RES);
    return { ...saved, image: canvas };
  } finally {
    bitmap.close();
  }
}

// ─── Main picture ────────────────────────────────────────────────────────────

/** Rows for square cells over the cropped part of the main picture. */
export const rowsFor = (
  target: Pick<MosaicTarget, 'width' | 'height' | 'crop'>,
  cols: number,
): number =>
  Math.max(1, Math.round((cols * target.height * target.crop.h) / (target.width * target.crop.w)));

/** Measures the colors of every cell of the main picture. */
export function analyzeTarget(
  image: CanvasImageSource,
  target: MosaicTarget,
  cols: number,
): MosaicGrid {
  const rows = rowsFor(target, cols);
  const w = cols * SAMPLES;
  const h = rows * SAMPLES;
  const { ctx } = canvas2d(w, h);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const { crop } = target;
  ctx.drawImage(
    image,
    crop.x * target.width,
    crop.y * target.height,
    crop.w * target.width,
    crop.h * target.height,
    0,
    0,
    w,
    h,
  );
  const lab = new Float32Array(cols * rows * VALUES);
  const rgb = new Uint8ClampedArray(cols * rows * VALUES);
  zoneColors(ctx.getImageData(0, 0, w, h).data, w, cols, rows, SAMPLES, rgb, lab);
  return { cols, rows, lab, rgb };
}

// ─── Matching ────────────────────────────────────────────────────────────────

/** How many of the closest tiles are considered for each cell. */
const CANDIDATES = 4;
/** A candidate counts as "nearly as close" within this factor of the best distance. */
const CLOSE_ENOUGH = 1.3;

/** Small repeatable random generator, so the same settings give the same mosaic. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A tile isn't reused within this many cells of itself (when avoiding repeats). */
const REPEAT_RADIUS = 2;

const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Picks a tile for every cell (returns tile indexes, row by row). Works in slices so
 * the page stays responsive; `onProgress` gets 0–1.
 */
export async function matchTiles(
  grid: MosaicGrid,
  tiles: MosaicTile[],
  avoidRepeats: boolean,
  onProgress?: (done: number) => void,
  signal?: { canceled: boolean },
): Promise<Int32Array> {
  const { cols, rows, lab } = grid;
  const count = tiles.length;
  const tileLab = new Float32Array(count * VALUES);
  tiles.forEach((t, i) => tileLab.set(t.lab, i * VALUES));
  const result = new Int32Array(cols * rows);
  // Repeats can only be avoided when there are enough tiles to choose from.
  const radius = avoidRepeats && count > (REPEAT_RADIUS * 2 + 1) ** 2 / 2 ? REPEAT_RADIUS : 0;
  const nearby = new Set<number>();
  const candDist = new Float64Array(CANDIDATES);
  const candTile = new Int32Array(CANDIDATES);
  let candidateCount = 0;
  const random = seededRandom(cols * 7919 + rows);
  let last = performance.now();

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = row * cols + col;
      nearby.clear();
      if (radius > 0) {
        for (let dy = -radius; dy <= 0; dy++) {
          const y = row + dy;
          if (y < 0) continue;
          for (let dx = -radius; dx <= radius; dx++) {
            const x = col + dx;
            if (x < 0 || x >= cols || (dy === 0 && dx >= 0)) continue;
            nearby.add(result[y * cols + x]!);
          }
        }
      }
      const base = cell * VALUES;
      // Keep the CANDIDATES closest tiles (sorted), skipping ones used nearby.
      candidateCount = 0;
      for (let t = 0; t < count; t++) {
        if (nearby.has(t)) continue;
        const tb = t * VALUES;
        const limit = candidateCount < CANDIDATES ? Infinity : candDist[CANDIDATES - 1]!;
        let d = 0;
        for (let k = 0; k < VALUES; k++) {
          const diff = lab[base + k]! - tileLab[tb + k]!;
          d += diff * diff;
          if (d >= limit) break;
        }
        if (d >= limit) continue;
        let at = Math.min(candidateCount, CANDIDATES - 1);
        while (at > 0 && candDist[at - 1]! > d) {
          candDist[at] = candDist[at - 1]!;
          candTile[at] = candTile[at - 1]!;
          at--;
        }
        candDist[at] = d;
        candTile[at] = t;
        if (candidateCount < CANDIDATES) candidateCount++;
      }
      // Pick at random among the ones nearly as close as the best, so a few similar
      // tiles don't repeat in a visible pattern.
      let usable = 1;
      const close = candDist[0]! * CLOSE_ENOUGH + 25;
      while (usable < candidateCount && candDist[usable]! <= close) usable++;
      result[cell] = candTile[Math.floor(random() * usable)] ?? 0;
    }
    if (performance.now() - last > 30) {
      onProgress?.((row + 1) / rows);
      await yieldToBrowser();
      if (signal?.canceled) throw new DOMException('Canceled', 'AbortError');
      last = performance.now();
    }
  }
  onProgress?.(1);
  return result;
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

export interface MosaicView {
  /** Pixels per tile. */
  tile: number;
  /** Where the mosaic's top-left corner is, in canvas pixels. */
  x: number;
  y: number;
}

/**
 * Draws the part of the mosaic visible on `ctx` (canvas of `width` × `height` pixels,
 * no transform). Used by the zoomable preview and by the download (x = y = 0).
 */
export function drawMosaic(
  ctx: CanvasRenderingContext2D,
  grid: MosaicGrid,
  assignment: Int32Array,
  tiles: MosaicTile[],
  blend: number,
  view: MosaicView,
  width: number,
  height: number,
): void {
  const { cols, rows } = grid;
  const s = view.tile;
  const c0 = Math.max(0, Math.floor(-view.x / s));
  const r0 = Math.max(0, Math.floor(-view.y / s));
  const c1 = Math.min(cols, Math.ceil((width - view.x) / s));
  const r1 = Math.min(rows, Math.ceil((height - view.y) / s));
  if (c1 <= c0 || r1 <= r0) return;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = s < TILE_RES / 2 ? 'medium' : 'high';

  for (let row = r0; row < r1; row++) {
    for (let col = c0; col < c1; col++) {
      const tile = tiles[assignment[row * cols + col]!];
      if (!tile) continue;
      // Whole pixels, so neighbouring tiles meet without hairline gaps.
      const x = Math.round(view.x + col * s);
      const y = Math.round(view.y + row * s);
      ctx.drawImage(
        tile.image,
        x,
        y,
        Math.round(view.x + (col + 1) * s) - x,
        Math.round(view.y + (row + 1) * s) - y,
      );
    }
  }

  if (blend > 0) {
    // The drawn area, clipped to the canvas.
    const x0 = Math.max(0, Math.round(view.x + c0 * s));
    const y0 = Math.max(0, Math.round(view.y + r0 * s));
    const x1 = Math.min(width, Math.round(view.x + c1 * s));
    const y1 = Math.min(height, Math.round(view.y + r1 * s));
    if (x1 > x0 && y1 > y0)
      matchColors(ctx, grid, assignment, tiles, blend, view, x0, y0, x1 - x0, y1 - y0);
  }
}

/**
 * Color match, per pixel: each tile quarter's average color is moved to the main
 * picture's color at that spot, channel by channel, while keeping the tile's light and
 * shade. Darker targets scale the channel down (p · t / own); lighter ones scale the
 * distance to white down, so nothing clips. The four quarters' adjustments are blended
 * smoothly across the tile (no seams at quarter edges). `blend` mixes with the original.
 */
function matchColors(
  ctx: CanvasRenderingContext2D,
  grid: MosaicGrid,
  assignment: Int32Array,
  tiles: MosaicTile[],
  blend: number,
  view: MosaicView,
  x0: number,
  y0: number,
  w: number,
  h: number,
): void {
  const { cols, rows, rgb } = grid;
  const s = view.tile;
  // Per pixel column / row: its cell, and how far toward the right / bottom quarter's
  // centre it is (0 at the left quarter's centre and before, 1 at the right's and after).
  const colOf = new Int32Array(w);
  const wxOf = new Float32Array(w);
  for (let i = 0; i < w; i++) {
    const local = (x0 + i + 0.5 - view.x) / s;
    const c = Math.floor(local);
    colOf[i] = c >= 0 && c < cols ? c : -1;
    wxOf[i] = Math.min(1, Math.max(0, (local - c - 0.25) * 2));
  }
  const rowOf = new Int32Array(h);
  const wyOf = new Float32Array(h);
  for (let j = 0; j < h; j++) {
    const local = (y0 + j + 0.5 - view.y) / s;
    const r = Math.floor(local);
    rowOf[j] = r >= 0 && r < rows ? r : -1;
    wyOf[j] = Math.min(1, Math.max(0, (local - r - 0.25) * 2));
  }

  const image = ctx.getImageData(x0, y0, w, h);
  const d = image.data;
  // Per quarter (4) and channel (3) of the current cell: factor and which side.
  const factor = new Float32Array(12);
  const darker = new Uint8Array(12);
  let lastCell = -1;

  /** The matched value of channel value `v` with quarter-and-channel `q`'s rule. */
  const match = (v: number, q: number) =>
    darker[q] ? v * factor[q]! : 255 - (255 - v) * factor[q]!;

  for (let j = 0; j < h; j++) {
    const r = rowOf[j]!;
    if (r < 0) continue;
    const wy = wyOf[j]!;
    for (let i = 0; i < w; i++) {
      const c = colOf[i]!;
      if (c < 0) continue;
      const cell = r * cols + c;
      if (cell !== lastCell) {
        lastCell = cell;
        const tile = tiles[assignment[cell]!];
        for (let q = 0; q < 12; q++) {
          const target = rgb[cell * 12 + q]!;
          const own = tile ? tile.rgb[q]! : target;
          if (target <= own) {
            darker[q] = 1;
            factor[q] = own > 0 ? target / own : 0;
          } else {
            darker[q] = 0;
            factor[q] = own < 255 ? (255 - target) / (255 - own) : 0;
          }
        }
      }
      const wx = wxOf[i]!;
      const tl = (1 - wx) * (1 - wy);
      const tr = wx * (1 - wy);
      const bl = (1 - wx) * wy;
      const br = wx * wy;
      const p = (j * w + i) * 4;
      for (let k = 0; k < 3; k++) {
        const v = d[p + k]!;
        const matched =
          tl * match(v, k) + tr * match(v, 3 + k) + bl * match(v, 6 + k) + br * match(v, 9 + k);
        d[p + k] = v + (matched - v) * blend;
      }
    }
  }
  ctx.putImageData(image, x0, y0);
}

/**
 * Big canvases fail when memory runs out: stay under these (the tile size shrinks if
 * needed). Computers get more room than phones and tablets.
 */
const isTouchDevice = () =>
  typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const limits = () =>
  isTouchDevice() ? { side: 12000, pixels: 36_000_000 } : { side: 16000, pixels: 100_000_000 };

/** Download size for the settings; the tile size is reduced to fit canvas limits. */
export function mosaicOutput(grid: Pick<MosaicGrid, 'cols' | 'rows'>, tileSize: number) {
  const max = limits();
  const fit = Math.min(
    tileSize,
    max.side / Math.max(grid.cols, grid.rows),
    Math.sqrt(max.pixels / (grid.cols * grid.rows)),
  );
  const tile = Math.max(1, Math.floor(fit));
  return { tile, width: grid.cols * tile, height: grid.rows * tile, reduced: tile < tileSize };
}

/**
 * The full-size mosaic for downloads. Tiles are drawn from their sharp copies with the
 * best scaling; the color match runs in strips so memory stays low on big images.
 */
export async function renderMosaic(
  grid: MosaicGrid,
  assignment: Int32Array,
  tiles: MosaicTile[],
  settings: MosaicSettings,
  onProgress?: (done: number) => void,
): Promise<HTMLCanvasElement> {
  const out = mosaicOutput(grid, settings.tileSize);
  const { canvas, ctx } = canvas2d(out.width, out.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const s = out.tile;

  // Cells per tile, so each sharp copy is decoded once and freed right after.
  const cellsByTile = new Map<number, number[]>();
  assignment.forEach((t, cell) => {
    const list = cellsByTile.get(t);
    if (list) list.push(cell);
    else cellsByTile.set(t, [cell]);
  });

  let done = 0;
  let last = performance.now();
  for (const [t, cells] of cellsByTile) {
    const tile = tiles[t];
    if (!tile) continue;
    // The sharp copy only helps when tiles are drawn bigger than the preview copy.
    const bitmap = s > TILE_RES ? await createImageBitmap(tile.blob).catch(() => null) : null;
    const source = bitmap ?? tile.image;
    for (const cell of cells) {
      const col = cell % grid.cols;
      const row = (cell - col) / grid.cols;
      ctx.drawImage(source, col * s, row * s, s, s);
    }
    bitmap?.close();
    done += cells.length;
    if (performance.now() - last > 50) {
      onProgress?.((done / assignment.length) * (settings.blend > 0 ? 0.6 : 1));
      await yieldToBrowser();
      last = performance.now();
    }
  }

  if (settings.blend > 0) {
    const view = { tile: s, x: 0, y: 0 };
    const band = Math.max(1, Math.floor(2048 / s)) * s; // whole rows of tiles per strip
    for (let y = 0; y < out.height; y += band) {
      const h = Math.min(band, out.height - y);
      matchColors(ctx, grid, assignment, tiles, settings.blend, view, 0, y, out.width, h);
      onProgress?.(0.6 + 0.4 * ((y + h) / out.height));
      await yieldToBrowser();
    }
  }
  onProgress?.(1);
  return canvas;
}
