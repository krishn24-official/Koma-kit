import { Check, RotateCcw, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CropFrame } from '@/components/editor/CropFrame';
import { FULL_CROP } from '@/constants/elements';
import { useMosaicStore } from '@/store/useMosaicStore';
import type { Size } from '@/types';

/** Room around the picture and for the buttons. */
const PAD = 24;
const BAR = 64;

/**
 * Crop the main picture, e.g. to just the face, so the mosaic uses only that part.
 * Shown in place of the mosaic preview.
 */
export function MosaicCropper({ size }: { size: Size }) {
  const target = useMosaicStore((s) => s.target);
  const draft = useMosaicStore((s) => s.cropDraft);
  const { setCropDraft, applyCrop, cancelCrop } = useMosaicStore.getState();
  if (!target || !draft) return null;

  const scale = Math.min(
    (size.width - PAD * 2) / target.width,
    (size.height - PAD * 2 - BAR) / target.height,
  );
  if (!(scale > 0)) return null;
  const width = target.width * scale;
  const height = target.height * scale;

  /** Biggest square around the crop's centre (faces usually look best square). */
  const makeSquare = () => {
    const side = Math.min(draft.w * target.width, draft.h * target.height);
    const w = side / target.width;
    const h = side / target.height;
    const x = Math.min(Math.max(0, draft.x + draft.w / 2 - w / 2), 1 - w);
    const y = Math.min(Math.max(0, draft.y + draft.h / 2 - h / 2), 1 - h);
    setCropDraft({ x, y, w, h });
  };

  return (
    <div className="absolute inset-0 z-20 bg-neutral-950">
      <div className="absolute" style={{ left: (size.width - width) / 2, top: PAD, width, height }}>
        <img
          src={target.url}
          alt=""
          draggable={false}
          className="absolute inset-0 size-full select-none"
        />
        <CropFrame
          rect={draft}
          onChange={setCropDraft}
          size={{ width, height }}
          minSize={0.05}
          label={`${Math.round(draft.w * target.width)} × ${Math.round(draft.h * target.height)}`}
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-center gap-2 p-3">
        <Button size="sm" variant="ghost" icon={<Square />} onClick={makeSquare}>
          Square
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon={<RotateCcw />}
          onClick={() => setCropDraft({ ...FULL_CROP })}
        >
          Reset
        </Button>
        <Button size="sm" icon={<X />} onClick={cancelCrop}>
          Cancel
        </Button>
        <Button size="sm" variant="primary" icon={<Check />} onClick={applyCrop}>
          Apply crop
        </Button>
      </div>
    </div>
  );
}
