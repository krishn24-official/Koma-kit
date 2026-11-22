import { ImagePlus, LayoutTemplate, Loader2 } from 'lucide-react';
import { useMemo, useRef, useState, type DragEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { useContainerSize } from '@/hooks/useContainerSize';
import { useSheetStore } from '@/store/useSheetStore';
import { cn } from '@/utils/cn';
import { layoutSheet } from '@/utils/sheet';

const ROOM = 16;

/**
 * Preview of the card sheet, fitted to the width (scroll down for long sheets).
 * Tap a card to select it, double-click to edit it; drop pictures to add image cards.
 */
export function SheetWorkspace() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const container = useContainerSize(scrollRef);
  const cards = useSheetStore((s) => s.cards);
  const settings = useSheetStore((s) => s.settings);
  const previews = useSheetStore((s) => s.previews);
  const selectedId = useSheetStore((s) => s.selectedId);
  const pending = useSheetStore((s) => s.pending);
  const { select, editCard, addImages, addDesign } = useSheetStore.getState();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const layout = useMemo(
    () =>
      layoutSheet(
        cards.map((c) => c.aspect),
        settings,
      ),
    [cards, settings],
  );
  const available = Math.max(0, container.width - ROOM * 2);
  const scale = layout.size.width > 0 ? Math.min(1, available / layout.size.width) : 0;

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void addImages(Array.from(e.dataTransfer.files));
  };

  return (
    <div
      ref={scrollRef}
      className={cn(
        'relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-4',
        dragOver && 'bg-brand-500/5',
      )}
      style={{
        backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.06) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      onPointerDown={(e) => {
        if (!(e.target as HTMLElement).closest('[data-sheet-card]')) select(null);
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragOver(false)}
      onDrop={onDrop}
    >
      {cards.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-3">
          {pending > 0 ? (
            <Loader2 className="size-6 animate-spin text-neutral-400" aria-hidden />
          ) : (
            <>
              <Button
                variant="primary"
                icon={<ImagePlus />}
                onClick={() => inputRef.current?.click()}
              >
                Add image cards
              </Button>
              <Button icon={<LayoutTemplate />} onClick={() => void addDesign({})}>
                Add blank card
              </Button>
            </>
          )}
        </div>
      ) : (
        scale > 0 && (
          <div
            data-sheet
            className="relative mx-auto shadow-2xl shadow-black/50"
            style={{
              width: layout.size.width * scale,
              height: layout.size.height * scale,
              background: settings.background,
            }}
          >
            {cards.map((card, i) => {
              const r = layout.rects[i]!;
              return (
                <button
                  key={card.id}
                  type="button"
                  data-sheet-card
                  aria-label={`Card ${i + 1}`}
                  aria-pressed={card.id === selectedId}
                  className="absolute overflow-hidden"
                  style={{
                    left: r.x * scale,
                    top: r.y * scale,
                    width: r.width * scale,
                    height: r.height * scale,
                    borderRadius: settings.radius * scale,
                  }}
                  onClick={() => select(card.id)}
                  onDoubleClick={() => editCard(card.id)}
                >
                  <img
                    src={previews[card.id]}
                    alt=""
                    draggable={false}
                    className="block size-full select-none"
                  />
                  {card.id === selectedId && (
                    <span
                      className="pointer-events-none absolute inset-0 ring-3 ring-brand-500 ring-inset"
                      style={{ borderRadius: settings.radius * scale }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )
      )}
      {pending > 0 && cards.length > 0 && (
        <div className="pointer-events-none absolute top-3 right-3 rounded-full bg-neutral-900/90 p-2">
          <Loader2 className="size-4 animate-spin text-neutral-300" aria-hidden />
        </div>
      )}
      <HiddenFileInput ref={inputRef} accept="image/*" multiple onFiles={addImages} />
    </div>
  );
}
