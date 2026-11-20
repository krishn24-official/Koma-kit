import { ImagePlus, RectangleHorizontal, Type, type LucideIcon } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { PanelSection } from '@/components/ui/PanelSection';
import { createBadge, createText } from '@/constants/elements';
import { useStickerUpload } from '@/hooks/useStickerUpload';
import { useSelectedElement } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import type { ElementType } from '@/types';
import { cn } from '@/utils/cn';
import { describeElement } from '@/utils/elements';
import { ElementEditor } from './ElementEditor';

const TYPE_ICON: Record<ElementType, LucideIcon> = {
  text: Type,
  sticker: ImagePlus,
  badge: RectangleHorizontal,
};

/** Add and edit text, pictures (logos) and badges placed on top of the canvas. */
export function ElementsPanel() {
  const elements = useEditorStore((s) => s.elements);
  const addElement = useEditorStore((s) => s.addElement);
  const select = useEditorStore((s) => s.select);
  const selected = useSelectedElement();
  const uploadSticker = useStickerUpload();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      <PanelSection title="Add">
        <div className="grid grid-cols-3 gap-2">
          <Button size="sm" icon={<Type />} onClick={() => addElement(createText())}>
            Text
          </Button>
          <Button size="sm" icon={<ImagePlus />} onClick={() => inputRef.current?.click()}>
            Logo
          </Button>
          <Button
            size="sm"
            icon={<RectangleHorizontal />}
            onClick={() => addElement(createBadge())}
          >
            Badge
          </Button>
        </div>
        <HiddenFileInput
          ref={inputRef}
          accept="image/*"
          onFiles={(files) => uploadSticker(null, files)}
        />
      </PanelSection>

      {elements.length > 0 && (
        <PanelSection title={`On the canvas (${elements.length})`}>
          {/* Top of the list = front-most, like layer lists in design apps. */}
          <ul className="space-y-1">
            {[...elements].reverse().map((el) => {
              const Icon = TYPE_ICON[el.type];
              return (
                <li key={el.id}>
                  <button
                    type="button"
                    onClick={() => select({ kind: 'element', id: el.id })}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      selected?.id === el.id
                        ? 'bg-brand-500/15 text-white'
                        : 'text-neutral-300 hover:bg-neutral-800',
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-neutral-500" aria-hidden />
                    <span className="truncate">{describeElement(el)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </PanelSection>
      )}

      {selected && <ElementEditor key={selected.id} element={selected} />}
    </div>
  );
}
