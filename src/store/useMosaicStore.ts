import { create } from 'zustand';
import { FULL_CROP } from '@/constants/elements';
import type { CellRect } from '@/types';
import { isQuotaError, requestPersistence, runDb } from '@/utils/db';
import { createId } from '@/utils/id';
import { loadImage } from '@/utils/media';
import {
  analyzeTarget,
  DEFAULT_MOSAIC_SETTINGS,
  matchTiles,
  MAX_TILES,
  prepareTile,
  restoreTile,
  saveTile,
  type MosaicGrid,
  type MosaicSettings,
  type MosaicTarget,
  type MosaicTile,
  type SavedTile,
} from '@/utils/mosaic';
import { useEditorStore } from './useEditorStore';
import { useUiStore } from './useUiStore';

type Status =
  | { kind: 'idle' }
  | { kind: 'loading'; done: number; total: number }
  | { kind: 'matching'; progress: number };

interface MosaicStore {
  active: boolean;
  /** Saved pictures have been read back from storage. */
  loaded: boolean;
  target: MosaicTarget | null;
  tiles: MosaicTile[];
  settings: MosaicSettings;
  /** Colors of the main picture's cells, for the current target and column count. */
  grid: MosaicGrid | null;
  /** Tile index per cell (null until built). */
  assignment: Int32Array | null;
  status: Status;
  /** Crop frame while cropping the main picture (fractions), or null. */
  cropDraft: CellRect | null;

  open: () => Promise<void>;
  close: () => void;
  setTarget: (file: File) => Promise<void>;
  addTiles: (files: File[]) => Promise<void>;
  clearTiles: () => void;
  updateSettings: (patch: Partial<MosaicSettings>) => void;
  startCrop: () => void;
  setCropDraft: (rect: CellRect) => void;
  applyCrop: () => void;
  cancelCrop: () => void;
}

/** What's kept in storage (the main picture's original file, tiles as small JPEGs). */
interface SavedMosaic {
  target: { file: File; crop: CellRect } | null;
  tiles: SavedTile[];
  settings: MosaicSettings;
}

const STORAGE_KEY = 'mosaic';

const toast = (message: string, tone: 'info' | 'error' = 'error') =>
  useUiStore.getState().showToast(message, tone);

let targetImage: HTMLImageElement | null = null;
let rebuildTimer: ReturnType<typeof setTimeout> | undefined;
let currentJob: { canceled: boolean } | null = null;

/** Opens a main picture file: its URL, size and decoded image. */
async function readTarget(file: File, crop: CellRect) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const target: MosaicTarget = {
      file,
      url,
      width: img.naturalWidth,
      height: img.naturalHeight,
      crop,
    };
    return { target, img };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

