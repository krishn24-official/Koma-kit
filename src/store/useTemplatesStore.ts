import { create } from 'zustand';
import { isQuotaError } from '@/utils/db';
import { downloadBlob, sanitizeFileName } from '@/utils/download';
import { createId } from '@/utils/id';
import {
  captureDesign,
  deleteTemplate,
  listTemplates,
  putTemplate,
  renderThumbnail,
  restoreDesign,
  TEMPLATE_FILE_EXTENSION,
  templateFromFile,
  templateToFile,
  type SavedTemplate,
} from '@/utils/savedTemplates';
import { useEditorStore } from './useEditorStore';
import { usePlaybackStore } from './usePlaybackStore';
import { useUiStore } from './useUiStore';

interface TemplatesStore {
  templates: SavedTemplate[];
  /** Preview image URL per template id. */
  thumbs: Record<string, string>;
  /** False until the saved list has been read. */
  ready: boolean;
  /** The saved template the current design came from (or was last saved as). */
  currentId: string | null;
  saveDialogOpen: boolean;

  refresh: () => Promise<void>;
  /** Saves the current design; `update` replaces the current template instead of adding one. */
  save: (name: string, withMedia: boolean, update: boolean) => Promise<boolean>;
  load: (id: string) => void;
  remove: (id: string) => Promise<void>;
  exportFile: (id: string) => void;
  importFile: (file: File) => Promise<void>;
  /** Forget which template is open (e.g. after Reset or a starter template). */
  clearCurrent: () => void;
  setSaveDialogOpen: (open: boolean) => void;
}

const toastError = (message: string) => useUiStore.getState().showToast(message, 'error');

export const useTemplatesStore = create<TemplatesStore>()((set, get) => ({
  templates: [],
  thumbs: {},
  ready: false,
  currentId: null,
  saveDialogOpen: false,

  refresh: async () => {
    try {
      const templates = await listTemplates();
      Object.values(get().thumbs).forEach((url) => URL.revokeObjectURL(url));
      const thumbs: Record<string, string> = {};
      for (const t of templates) thumbs[t.id] = URL.createObjectURL(t.thumbnail);
      const { currentId } = get();
      set({
        templates,
        thumbs,
        ready: true,
        currentId: templates.some((t) => t.id === currentId) ? currentId : null,
      });
    } catch {
      set({ ready: true });
      toastError("Couldn't read saved templates in this browser");
    }
  },

  save: async (name, withMedia, update) => {
    const state = useEditorStore.getState();
    const now = Date.now();
    const existing = update ? get().templates.find((t) => t.id === get().currentId) : undefined;
    try {
      const template: SavedTemplate = {
        id: existing?.id ?? createId(),
        name: name.trim() || 'My template',
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        thumbnail: await renderThumbnail(state, withMedia),
        withMedia,
        design: captureDesign(state, withMedia),
      };
      await putTemplate(template);
      set({ currentId: template.id });
      await get().refresh();
      useUiStore.getState().showToast(`Saved "${template.name}"`, 'success');
      return true;
    } catch (e) {
      toastError(
        isQuotaError(e)
          ? 'Not enough space on this device. Try saving without box pictures and clips.'
          : "Couldn't save the template",
      );
      return false;
    }
  },

  load: (id) => {
    const template = get().templates.find((t) => t.id === id);
    if (!template) return;
    usePlaybackStore.getState().pause();
    usePlaybackStore.getState().seek(0);
    useEditorStore.getState().loadTemplate(restoreDesign(template.design));
    set({ currentId: id });
    useUiStore.getState().showToast(`Opened "${template.name}"`, 'success');
  },

  remove: async (id) => {
    try {
      await deleteTemplate(id);
      await get().refresh();
    } catch {
      toastError("Couldn't delete the template");
    }
  },

  exportFile: (id) => {
    const template = get().templates.find((t) => t.id === id);
    if (!template) return;
    downloadBlob(
      templateToFile(template),
      `${sanitizeFileName(template.name)}${TEMPLATE_FILE_EXTENSION}`,
    );
  },

  importFile: async (file) => {
    try {
      const template = await templateFromFile(file);
      await putTemplate(template);
      await get().refresh();
      useUiStore.getState().showToast(`Added "${template.name}" to My templates`, 'success');
    } catch (e) {
      toastError(
        isQuotaError(e)
          ? 'Not enough space on this device for this template'
          : e instanceof Error && e.message.startsWith('This is not')
            ? e.message
            : "Couldn't open that template file",
      );
    }
  },

  clearCurrent: () => set({ currentId: null }),
  setSaveDialogOpen: (saveDialogOpen) => set({ saveDialogOpen }),
}));
