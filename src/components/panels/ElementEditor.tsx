import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Crop,
  FlipHorizontal2,
  ImagePlus,
  PenTool,
  Scissors,
  SquarePlus,
  ZoomIn,
  ZoomOut,
  Trash2,
} from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Field, TextArea, TextInput } from '@/components/ui/Field';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { PanelSection } from '@/components/ui/PanelSection';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import { TEXT_COLOR_SWATCHES } from '@/constants/editor';
import { ELEMENT_LIMITS } from '@/constants/elements';
import { useStickerCrop } from '@/hooks/useStickerCrop';
import { useStickerUpload } from '@/hooks/useStickerUpload';
import { useEditorStore } from '@/store/useEditorStore';
import type { BadgeElement, CanvasElement, StickerElement, TextAlign, TextElement } from '@/types';
import { badgeHeight, maxBadgeTextSize, resizeBadge, setBadgeTextSize } from '@/utils/elements';
import { cn } from '@/utils/cn';
import { isFrame, SHAPES, setStickerShape, shapeClipPath, zoomSticker } from '@/utils/stickerShape';
import { useFrameDraw } from '@/hooks/useFrameDraw';
import { isPiece, useCutoutActions } from '@/hooks/useCutoutActions';
import { EffectsSections } from './EffectsSections';
import { FontPicker } from './FontPicker';
import { TimingSection } from './TimingSection';

type Update<T> = (patch: Partial<T>) => void;

const ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const satisfies ReadonlyArray<{ value: TextAlign; label: string }>;

const percent = (v: number) => `${Math.round(v * 100)}%`;

function TextFields({ text, update }: { text: TextElement; update: Update<TextElement> }) {
  return (
    <>
      <PanelSection title="Text">
        <div className="space-y-4">
          <Field label="Text">
            {(id) => (
              <TextArea
                id={id}
                rows={2}
                value={text.text}
                placeholder="Type something…"
                onChange={(e) => update({ text: e.target.value })}
              />
            )}
          </Field>
          <SegmentedControl
            ariaLabel="Text alignment"
            options={ALIGN_OPTIONS}
            value={text.align}
            onChange={(align) => update({ align })}
          />
          <Slider
            label="Letter spacing"
            {...ELEMENT_LIMITS.letterSpacing}
            value={text.letterSpacing}
            onChange={(letterSpacing) => update({ letterSpacing })}
          />
        </div>
      </PanelSection>
      <PanelSection title="Font">
        <FontPicker value={text.fontId} onChange={(fontId) => update({ fontId })} />
      </PanelSection>
      <PanelSection title="Look">
        <div className="space-y-4">
          <ColorPicker
            label="Text color"
            value={text.color}
            swatches={TEXT_COLOR_SWATCHES}
            onChange={(color) => update({ color })}
          />
          <Slider
            label="Outline width"
            {...ELEMENT_LIMITS.strokeWidth}
            value={text.strokeWidth}
            onChange={(strokeWidth) => update({ strokeWidth })}
          />
          {text.strokeWidth > 0 && (
            <ColorPicker
              label="Outline color"
              value={text.strokeColor}
              swatches={TEXT_COLOR_SWATCHES}
              onChange={(strokeColor) => update({ strokeColor })}
            />
          )}
          <Toggle
            label="Drop shadow"
            checked={text.shadow}
            onChange={(shadow) => update({ shadow })}
          />
        </div>
      </PanelSection>
    </>
  );
}