export const useMosaicStore = create<MosaicStore>()((set, get) => {
  /** Re-measures the main picture and re-picks tiles (shortly after changes). */
  const scheduleRebuild = () => {
    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => void rebuild(), 250);
  };

  const rebuild = async () => {
    const { target, tiles, settings } = get();
    if (currentJob) currentJob.canceled = true;
    if (!target || !targetImage || tiles.length === 0) {
      set({ assignment: null, status: { kind: 'idle' } });
      return;
    }
    const job = { canceled: false };
    currentJob = job;
    set({ status: { kind: 'matching', progress: 0 } });
    try {
      const grid = analyzeTarget(targetImage, target, settings.cols);
      const assignment = await matchTiles(
        grid,
        tiles,
        settings.avoidRepeats,
        (progress) => !job.canceled && set({ status: { kind: 'matching', progress } }),
        job,
      );
      if (!job.canceled) set({ grid, assignment, status: { kind: 'idle' } });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        console.error(e);
        toast("Couldn't build the mosaic");
        set({ status: { kind: 'idle' } });
      }
    } finally {
      if (currentJob === job) currentJob = null;
    }
  };

  /** Reads saved pictures and settings back (once per page load). */
  const load = async () => {
    try {
      const saved = await runDb<SavedMosaic | undefined>('kv', 'readonly', (store) =>
        store.get(STORAGE_KEY),
      );
      if (!saved) return;
      set({ settings: { ...DEFAULT_MOSAIC_SETTINGS, ...saved.settings } });
      // Anything picked while this was loading wins over the saved copy.
      if (saved.target && !get().target) {
        const { target, img } = await readTarget(saved.target.file, saved.target.crop);
        if (!get().target) {
          targetImage = img;
          set({ target });
        } else URL.revokeObjectURL(target.url);
      }
      if (saved.tiles.length) {
        set({ status: { kind: 'loading', done: 0, total: saved.tiles.length } });
        const tiles = (await Promise.allSettled(saved.tiles.map(restoreTile))).flatMap((r) =>
          r.status === 'fulfilled' ? [r.value] : [],
        );
        set((s) => ({ tiles: [...tiles, ...s.tiles], status: { kind: 'idle' } }));
      }
      scheduleRebuild();
    } catch {
      // Start fresh if storage can't be read.
      set({ status: { kind: 'idle' } });
    }
  };

  return {
    active: false,
    loaded: false,
    target: null,
    tiles: [],
    settings: { ...DEFAULT_MOSAIC_SETTINGS },
    grid: null,
    assignment: null,
    status: { kind: 'idle' },
    cropDraft: null,

    open: async () => {
      useEditorStore.getState().clearSelection();
      useUiStore.getState().closeMobilePanel();
      set({ active: true });
      if (!get().loaded) {
        await load();
        set({ loaded: true });
      }
    },

    close: () => set({ active: false, cropDraft: null }),

    setTarget: async (file) => {
      if (!file.type.startsWith('image/')) {
        toast('The main picture must be a picture');
        return;
      }
      try {
        const { target, img } = await readTarget(file, { ...FULL_CROP });
        const old = get().target;
        if (old) URL.revokeObjectURL(old.url);
        targetImage = img;
        set({ target, grid: null, assignment: null, cropDraft: null });
        scheduleRebuild();
      } catch {
        toast(`Couldn't open "${file.name}"`);
      }
    },

    addTiles: async (files) => {
      const pictures = files.filter((f) => f.type.startsWith('image/'));
      const room = MAX_TILES - get().tiles.length;
      if (pictures.length > room) toast(`Up to ${MAX_TILES} tile pictures`, 'info');
      const batch = pictures.slice(0, Math.max(0, room));
      if (batch.length === 0) return;

      const added: MosaicTile[] = [];
      let failed = 0;
      for (let i = 0; i < batch.length; i++) {
        set({ status: { kind: 'loading', done: i, total: batch.length } });
        try {
          added.push(await prepareTile(batch[i]!, createId()));
        } catch {
          failed++;
        }
        // Show tiles as they arrive in big batches, without rebuilding each time.
        if (added.length && (i + 1) % 50 === 0) {
          set((s) => ({ tiles: [...s.tiles, ...added.splice(0)] }));
        }
      }
      set((s) => ({ tiles: [...s.tiles, ...added], status: { kind: 'idle' } }));
      if (failed) toast(`${failed} ${failed === 1 ? 'picture' : 'pictures'} couldn't be opened`);
      scheduleRebuild();
    },

    clearTiles: () => {
      set({ tiles: [], assignment: null });
      scheduleRebuild();
    },

    updateSettings: (patch) => {
      const before = get().settings;
      set({ settings: { ...before, ...patch } });
      // Only the grid size and repeat rule change which tiles go where.
      if (
        (patch.cols !== undefined && patch.cols !== before.cols) ||
        (patch.avoidRepeats !== undefined && patch.avoidRepeats !== before.avoidRepeats)
      ) {
        scheduleRebuild();
      }
    },

    startCrop: () => {
      const { target } = get();
      if (target) set({ cropDraft: { ...target.crop } });
    },
    setCropDraft: (cropDraft) => set({ cropDraft }),
    applyCrop: () => {
      const { target, cropDraft } = get();
      if (!target || !cropDraft) return;
      set({
        target: { ...target, crop: cropDraft },
        cropDraft: null,
        grid: null,
        assignment: null,
      });
      scheduleRebuild();
    },
    cancelCrop: () => set({ cropDraft: null }),
  };
});

// Keep the pictures and settings on the device, shortly after they change.
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let warned = false;
useMosaicStore.subscribe((s, prev) => {
  if (
    !s.loaded ||
    (s.target === prev.target && s.tiles === prev.tiles && s.settings === prev.settings)
  ) {
    return;
  }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { target, tiles, settings } = useMosaicStore.getState();
    const saved: SavedMosaic = {
      target: target ? { file: target.file, crop: target.crop } : null,
      tiles: tiles.map(saveTile),
      settings,
    };
    runDb('kv', 'readwrite', (store) => store.put(saved, STORAGE_KEY))
      .then(requestPersistence)
      .catch((e: unknown) => {
        if (warned) return;
        warned = true;
        toast(
          isQuotaError(e)
            ? 'Not enough space on this device to keep the mosaic pictures'
            : "Couldn't save the mosaic pictures on this device",
        );
      });
  }, 800);
});
