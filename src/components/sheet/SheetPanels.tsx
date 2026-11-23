import { ArrowLeft, ClipboardPaste, ImagePlus, LayoutTemplate, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { IconButton } from '@/components/ui/IconButton';
import { PanelSection } from '@/components/ui/PanelSection';
import { Slider } from '@/components/ui/Slider';
import { BACKGROUND_SWATCHES } from '@/constants/editor';
import { STARTER_TEMPLATES } from '@/constants/templates';
import { canReadClipboard, usePaste } from '@/hooks/usePaste';
import { useSheetStore } from '@/store/useSheetStore';
import { useTemplatesStore } from '@/store/useTemplatesStore';
import { cn } from '@/utils/cn';
import { SHEET_LIMITS } from '@/utils/sheet';

const px = (v: number) => `${Math.round(v)} px`;

/** Add cards (pictures, blank, saved or starter designs) and the list of cards. */
export function SheetCardsPanel() {
  const cards = useSheetStore((s) => s.cards);
  const previews = useSheetStore((s) => s.previews);
  const selectedId = useSheetStore((s) => s.selectedId);
  const { addDesign, addImages, select, editCard, remove, close } = useSheetStore.getState();
  const templates = useTemplatesStore((s) => s.templates);
  const thumbs = useTemplatesStore((s) => s.thumbs);
  const inputRef = useRef<HTMLInputElement>(null);
  const { pasteFromClipboard } = usePaste();

  useEffect(() => {
    if (!useTemplatesStore.getState().ready) void useTemplatesStore.getState().refresh();
  }, []);

  return (
    <div className="space-y-6">
      <Button fullWidth icon={<ArrowLeft />} onClick={close}>
        Back to single design
      </Button>

      <PanelSection title="Add card">
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="sm"
            variant="primary"
            icon={<ImagePlus />}
            onClick={() => inputRef.current?.click()}
          >
            Image cards
          </Button>
          <Button size="sm" icon={<LayoutTemplate />} onClick={() => void addDesign({})}>
            Blank card
          </Button>
          {canReadClipboard() && (
            <Button
              size="sm"
              icon={<ClipboardPaste />}
              className="col-span-2"
              onClick={() => void pasteFromClipboard()}
            >
              Paste picture card
            </Button>
          )}
          {STARTER_TEMPLATES.map(({ id, name, icon: Icon, build }) => (
            <Button key={id} size="sm" icon={<Icon />} onClick={() => void addDesign(build())}>
              {name}
            </Button>
          ))}
        </div>
        {templates.length > 0 && (
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  title={`Add "${t.name}"`}
                  onClick={() => void addDesign(t.design)}
                  className="block w-full overflow-hidden rounded-lg border border-neutral-800 text-left hover:border-brand-500"
                >
                  <span className="flex h-14 items-center justify-center bg-neutral-950">
                    {thumbs[t.id] && (
                      <img src={thumbs[t.id]} alt="" className="max-h-full max-w-full" />
                    )}
                  </span>
                  <span className="block truncate px-1.5 py-1 text-[11px] text-neutral-300">
                    {t.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <HiddenFileInput ref={inputRef} accept="image/*" multiple onFiles={addImages} />
      </PanelSection>

      {cards.length > 0 && (
        <PanelSection title={`Cards (${cards.length})`}>
          <ul className="space-y-1">
            {cards.map((card, i) => (
              <li
                key={card.id}
                className={cn(
                  'flex items-center gap-1 rounded-lg pr-1',
                  card.id === selectedId ? 'bg-brand-500/15' : 'hover:bg-neutral-800',
                )}
              >
                <button
                  type="button"
                  onClick={() => select(card.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm text-neutral-200"
                >
                  <img
                    src={previews[card.id]}
                    alt=""
                    className="h-8 w-12 shrink-0 rounded bg-neutral-800 object-contain"
                  />
                  <span className="truncate">
                    Card {i + 1}
                    <span className="ml-1.5 text-xs text-neutral-500">
                      {card.kind === 'image' ? 'Picture' : 'Design'}
                    </span>
                  </span>
                </button>
                {card.kind === 'design' && (
                  <IconButton
                    label="Edit card"
                    icon={<Pencil />}
                    className="size-8"
                    onClick={() => editCard(card.id)}
                  />
                )}
                <IconButton
                  label="Delete card"
                  icon={<Trash2 />}
                  className="size-8 hover:text-red-400"
                  onClick={() => {
                    if (window.confirm(`Delete card ${i + 1}?`)) remove(card.id);
                  }}
                />
              </li>
            ))}
          </ul>
        </PanelSection>
      )}
    </div>
  );
}

/** Columns, sizes, spacing and background of the sheet. */
export function SheetFormatPanel() {
  const settings = useSheetStore((s) => s.settings);
  const update = useSheetStore((s) => s.updateSettings);
  return (
    <PanelSection title="Format">
      <div className="space-y-4">
        <Slider
          label="Columns"
          {...SHEET_LIMITS.columns}
          value={settings.columns}
          onChange={(columns) => update({ columns })}
        />
        <Slider
          label="Card width"
          {...SHEET_LIMITS.cardWidth}
          step={10}
          value={settings.cardWidth}
          onChange={(cardWidth) => update({ cardWidth })}
          formatValue={px}
        />
        <Slider
          label="Gap"
          {...SHEET_LIMITS.gap}
          value={settings.gap}
          onChange={(gap) => update({ gap })}
          formatValue={px}
        />
        <Slider
          label="Outer border"
          {...SHEET_LIMITS.padding}
          value={settings.padding}
          onChange={(padding) => update({ padding })}
          formatValue={px}
        />
        <Slider
          label="Corner radius"
          {...SHEET_LIMITS.radius}
          value={settings.radius}
          onChange={(radius) => update({ radius })}
          formatValue={px}
        />
        <ColorPicker
          label="Background"
          value={settings.background}
          swatches={BACKGROUND_SWATCHES}
          onChange={(background) => update({ background })}
        />
      </div>
    </PanelSection>
  );
}
