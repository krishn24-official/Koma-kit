import { Download, LayoutGrid, LayoutPanelTop, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Slider } from '@/components/ui/Slider';
import { canShareFiles } from '@/hooks/useExport';
import { usePaste } from '@/hooks/usePaste';
import { useMosaicStore } from '@/store/useMosaicStore';
import { useSheetStore } from '@/store/useSheetStore';
import { useUiStore } from '@/store/useUiStore';
import { canvasToBlob, downloadBlob, sanitizeFileName } from '@/utils/download';
import { mosaicOutput, renderMosaic } from '@/utils/mosaic';

type Format = 'png' | 'jpeg';
const FORMATS = [
  { value: 'jpeg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
] as const satisfies ReadonlyArray<{ value: Format; label: string }>;

/** Pictures used inside a design are kept to this size (plenty for a box). */
const DESIGN_MAX_SIDE = 4096;

/** Download the mosaic, share it, or put it into a box of the design. */
export function MosaicDownloadOptions({ onDone }: { onDone: () => void }) {
  const grid = useMosaicStore((s) => s.grid);
  const assignment = useMosaicStore((s) => s.assignment);
  const settings = useMosaicStore((s) => s.settings);
  const showToast = useUiStore((s) => s.showToast);
  const { place } = usePaste();
  const [format, setFormat] = useState<Format>('jpeg');
  const [quality, setQuality] = useState(0.9);
  const [fileName, setFileName] = useState('koma-kit-mosaic');
  const [busy, setBusy] = useState<'download' | 'share' | 'design' | 'sheet' | null>(null);
  /** Percent while the full-size mosaic is drawn. */
  const [progress, setProgress] = useState<number | null>(null);
  const [canShare] = useState(canShareFiles);

  if (!grid || !assignment) {
    return (
      <p className="text-sm text-neutral-400">Choose a main picture and add tile pictures first.</p>
    );
  }
  const out = mosaicOutput(grid, settings.tileSize);

  const create = async (tileSize: number, type: Format) => {
    // Let the button show its spinner before the heavy drawing starts.
    await new Promise((r) => setTimeout(r, 30));
    const { tiles } = useMosaicStore.getState();
    const canvas = await renderMosaic(grid, assignment, tiles, { ...settings, tileSize }, (p) =>
      setProgress(Math.round(p * 100)),
    );
    setProgress(null);
    const blob = await canvasToBlob(canvas, `image/${type}`, quality);
    canvas.width = canvas.height = 0; // free the memory right away (phones)
    const ext = type === 'png' ? 'png' : 'jpg';
    return new File([blob], `${sanitizeFileName(fileName)}.${ext}`, { type: blob.type });
  };

  const run = async (action: 'download' | 'share' | 'design' | 'sheet') => {
    setBusy(action);
    try {
      if (action === 'design' || action === 'sheet') {
        const tile = Math.min(
          settings.tileSize,
          Math.floor(DESIGN_MAX_SIDE / Math.max(grid.cols, grid.rows)),
        );
        const file = await create(tile, 'jpeg');
        useMosaicStore.getState().close();
        if (action === 'design') {
          await place([file]);
          showToast('Mosaic added to your design', 'success');
        } else {
          // Opens the card sheet (without adding the open design) with the mosaic as a card.
          await useSheetStore.getState().open({ addCurrent: false });
          await useSheetStore.getState().addImages([file]);
          showToast('Mosaic added to the card sheet', 'success');
        }
      } else {
        const file = await create(settings.tileSize, format);
        if (action === 'share' && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({ files: [file] });
          } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') return;
            downloadBlob(file, file.name);
          }
        } else {
          downloadBlob(file, file.name);
          showToast('Mosaic downloaded', 'success');
        }
      }
      onDone();
    } catch (e) {
      console.error(e);
      showToast("Couldn't create the mosaic. Try a smaller tile size", 'error');
    } finally {
      setBusy(null);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      <SegmentedControl ariaLabel="Format" options={FORMATS} value={format} onChange={setFormat} />
      {format === 'jpeg' && (
        <Slider
          label="Quality"
          min={0.6}
          max={1}
          step={0.01}
          value={quality}
          onChange={setQuality}
          formatValue={(v) => `${Math.round(v * 100)}%`}
        />
      )}
      <Field label="File name">
        {(id) => (
          <TextInput id={id} value={fileName} onChange={(e) => setFileName(e.target.value)} />
        )}
      </Field>
      <p className="text-xs text-neutral-400 tabular-nums">
        {out.width} × {out.height} px
        {out.reduced ? ` (tile size lowered to ${out.tile} px to fit)` : ''}
      </p>
      <div className={canShare ? 'grid grid-cols-2 gap-2' : undefined}>
        <Button
          variant="primary"
          fullWidth
          icon={<Download />}
          loading={busy === 'download'}
          disabled={busy !== null}
          onClick={() => void run('download')}
        >
          {busy === 'download' && progress !== null ? `Creating ${progress}%` : 'Download'}
        </Button>
        {canShare && (
          <Button
            fullWidth
            icon={<Share2 />}
            loading={busy === 'share'}
            disabled={busy !== null}
            onClick={() => void run('share')}
          >
            Share
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          fullWidth
          icon={<LayoutGrid />}
          loading={busy === 'design'}
          disabled={busy !== null}
          onClick={() => void run('design')}
        >
          Use in design
        </Button>
        <Button
          fullWidth
          icon={<LayoutPanelTop />}
          loading={busy === 'sheet'}
          disabled={busy !== null}
          onClick={() => void run('sheet')}
        >
          Add to card sheet
        </Button>
      </div>
    </div>
  );
}
