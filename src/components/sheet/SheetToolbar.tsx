import { ChevronLeft, ChevronRight, Copy, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { useSheetStore } from '@/store/useSheetStore';
import { layoutSheet, sheetOutputSize } from '@/utils/sheet';

/** Bar under the sheet: size info, and actions for the selected card. */
export function SheetToolbar() {
  const cards = useSheetStore((s) => s.cards);
  const settings = useSheetStore((s) => s.settings);
  const selectedId = useSheetStore((s) => s.selectedId);
  const { editCard, move, duplicate, remove } = useSheetStore.getState();
  const index = cards.findIndex((c) => c.id === selectedId);
  const card = cards[index];

  if (!card) {
    if (cards.length === 0) return null;
    const out = sheetOutputSize(
      layoutSheet(
        cards.map((c) => c.aspect),
        settings,
      ),
    );
    return (
      <div className="flex h-14 shrink-0 items-center justify-center border-t border-neutral-800 px-3 text-xs text-neutral-400 tabular-nums">
        {cards.length} {cards.length === 1 ? 'card' : 'cards'} · {out.width} × {out.height} px
      </div>
    );
  }

  return (
    <div className="flex h-14 shrink-0 items-center justify-center gap-1 border-t border-neutral-800 px-3">
      <span className="mr-2 text-xs text-neutral-400 tabular-nums">
        Card {index + 1}/{cards.length}
      </span>
      {card.kind === 'design' && (
        <Button size="sm" variant="primary" icon={<Pencil />} onClick={() => editCard(card.id)}>
          Edit
        </Button>
      )}
      <IconButton
        label="Move earlier"
        icon={<ChevronLeft />}
        disabled={index === 0}
        onClick={() => move(card.id, -1)}
      />
      <IconButton
        label="Move later"
        icon={<ChevronRight />}
        disabled={index === cards.length - 1}
        onClick={() => move(card.id, 1)}
      />
      <IconButton label="Duplicate" icon={<Copy />} onClick={() => duplicate(card.id)} />
      <IconButton
        label="Delete card"
        icon={<Trash2 />}
        className="hover:text-red-400"
        onClick={() => {
          if (window.confirm(`Delete card ${index + 1}?`)) remove(card.id);
        }}
      />
    </div>
  );
}
