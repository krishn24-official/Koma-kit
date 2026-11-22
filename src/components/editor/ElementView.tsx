import { useDrag, useGesture } from '@use-gesture/react';
import { ImagePlus } from 'lucide-react';
import { useRef, type CSSProperties } from 'react';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { useStickerUpload } from '@/hooks/useStickerUpload';
import { useEditorStore } from '@/store/useEditorStore';
import { useUiStore } from '@/store/useUiStore';
import type { BadgeElement, CanvasElement, Size, StickerElement, TextElement } from '@/types';
import { cn } from '@/utils/cn';
import { anchorFraction, scaleElement, stickerHeight } from '@/utils/elements';
import { clamp } from '@/utils/math';
import { adjustFilter, fadeMaskStyle, outlineFilter } from '@/utils/pictureEffects';
import { shapeClipPath } from '@/utils/stickerShape';
import { getBadgeRenderStyle, getTextRenderStyle } from '@/utils/textStyle';
import { CropFrame } from './CropFrame';

function TextContent({ text, unit }: { text: TextElement; unit: number }) {
  const s = getTextRenderStyle(text, unit);
  return (
    <div
      className="whitespace-pre"
      style={{
        fontFamily: `"${s.font.family}"`,
        fontWeight: s.font.weight,
        fontSize: s.fontSize,
        lineHeight: `${s.lineHeight}px`,
        letterSpacing: s.letterSpacing,
        textAlign: text.align,
        color: text.color,
        WebkitTextStroke: s.outline > 0 ? `${s.outline * 2}px ${text.strokeColor}` : undefined,
        paintOrder: 'stroke fill',
        textShadow: s.shadow
          ? `0 ${s.shadow.offsetY}px ${s.shadow.blur}px ${s.shadow.color}`
          : undefined,
      }}
    >
      {text.text || ' '}
    </div>
  );
}

/** Size of the whole (uncropped) picture on screen, in pixels. */
const fullPictureSize = (sticker: StickerElement, unit: number) => {
  const width = (sticker.width * unit) / sticker.crop.w;
  return { width, height: (width * sticker.naturalHeight) / sticker.naturalWidth };
};

function StickerContent({
  sticker,
  unit,
  plain,
}: {
  sticker: StickerElement;
  unit: number;
  /** Without effects or flip (while cropping, the crop frame shows the plain picture). */
  plain: boolean;
}) {
  const width = sticker.width * unit;
  const height = stickerHeight(sticker) * unit;
  if (sticker.src) {
    // Show only the cropped part: the full picture, shifted inside a clipping box.
    // Layers (outside in): glow/shadow → edge-fade mask → mirror + clip → picture colors.
    const full = fullPictureSize(sticker, unit);
    return (
      <div style={{ filter: plain ? undefined : outlineFilter(sticker, unit) }}>
        <div style={plain ? undefined : fadeMaskStyle(sticker.fade)}>
          <div
            className="relative overflow-hidden"
            style={{
              width,
              height,
              transform: sticker.flipX && !plain ? 'scaleX(-1)' : undefined,
              clipPath: plain ? undefined : shapeClipPath(sticker.shape, width, height),
            }}
          >
            <img
              src={sticker.src}
              alt=""
              draggable={false}
              className="absolute block max-w-none select-none"
              style={{
                width: full.width,
                height: full.height,
                left: -sticker.crop.x * full.width,
                top: -sticker.crop.y * full.height,
                filter: plain ? undefined : adjustFilter(sticker.adjust),
              }}
            />
          </div>
        </div>
      </div>
    );
  }
  // Empty slot: shown in the editor only, never exported.
  return (
    <div
      className="flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-white/60 bg-black/30 text-white/90"
      style={{ width, height, fontSize: clamp(height * 0.18, 9, 16) }}
    >
      <ImagePlus style={{ width: '1.6em', height: '1.6em' }} aria-hidden />
      <span className="font-medium whitespace-nowrap">{sticker.label}</span>
    </div>
  );
}

function BadgeContent({ badge, unit }: { badge: BadgeElement; unit: number }) {
  const s = getBadgeRenderStyle(badge, unit);
  return (
    <div
      className="box-border flex items-center justify-center whitespace-nowrap"
      style={{
        height: s.height,
        padding: `0 ${s.paddingX}px`,
        border: s.borderWidth > 0 ? `${s.borderWidth}px solid ${badge.borderColor}` : 'none',
        borderRadius: s.radius,
        background: badge.fill ?? 'transparent',
        color: badge.textColor,
        fontFamily: `"${s.font.family}"`,
        fontWeight: s.font.weight,
        fontSize: s.fontSize,
        lineHeight: 1,
        letterSpacing: s.letterSpacing,
      }}
    >
      {/* Cancels the spacing after the last letter so the text is centred (as in export). */}
      <span style={{ marginRight: -s.letterSpacing }}>{badge.text || ' '}</span>
    </div>
  );
}

/**
 * Crop mode for a picture: shows the whole picture in place, with a crop frame over it.
 * Rendered inside the element (so it follows its rotation), aligned so the currently
 * shown part stays exactly where it is.
 */
function StickerCropper({ sticker, unit }: { sticker: StickerElement; unit: number }) {
  const crop = useUiStore((s) => s.stickerCrop);
  const setStickerCrop = useUiStore((s) => s.setStickerCrop);
  if (!crop || !sticker.src) return null;
  const full = fullPictureSize(sticker, unit);

  return (
    <div
      className="absolute z-10"
      style={{
        left: -sticker.crop.x * full.width,
        top: -sticker.crop.y * full.height,
        width: full.width,
        height: full.height,
      }}
    >
      <img
        src={sticker.src}
        alt=""
        draggable={false}
        className="absolute inset-0 block size-full max-w-none select-none"
      />
      <CropFrame
        rect={crop.rect}
        onChange={(rect) => setStickerCrop({ id: sticker.id, rect })}
        size={full}
        rotation={sticker.rotation}
        minSize={0.05}
        label={`${Math.round(crop.rect.w * sticker.naturalWidth)} × ${Math.round(crop.rect.h * sticker.naturalHeight)}`}
      />
    </div>
  );
}