function StickerFields({
  sticker,
  update,
}: {
  sticker: StickerElement;
  update: Update<StickerElement>;
}) {
  const uploadSticker = useStickerUpload();
  const { start: startCrop } = useStickerCrop();
  const { start: drawFrame } = useFrameDraw();
  const { removeOriginal, moveToNewBox } = useCutoutActions();
  const frame = isFrame(sticker);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <PanelSection title="Picture">
        <div className={sticker.src ? 'grid grid-cols-2 gap-2' : undefined}>
          {sticker.src && (
            <Button variant="primary" icon={<Crop />} onClick={() => startCrop(sticker.id)}>
              Crop
            </Button>
          )}
          <Button
            variant={sticker.src ? 'secondary' : 'primary'}
            fullWidth
            icon={<ImagePlus />}
            onClick={() => inputRef.current?.click()}
          >
            {sticker.src ? 'Replace' : `Choose ${sticker.label.toLowerCase()}`}
          </Button>
          {sticker.src && (
            <>
              <Button icon={<ZoomOut />} onClick={() => update(zoomSticker(sticker, 1 / 1.15))}>
                Zoom out
              </Button>
              <Button icon={<ZoomIn />} onClick={() => update(zoomSticker(sticker, 1.15))}>
                Zoom in
              </Button>
              <Button icon={<FlipHorizontal2 />} onClick={() => update({ flipX: !sticker.flipX })}>
                Flip
              </Button>
              <Button
                icon={<Scissors />}
                onClick={() => drawFrame({ kind: 'element', id: sticker.id })}
              >
                Cut out
              </Button>
            </>
          )}
        </div>
        <HiddenFileInput
          ref={inputRef}
          accept="image/*"
          onFiles={(files) => uploadSticker(sticker.id, files)}
        />
      </PanelSection>
      {isPiece(sticker) && (
        <PanelSection title="Cut-out">
          <div className={sticker.cutFrom ? 'grid grid-cols-2 gap-2' : undefined}>
            {sticker.cutFrom && (
              <Button variant="danger" icon={<Trash2 />} onClick={() => removeOriginal(sticker)}>
                Remove original
              </Button>
            )}
            <Button fullWidth icon={<SquarePlus />} onClick={() => void moveToNewBox(sticker)}>
              Move to new box
            </Button>
          </div>
        </PanelSection>
      )}
      {(sticker.src || frame) && (
        <PanelSection title="Shape">
          <div className="grid grid-cols-3 gap-2">
            {SHAPES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={sticker.shape === id}
                onClick={() => update(setStickerShape(sticker, id))}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border py-2 text-xs transition-colors',
                  sticker.shape === id
                    ? 'border-brand-500 bg-brand-500/10 text-white'
                    : 'border-neutral-800 text-neutral-300 hover:border-neutral-600',
                )}
              >
                <span
                  className={cn('h-7 bg-neutral-300', id === 'none' ? 'w-10' : 'w-7')}
                  style={{ clipPath: shapeClipPath(id, 28, 28) }}
                  aria-hidden
                />
                {label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={sticker.shape === 'custom'}
              onClick={() => drawFrame({ kind: 'element', id: sticker.id })}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-lg border py-2 text-xs transition-colors',
                sticker.shape === 'custom'
                  ? 'border-brand-500 bg-brand-500/10 text-white'
                  : 'border-neutral-800 text-neutral-300 hover:border-neutral-600',
              )}
            >
              <PenTool className="size-7 p-1 text-neutral-300" aria-hidden />
              {sticker.src ? 'Cut out' : sticker.shape === 'custom' ? 'Redraw' : 'Draw'}
            </button>
          </div>
        </PanelSection>
      )}
      {(sticker.src || frame) && <EffectsSections effects={sticker} update={update} />}
    </>
  );
}

const BADGE_FILL_SWATCHES = [
  '#ffffff',
  '#000000',
  '#e11d48',
  '#f59e0b',
  '#2563eb',
  '#16a34a',
  '#7c3aed',
];

/**
 * Badge settings, most-used first: text, colors, size, then shape and font.
 */
function BadgeFields({ badge, update }: { badge: BadgeElement; update: Update<BadgeElement> }) {
  const height = badgeHeight(badge);
  return (
    <>
      <PanelSection title="Badge">
        <Field label="Text">
          {(id) => (
            <TextInput
              id={id}
              value={badge.text}
              onChange={(e) => update({ text: e.target.value })}
            />
          )}
        </Field>
      </PanelSection>

      <PanelSection title="Colors">
        <div className="space-y-4">
          <ColorPicker
            label="Text color"
            value={badge.textColor}
            swatches={TEXT_COLOR_SWATCHES}
            onChange={(textColor) => update({ textColor })}
          />
          <Toggle
            label="Filled badge"
            checked={badge.fill !== null}
            onChange={(on) => update({ fill: on ? '#e11d48' : null })}
          />
          {badge.fill !== null && (
            <ColorPicker
              label="Badge color"
              value={badge.fill}
              swatches={BADGE_FILL_SWATCHES}
              onChange={(fill) => update({ fill })}
            />
          )}
          <Slider
            label="Border width"
            {...ELEMENT_LIMITS.borderWidth}
            step={0.5}
            value={badge.borderWidth}
            onChange={(borderWidth) => update({ borderWidth })}
          />
          {badge.borderWidth > 0 && (
            <ColorPicker
              label="Border color"
              value={badge.borderColor}
              swatches={TEXT_COLOR_SWATCHES}
              onChange={(borderColor) => update({ borderColor })}
            />
          )}
        </div>
      </PanelSection>

      <PanelSection title="Size">
        <div className="space-y-4">
          <Slider
            label="Badge size"
            min={12}
            max={240}
            value={height}
            onChange={(h) => update(resizeBadge(badge, h / height))}
            formatValue={(v) => String(Math.round(v))}
          />
          <Slider
            label="Text size"
            min={ELEMENT_LIMITS.fontSize.min}
            max={Math.max(ELEMENT_LIMITS.fontSize.min + 1, Math.floor(maxBadgeTextSize(badge)))}
            value={badge.fontSize}
            onChange={(size) => update(setBadgeTextSize(badge, size))}
            formatValue={(v) => String(Math.round(v))}
          />
        </div>
      </PanelSection>

      <PanelSection title="Shape">
        <div className="space-y-4">
          <Slider
            label="Roundness"
            min={0}
            max={1}
            step={0.05}
            value={badge.roundness}
            onChange={(roundness) => update({ roundness })}
            formatValue={percent}
          />
          <Slider
            label="Width padding"
            {...ELEMENT_LIMITS.padding}
            step={0.1}
            value={badge.paddingX}
            onChange={(paddingX) => update({ paddingX })}
            formatValue={(v) => v.toFixed(1)}
          />
          <Slider
            label="Height padding"
            min={0}
            max={1.5}
            step={0.05}
            value={badge.paddingY}
            onChange={(paddingY) => update({ paddingY })}
            formatValue={(v) => v.toFixed(2)}
          />
          <Slider
            label="Letter spacing"
            {...ELEMENT_LIMITS.letterSpacing}
            value={badge.letterSpacing}
            onChange={(letterSpacing) => update({ letterSpacing })}
          />
        </div>
      </PanelSection>

      <PanelSection title="Font">
        <FontPicker value={badge.fontId} onChange={(fontId) => update({ fontId })} />
      </PanelSection>
    </>
  );
}

