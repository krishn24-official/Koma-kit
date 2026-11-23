import { create } from 'zustand';
import { isQuotaError, requestPersistence, runDb } from '@/utils/db';
import { canvasToBlob } from '@/utils/download';
import { createId } from '@/utils/id';
import { loadImage } from '@/utils/media';
import { captureDesign, restoreDesign } from '@/utils/savedTemplates';
import {
  DEFAULT_SHEET_SETTINGS,
  designAspect,
  renderDesign,
  type SheetCard,
  type SheetSettings,
} from '@/utils/sheet';
import { useEditorStore, type TemplateDesign } from './useEditorStore';
import { usePlaybackStore } from './usePlaybackStore';
import { useTemplatesStore } from './useTemplatesStore';
import { useUiStore } from './useUiStore';

/** Preview pictures are rendered this wide. */
const PREVIEW_WIDTH = 720;
const STORAGE_KEY = 'sheet';

interface SheetStore {
  /** The sheet view is showing (instead of the single-design editor). */
  active: boolean;
  /** The saved sheet has been read from storage. */
  loaded: boolean;
  cards: SheetCard[];
  settings: SheetSettings;
  /** Picture URL per card id, for the preview. */
  previews: Record<string, string>;
  selectedId: string | null;
  /** Card being edited in the editor, or null. */
  editingId: string | null;
  /** The editor's design from before the sheet opened; brought back on close. */
  stash: TemplateDesign | null;
  /** Cards still being added (rendering). */
  pending: number;

  /** Opens the sheet. `addCurrent: false` skips adding the open design as card 1. */
  open: (options?: { addCurrent?: boolean }) => Promise<void>;
  close: () => void;
  addDesign: (design: TemplateDesign) => Promise<void>;
  addImages: (files: File[]) => Promise<void>;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  move: (id: string, step: number) => void;
  select: (id: string | null) => void;
  updateSettings: (patch: Partial<SheetSettings>) => void;
  editCard: (id: string) => void;
  finishEditing: () => Promise<void>;
  cancelEditing: () => void;
}

const editorHasWork = () => {
  const s = useEditorStore.getState();
  return Object.keys(s.cells).length > 0 || s.elements.length > 0;
};

const previewUrl = (card: SheetCard) =>
  URL.createObjectURL(card.kind === 'design' ? card.preview : card.file);

/** Puts a design into the editor (new URLs), stopping playback first. */
function loadIntoEditor(design: TemplateDesign) {
  usePlaybackStore.getState().pause();
  usePlaybackStore.getState().seek(0);
  useEditorStore.getState().loadTemplate(restoreDesign(design));
  useTemplatesStore.getState().clearCurrent();
}

async function designCard(design: TemplateDesign, id = createId()): Promise<SheetCard> {
  const canvas = await renderDesign(design, PREVIEW_WIDTH);
  return {
    id,
    kind: 'design',
    design,
    preview: await canvasToBlob(canvas, 'image/jpeg', 0.85),
    aspect: designAspect(design),
  };
}

const toastError = (message: string) => useUiStore.getState().showToast(message, 'error');