/** Resize dots on every corner; each scales the element around its centre. */
const RESIZE_CORNERS = [
  { label: 'top left', className: '-top-5 -left-5 cursor-nwse-resize' },
  { label: 'top right', className: '-top-5 -right-5 cursor-nesw-resize' },
  { label: 'bottom left', className: '-bottom-5 -left-5 cursor-nesw-resize' },
  { label: 'bottom right', className: '-right-5 -bottom-5 cursor-nwse-resize' },
] as const;

interface ElementViewProps {
  element: CanvasElement;
  /** Preview pixels per design unit. */
  unit: number;
  canvasSize: Size;
}

/**
 * Any element on the canvas. Tap to select, drag to move, drag a corner dot (or pinch) to
 * resize. Tapping an empty logo slot opens the file picker.
 */
export function ElementView({ element, unit, canvasSize }: ElementViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadSticker = useStickerUpload();
  const isSelected = useEditorStore(
    (s) => s.selection?.kind === 'element' && s.selection.id === element.id,
  );
  const id = element.id;
  const isEmptySlot = element.type === 'sticker' && !element.src;
  const isCropping = useUiStore((s) => s.stickerCrop?.id === id);

  const select = () => {
    useEditorStore.getState().select({ kind: 'element', id });
    useUiStore.getState().setActivePanel('elements');
  };

  // Drag to move; pinch with two fingers to make it bigger or smaller.
  const bindMove = useGesture(
    {
      onDrag: ({ delta: [dx, dy], first, tap, pinching, cancel }) => {
        if (pinching) return cancel();
        const store = useEditorStore.getState();
        if (first || tap) select();
        if (tap) {
          if (isEmptySlot) inputRef.current?.click();
          return;
        }
        const current = store.elements.find((el) => el.id === id);
        if (!current) return;
        store.updateElement(id, {
          x: clamp(current.x + dx / canvasSize.width, 0, 1),
          y: clamp(current.y + dy / canvasSize.height, 0, 1),
        });
      },
      // movement[0] is the scale since the pinch started (1 = unchanged).
      onPinch: ({ movement: [scale], first, memo }) => {
        let start = memo as CanvasElement | undefined;
        if (first || !start) {
          start = useEditorStore.getState().elements.find((e) => e.id === id);
          if (!start) return memo;
          select();
        }
        useEditorStore.getState().updateElement(id, scaleElement(start, scale));
        return start;
      },
    },
    { drag: { filterTaps: true }, pinch: { pinchOnWheel: false, rubberband: false } },
  );

  // Resizes around the anchor: the size follows the pointer's distance from it.
  const bindResize = useDrag(
    ({ xy: [px, py], first, memo, event }) => {
      event.stopPropagation();
      type Memo = { ax: number; ay: number; d0: number; start: CanvasElement };
      let start = memo as Memo | undefined;
      if (first || !start) {
        const canvas = ref.current?.closest('[data-canvas]')?.getBoundingClientRect();
        const el = useEditorStore.getState().elements.find((e) => e.id === id);
        if (!canvas || !el) return memo;
        const ax = canvas.left + el.x * canvas.width;
        const ay = canvas.top + el.y * canvas.height;
        start = { ax, ay, d0: Math.max(8, Math.hypot(px - ax, py - ay)), start: el };
      }
      const factor = Math.hypot(px - start.ax, py - start.ay) / start.d0;
      useEditorStore.getState().updateElement(id, scaleElement(start.start, factor));
      return start;
    },
    { pointer: { capture: true } },
  );

  if (element.hidden) return null;

  const a = anchorFraction(element);
  const style: CSSProperties = {
    left: element.x * canvasSize.width,
    top: element.y * canvasSize.height,
    transform: `translate(${-a * 100}%, -50%) rotate(${element.rotation}deg)`,
    transformOrigin: `${a * 100}% 50%`,
    opacity: element.opacity,
  };

  return (
    <div
      ref={ref}
      {...bindMove()}
      className={cn(
        'absolute touch-none select-none',
        element.locked && !isCropping ? 'pointer-events-none' : 'pointer-events-auto cursor-move',
        isSelected && !isCropping && 'outline-2 outline-offset-4 outline-brand-500 outline-dashed',
        isCropping && 'z-10',
      )}
      style={style}
    >
      {element.type === 'text' && <TextContent text={element} unit={unit} />}
      {element.type === 'sticker' && (
        <StickerContent sticker={element} unit={unit} plain={isCropping} />
      )}
      {element.type === 'badge' && <BadgeContent badge={element} unit={unit} />}
      {isCropping && element.type === 'sticker' && <StickerCropper sticker={element} unit={unit} />}

      {isSelected &&
        !isCropping &&
        !element.locked &&
        RESIZE_CORNERS.map((corner) => (
          <div
            key={corner.label}
            {...bindResize()}
            role="slider"
            aria-label={`Drag to resize (${corner.label})`}
            aria-valuenow={0}
            className={cn(
              'absolute flex size-8 touch-none items-center justify-center',
              corner.className,
            )}
          >
            <span className="size-3.5 rounded-full border-2 border-brand-500 bg-white shadow" />
          </div>
        ))}

      {element.type === 'sticker' && (
        <HiddenFileInput
          ref={inputRef}
          accept="image/*"
          onFiles={(files) => uploadSticker(id, files)}
        />
      )}
    </div>
  );
}