/** Settings for the selected element: type-specific fields, then size/position/order. */
export function ElementEditor({ element }: { element: CanvasElement }) {
  const updateElement = useEditorStore((s) => s.updateElement);
  const removeElement = useEditorStore((s) => s.removeElement);
  const duplicateElement = useEditorStore((s) => s.duplicateElement);
  const moveElement = useEditorStore((s) => s.moveElement);
  const moveElementToEnd = useEditorStore((s) => s.moveElementToEnd);
  const update = (patch: Partial<CanvasElement>) => updateElement(element.id, patch);

  // Badges have their own Badge size / Text size sliders.
  const size =
    element.type === 'sticker'
      ? {
          label: 'Width',
          ...ELEMENT_LIMITS.stickerWidth,
          value: element.width,
          key: 'width' as const,
        }
      : element.type === 'text'
        ? {
            label: 'Size',
            ...ELEMENT_LIMITS.fontSize,
            value: element.fontSize,
            key: 'fontSize' as const,
          }
        : null;

  return (
    <div className="space-y-6">
      {element.type === 'text' && <TextFields text={element} update={update} />}
      {element.type === 'sticker' && <StickerFields sticker={element} update={update} />}
      {element.type === 'badge' && <BadgeFields badge={element} update={update} />}

      <TimingSection element={element} />

      <PanelSection title={element.type === 'badge' ? 'Position' : 'Size & position'}>
        <div className="space-y-4">
          {size && (
            <Slider
              label={size.label}
              min={size.min}
              max={size.max}
              value={size.value}
              onChange={(v) => update({ [size.key]: v })}
              formatValue={(v) => String(Math.round(v))}
            />
          )}
          <Slider
            label="Rotation"
            {...ELEMENT_LIMITS.rotation}
            value={element.rotation}
            onChange={(rotation) => update({ rotation })}
            formatValue={(v) => `${v}°`}
          />
          <Slider
            label="Opacity"
            min={0.1}
            max={1}
            step={0.05}
            value={element.opacity}
            onChange={(opacity) => update({ opacity })}
            formatValue={percent}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" icon={<AlignCenterVertical />} onClick={() => update({ x: 0.5 })}>
              Center X
            </Button>
            <Button size="sm" icon={<AlignCenterHorizontal />} onClick={() => update({ y: 0.5 })}>
              Center Y
            </Button>
            <Button size="sm" icon={<ArrowUp />} onClick={() => moveElement(element.id, 1)}>
              Forward
            </Button>
            <Button size="sm" icon={<ArrowDown />} onClick={() => moveElement(element.id, -1)}>
              Backward
            </Button>
            <Button
              size="sm"
              icon={<ChevronsUp />}
              onClick={() => moveElementToEnd(element.id, 'front')}
            >
              To front
            </Button>
            <Button
              size="sm"
              icon={<ChevronsDown />}
              onClick={() => moveElementToEnd(element.id, 'back')}
            >
              To back
            </Button>
          </div>
        </div>
      </PanelSection>

      <div className="grid grid-cols-2 gap-2">
        <Button icon={<Copy />} onClick={() => duplicateElement(element.id)}>
          Duplicate
        </Button>
        <Button variant="danger" icon={<Trash2 />} onClick={() => removeElement(element.id)}>
          Delete
        </Button>
      </div>
    </div>
  );
}