export const useSheetStore = create<SheetStore>()((set, get) => {
  const insert = (card: SheetCard, afterId?: string | null) =>
    set((s) => {
      const at = afterId ? s.cards.findIndex((c) => c.id === afterId) + 1 : s.cards.length;
      const cards = [...s.cards];
      cards.splice(at > 0 ? at : cards.length, 0, card);
      return {
        cards,
        previews: { ...s.previews, [card.id]: previewUrl(card) },
        selectedId: card.id,
      };
    });

  return {
    active: false,
    loaded: false,
    cards: [],
    settings: { ...DEFAULT_SHEET_SETTINGS },
    previews: {},
    selectedId: null,
    editingId: null,
    stash: null,
    pending: 0,

    open: async ({ addCurrent = true } = {}) => {
      if (!get().loaded) {
        try {
          const saved = await runDb<{ cards: SheetCard[]; settings: SheetSettings } | undefined>(
            'kv',
            'readonly',
            (store) => store.get(STORAGE_KEY),
          );
          if (saved) {
            const previews: Record<string, string> = {};
            for (const card of saved.cards) previews[card.id] = previewUrl(card);
            set({
              cards: saved.cards,
              settings: { ...DEFAULT_SHEET_SETTINGS, ...saved.settings },
              previews,
            });
          }
        } catch {
          // Start with an empty sheet if storage can't be read.
        }
        set({ loaded: true });
      }
      const state = useEditorStore.getState();
      const stash = captureDesign(state, true);
      useEditorStore.getState().clearSelection();
      useUiStore.getState().closeMobilePanel();
      set({ active: true, stash, selectedId: null });
      // A fresh sheet starts with the design that's open, if there is one.
      if (addCurrent && get().cards.length === 0 && editorHasWork()) {
        await get().addDesign(stash);
      }
    },

    close: () => {
      const { stash } = get();
      if (stash) loadIntoEditor(stash);
      set({ active: false, stash: null, editingId: null, selectedId: null });
    },

    addDesign: async (design) => {
      set((s) => ({ pending: s.pending + 1 }));
      try {
        insert(await designCard(design), get().selectedId);
      } catch {
        toastError("Couldn't add that card");
      } finally {
        set((s) => ({ pending: s.pending - 1 }));
      }
    },

    addImages: async (files) => {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toastError(`"${file.name}" isn't a picture`);
          continue;
        }
        const url = URL.createObjectURL(file);
        try {
          const img = await loadImage(url);
          insert(
            { id: createId(), kind: 'image', file, aspect: img.naturalWidth / img.naturalHeight },
            get().selectedId,
          );
        } catch {
          toastError(`Couldn't open "${file.name}"`);
        } finally {
          URL.revokeObjectURL(url);
        }
      }
    },

    duplicate: (id) => {
      const card = get().cards.find((c) => c.id === id);
      if (card) insert({ ...card, id: createId() }, id);
    },

    remove: (id) =>
      set((s) => {
        const url = s.previews[id];
        if (url) URL.revokeObjectURL(url);
        const previews = { ...s.previews };
        delete previews[id];
        return {
          cards: s.cards.filter((c) => c.id !== id),
          previews,
          selectedId: s.selectedId === id ? null : s.selectedId,
        };
      }),

    move: (id, step) =>
      set((s) => {
        const from = s.cards.findIndex((c) => c.id === id);
        const to = from + step;
        if (from < 0 || to < 0 || to >= s.cards.length) return {};
        const cards = [...s.cards];
        const [card] = cards.splice(from, 1);
        cards.splice(to, 0, card!);
        return { cards };
      }),

    select: (selectedId) => set({ selectedId }),
    updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

    editCard: (id) => {
      const card = get().cards.find((c) => c.id === id);
      if (card?.kind !== 'design') return;
      loadIntoEditor(card.design);
      set({ active: false, editingId: id, selectedId: id });
    },

    finishEditing: async () => {
      const id = get().editingId;
      if (!id) return;
      set((s) => ({ pending: s.pending + 1 }));
      try {
        const card = await designCard(captureDesign(useEditorStore.getState(), true), id);
        set((s) => {
          const old = s.previews[id];
          if (old) URL.revokeObjectURL(old);
          return {
            cards: s.cards.map((c) => (c.id === id ? card : c)),
            previews: { ...s.previews, [id]: previewUrl(card) },
          };
        });
        set({ active: true, editingId: null });
        useUiStore.getState().closeMobilePanel();
      } catch {
        toastError("Couldn't update the card");
      } finally {
        set((s) => ({ pending: s.pending - 1 }));
      }
    },

    cancelEditing: () => set({ active: true, editingId: null }),
  };
});

// Autosave the sheet (cards with their files, and settings) shortly after changes.
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let warned = false;
useSheetStore.subscribe((s, prev) => {
  if (!s.loaded || (s.cards === prev.cards && s.settings === prev.settings)) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { cards, settings } = useSheetStore.getState();
    runDb('kv', 'readwrite', (store) => store.put({ cards, settings }, STORAGE_KEY))
      .then(requestPersistence)
      .catch((e: unknown) => {
        if (warned) return;
        warned = true;
        toastError(
          isQuotaError(e)
            ? 'Not enough space on this device to keep the sheet after closing'
            : "Couldn't save the sheet on this device",
        );
      });
  }, 600);
});
