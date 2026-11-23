import { Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { Toggle } from '@/components/ui/Toggle';
import { useEditorStore } from '@/store/useEditorStore';
import { useTemplatesStore } from '@/store/useTemplatesStore';

/**
 * Name the design and save it to My templates. When the design came from a saved
 * template, it can update that one or be saved as a new one.
 */
export function SaveTemplateDialog() {
  const open = useTemplatesStore((s) => s.saveDialogOpen);
  const setOpen = useTemplatesStore((s) => s.setSaveDialogOpen);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  if (!open) return null;
  const close = () => setOpen(false);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-dialog-title"
        className="flex max-h-[88dvh] w-full flex-col rounded-t-2xl border border-neutral-800 bg-neutral-900 shadow-2xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-4 py-3">
          <h2 id="save-dialog-title" className="font-semibold">
            Save template
          </h2>
          <IconButton label="Close" icon={<X />} onClick={close} />
        </div>
        <div className="overflow-y-auto overscroll-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SaveForm onDone={close} />
        </div>
      </div>
    </div>
  );
}

function SaveForm({ onDone }: { onDone: () => void }) {
  const templates = useTemplatesStore((s) => s.templates);
  const currentId = useTemplatesStore((s) => s.currentId);
  const save = useTemplatesStore((s) => s.save);
  const hasMedia = useEditorStore((s) => Object.values(s.cells).some((items) => items.length > 0));
  const current = templates.find((t) => t.id === currentId);

  const [name, setName] = useState(current?.name ?? `My template ${templates.length + 1}`);
  const [withMedia, setWithMedia] = useState(current?.withMedia ?? false);
  const [busy, setBusy] = useState(false);

  const submit = async (update: boolean) => {
    setBusy(true);
    const ok = await save(name, hasMedia && withMedia, update);
    setBusy(false);
    if (ok) onDone();
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(Boolean(current));
      }}
    >
      <Field label="Name">
        {(id) => (
          <TextInput
            id={id}
            value={name}
            maxLength={60}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </Field>
      {hasMedia && (
        <Toggle
          label="Include box pictures and clips"
          checked={withMedia}
          onChange={setWithMedia}
        />
      )}
      <div className="space-y-2 pt-1">
        <Button type="submit" variant="primary" fullWidth icon={<Save />} loading={busy}>
          {current ? `Update "${current.name}"` : 'Save'}
        </Button>
        {current && (
          <Button fullWidth disabled={busy} onClick={() => void submit(false)}>
            Save as new
          </Button>
        )}
      </div>
    </form>
  );
}
