import { FileDown, FileUp, Save, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { IconButton } from '@/components/ui/IconButton';
import { PanelSection } from '@/components/ui/PanelSection';
import { useEditorStore } from '@/store/useEditorStore';
import { useTemplatesStore } from '@/store/useTemplatesStore';
import { cn } from '@/utils/cn';

const hasWork = () => {
  const s = useEditorStore.getState();
  return Object.keys(s.cells).length > 0 || s.elements.length > 0;
};

/** Designs saved on this device: tap to open, plus save, file export/import and delete. */
export function MyTemplatesSection() {
  const templates = useTemplatesStore((s) => s.templates);
  const thumbs = useTemplatesStore((s) => s.thumbs);
  const ready = useTemplatesStore((s) => s.ready);
  const currentId = useTemplatesStore((s) => s.currentId);
  const { refresh, load, remove, exportFile, importFile, setSaveDialogOpen } =
    useTemplatesStore.getState();
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!useTemplatesStore.getState().ready) void refresh();
  }, [refresh]);

  const open = (id: string, name: string) => {
    if (
      id !== currentId &&
      hasWork() &&
      !window.confirm(`Open "${name}"? Your current design will be replaced.`)
    ) {
      return;
    }
    load(id);
  };

  return (
    <PanelSection
      title="My templates"
      action={
        <Button size="sm" variant="primary" icon={<Save />} onClick={() => setSaveDialogOpen(true)}>
          Save
        </Button>
      }
    >
      {ready && templates.length > 0 && (
        <ul className="grid grid-cols-2 gap-2">
          {templates.map((t) => (
            <li
              key={t.id}
              className={cn(
                'overflow-hidden rounded-xl border bg-neutral-900',
                t.id === currentId ? 'border-brand-500' : 'border-neutral-800',
              )}
            >
              <button
                type="button"
                onClick={() => open(t.id, t.name)}
                className="block w-full text-left"
                title={`Open "${t.name}"`}
              >
                <span className="flex h-24 items-center justify-center bg-neutral-950">
                  {thumbs[t.id] && (
                    <img
                      src={thumbs[t.id]}
                      alt=""
                      draggable={false}
                      className="max-h-full max-w-full object-contain"
                    />
                  )}
                </span>
                <span className="block truncate px-2 pt-1.5 text-xs font-medium text-neutral-200">
                  {t.name}
                </span>
              </button>
              <div className="flex justify-end px-1 pb-1">
                <IconButton
                  label="Save as file"
                  icon={<FileDown />}
                  className="size-8"
                  onClick={() => exportFile(t.id)}
                />
                <IconButton
                  label="Delete"
                  icon={<Trash2 />}
                  className="size-8 hover:text-red-400"
                  onClick={() => {
                    if (window.confirm(`Delete "${t.name}"?`)) void remove(t.id);
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button
        size="sm"
        variant="ghost"
        fullWidth
        className={templates.length > 0 ? 'mt-2' : undefined}
        icon={<FileUp />}
        onClick={() => importRef.current?.click()}
      >
        Open template file
      </Button>
      {/* No type filter: Android can't match the .komakit extension and would grey it out. */}
      <HiddenFileInput
        ref={importRef}
        accept=""
        onFiles={([file]) => file && void importFile(file)}
      />
    </PanelSection>
  );
}
