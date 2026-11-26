/**
 * "My templates": designs saved in this browser (IndexedDB, which can hold pictures
 * and clips), plus a single-file format (.komakit) to move them to another device.
 *
 * A saved design keeps the original files (logos, background, optionally box media)
 * and drops the object URLs, which only live as long as the page. Loading creates
 * fresh URLs from the files.
 */
import { DESIGN_WIDTH } from '@/constants/canvasSizes';
import type { EditorState, TemplateDesign } from '@/store/useEditorStore';
import type { CanvasElement, CellMedia, CanvasStyle } from '@/types';
import { requestPersistence, runDb } from './db';
import { createEffects, createSticker } from '@/constants/elements';
import { canvasToBlob } from './download';
import { createId } from './id';
import { resolveLayout } from './layoutTree';
import { renderStill } from './renderToCanvas';
import { toDesignSize } from '@/constants/canvasSizes';

export interface SavedTemplate {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  /** Small JPEG preview. */
  thumbnail: Blob;
  /** True if box pictures/clips were saved too. */
  withMedia: boolean;
  design: TemplateDesign;
}

// ─── Saving and loading designs ─────────────────────────────────────────────

const stripStyle = (style: CanvasStyle): CanvasStyle =>
  style.backgroundImage
    ? { ...style, backgroundImage: { ...style.backgroundImage, src: '' } }
    : style;

const stripElement = (el: CanvasElement): CanvasElement =>
  el.type === 'sticker' && el.src ? { ...el, src: el.file ? '' : null } : el;

/** The parts of the current design a template keeps, without page-only URLs. */
export function captureDesign(s: EditorState, withMedia: boolean): TemplateDesign {
  const cells: Record<number, CellMedia[]> = {};
  if (withMedia) {
    for (const [key, items] of Object.entries(s.cells)) {
      cells[Number(key)] = items.map((item) => ({ ...item, src: '' }));
    }
  }
  return {
    layoutRoot: s.layoutRoot,
    presetId: s.presetId,
    canvasSize: s.canvasSize,
    style: stripStyle(s.style),
    boxFades: s.boxFades,
    boxEffects: s.boxEffects,
    elements: s.elements.map(stripElement),
    cells,
  };
}

/** A copy of a saved design that's ready to load: new URLs and ids for everything. */
export function restoreDesign(design: TemplateDesign): TemplateDesign {
  const url = (file: Blob) => URL.createObjectURL(file);
  const style = design.style;
  const cells: Record<number, CellMedia[]> = {};
  for (const [key, items] of Object.entries(design.cells ?? {})) {
    cells[Number(key)] = items.map((item) => ({ ...item, id: createId(), src: url(item.file) }));
  }
  return {
    ...design,
    style: style?.backgroundImage
      ? {
          ...style,
          backgroundImage: { ...style.backgroundImage, src: url(style.backgroundImage.file) },
        }
      : style,
    elements: (design.elements ?? []).map((el) => {
      // Designs saved by older versions miss newer fields: fill in the defaults.
      const copy =
        el.type === 'sticker'
          ? { ...createSticker(), ...el, id: createId() }
          : { ...el, hidden: el.hidden ?? false, locked: el.locked ?? false, id: createId() };
      if (copy.type === 'sticker' && copy.file) copy.src = url(copy.file);
      return copy;
    }),
    boxEffects: Object.fromEntries(
      Object.entries(design.boxEffects ?? {}).map(([key, e]) => [
        key,
        { ...createEffects(), ...e },
      ]),
    ),
    cells,
  };
}

const THUMB_WIDTH = 360;

/** Small preview of the current design (box media left out unless it's saved). */
export async function renderThumbnail(s: EditorState, withMedia: boolean): Promise<Blob> {
  const aspectRatio = toDesignSize(s.canvasSize);
  const canvas = await renderStill(
    {
      layout: resolveLayout(s.layoutRoot),
      aspectRatio,
      style: s.style,
      cells: withMedia ? s.cells : {},
      elements: s.elements,
      boxFades: s.boxFades,
      boxEffects: s.boxEffects,
    },
    THUMB_WIDTH / DESIGN_WIDTH,
    0,
  );
  return canvasToBlob(canvas, 'image/jpeg', 0.8);
}

// ─── Storage ─────────────────────────────────────────────────────────────────

/** Newest first. */
export async function listTemplates(): Promise<SavedTemplate[]> {
  const all = await runDb(
    'templates',
    'readonly',
    (store) => store.getAll() as IDBRequest<SavedTemplate[]>,
  );
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function putTemplate(template: SavedTemplate): Promise<void> {
  await runDb('templates', 'readwrite', (store) => store.put(template));
  requestPersistence();
}

export async function deleteTemplate(id: string): Promise<void> {
  await runDb('templates', 'readwrite', (store) => store.delete(id));
}

// ─── .komakit file ───────────────────────────────────────────────────────────
// Layout: "KOMAKIT1" | 4-byte JSON length | JSON | file bytes, one after another.
// In the JSON every file is {"$file": n, name, type}, and the files come in order n.

const MAGIC = 'KOMAKIT1';
export const TEMPLATE_FILE_EXTENSION = '.komakit';

interface FileRef {
  $file: number;
  name: string;
  type: string;
  size: number;
}

export function templateToFile(template: SavedTemplate): Blob {
  const files: Blob[] = [];
  const json = JSON.stringify(template, (_key, value: unknown) => {
    if (value instanceof Blob) {
      files.push(value);
      const ref: FileRef = {
        $file: files.length - 1,
        name: value instanceof File ? value.name : 'file',
        type: value.type,
        size: value.size,
      };
      return ref;
    }
    return value;
  });
  const jsonBytes = new TextEncoder().encode(json);
  const length = new Uint8Array(4);
  new DataView(length.buffer).setUint32(0, jsonBytes.length);
  return new Blob([MAGIC, length, jsonBytes, ...files], { type: 'application/octet-stream' });
}

const isFileRef = (v: unknown): v is FileRef =>
  typeof v === 'object' && v !== null && typeof (v as FileRef).$file === 'number';

/** Reads a .komakit file. Throws if it isn't one. The template gets a new id. */
export async function templateFromFile(file: Blob): Promise<SavedTemplate> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (new TextDecoder().decode(head.slice(0, 8)) !== MAGIC) {
    throw new Error('This is not a Koma Kit template file');
  }
  const jsonLength = new DataView(head.buffer).getUint32(8);
  const json = await file.slice(12, 12 + jsonLength).text();

  // File refs, in order, so their positions in the data can be worked out.
  const refs: FileRef[] = [];
  JSON.parse(json, (_key, value: unknown) => {
    if (isFileRef(value)) refs[value.$file] = value;
    return value;
  });
  const starts: number[] = [];
  let offset = 12 + jsonLength;
  refs.forEach((ref, i) => {
    starts[i] = offset;
    offset += ref.size;
  });

  const template = JSON.parse(json, (_key, value: unknown) => {
    if (!isFileRef(value)) return value;
    const start = starts[value.$file]!;
    const blob = file.slice(start, start + value.size, value.type);
    return new File([blob], value.name, { type: value.type });
  }) as SavedTemplate;

  return { ...template, id: createId(), updatedAt: Date.now() };
}
