import {
  Eye,
  EyeOff,
  ImagePlus,
  Images,
  Triangle,
  Lock,
  LockOpen,
  RectangleHorizontal,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { PanelSection } from '@/components/ui/PanelSection';
import { createBadge, createText } from '@/constants/elements';
import { IconButton } from '@/components/ui/IconButton';
import { NumberStepper } from '@/components/ui/NumberStepper';
import { toDesignSize } from '@/constants/canvasSizes';
import { useAddPictures, useStickerUpload } from '@/hooks/useStickerUpload';
import { useSelectedElement } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import type { CanvasElement, ElementType } from '@/types';
import { cn } from '@/utils/cn';
import { isCharacter, MAX_CHARACTERS, setCharacterCount } from '@/utils/characterSlots';
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
  const updateElement = useEditorStore((s) => s.updateElement);
  const addPictures = useAddPictures();
  const picturesRef = useRef<HTMLInputElement>(null);
  const characterCount = useEditorStore((s) => s.elements.filter(isCharacter).length);

  /** Adds/removes character boxes to reach `count` and arranges them in a pyramid. */
  const applyCharacterCount = (count: number) => {
    const s = useEditorStore.getState();
    const result = setCharacterCount(s.elements, count, toDesignSize(s.canvasSize));
    if (
      result.removedFilled > 0 &&
      !window.confirm(
        `This removes ${result.removedFilled} character ${result.removedFilled === 1 ? 'picture' : 'pictures'}. Continue?`,
      )
    ) {
      return;
    }
    s.replaceElements(result.elements);
  };
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
        <Button
          size="sm"
          fullWidth
          className="mt-2"
          icon={<Images />}
          onClick={() => picturesRef.current?.click()}
        >
          Characters
        </Button>
        <HiddenFileInput
          ref={inputRef}
          accept="image/*"
          onFiles={(files) => uploadSticker(null, files)}
        />
        <HiddenFileInput ref={picturesRef} accept="image/*" multiple onFiles={addPictures} />
        <div className="mt-4 space-y-2">
          <NumberStepper
            label="Character boxes"
            value={characterCount}
            min={0}
            max={MAX_CHARACTERS}
            onChange={applyCharacterCount}
          />
          {characterCount > 1 && (
            <Button
              size="sm"
              variant="ghost"
              fullWidth
              icon={<Triangle />}
              onClick={() => applyCharacterCount(characterCount)}
            >
              Arrange in pyramid
            </Button>
          )}
        </div>
      </PanelSection>

      {elements.length > 0 && (
        <PanelSection title={`On the canvas (${elements.length})`}>
          {/* Top of the list = front-most, like layer lists in design apps. */}
          <ul className="space-y-1">
            {[...elements].reverse().map((el) => (
              <PieceRow
                key={el.id}
                element={el}
                selected={selected?.id === el.id}
                onSelect={() => select({ kind: 'element', id: el.id })}
                onChange={(patch) => updateElement(el.id, patch)}
              />
            ))}
          </ul>
        </PanelSection>
      )}

      {selected && <ElementEditor key={selected.id} element={selected} />}
    </div>
  );
}

interface PieceRowProps {
  element: CanvasElement;
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<CanvasElement>) => void;
}

/** One row of the list: thumbnail/icon and name, plus hide and lock switches. */
function PieceRow({ element: el, selected, onSelect, onChange }: PieceRowProps) {
  const Icon = TYPE_ICON[el.type];
  const thumb = el.type === 'sticker' ? el.src : null;
  return (
    <li
      className={cn(
        'flex items-center gap-1 rounded-lg pr-1 transition-colors',
        selected ? 'bg-brand-500/15 text-white' : 'text-neutral-300 hover:bg-neutral-800',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm',
          el.hidden && 'opacity-50',
        )}
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="size-7 shrink-0 rounded bg-neutral-800 object-contain"
            draggable={false}
          />
        ) : (
          <Icon className="size-4 shrink-0 text-neutral-500" aria-hidden />
        )}
        <span className="truncate">{describeElement(el)}</span>
      </button>
      <IconButton
        label={el.hidden ? 'Show' : 'Hide'}
        icon={el.hidden ? <EyeOff /> : <Eye />}
        className={cn('size-8', !el.hidden && 'text-neutral-500')}
        onClick={() => onChange({ hidden: !el.hidden })}
      />
      <IconButton
        label={el.locked ? 'Unlock' : 'Lock'}
        icon={el.locked ? <Lock /> : <LockOpen />}
        className={cn('size-8', !el.locked && 'text-neutral-500')}
        onClick={() => onChange({ locked: !el.locked })}
      />
    </li>
  );
}
