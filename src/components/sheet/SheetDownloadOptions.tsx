import { Download, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Slider } from '@/components/ui/Slider';
import { canShareFiles } from '@/hooks/useExport';
import { useSheetStore } from '@/store/useSheetStore';
import { useUiStore } from '@/store/useUiStore';
import { canvasToBlob, downloadBlob, sanitizeFileName } from '@/utils/download';
import { layoutSheet, renderSheet, sheetOutputSize } from '@/utils/sheet';

type Format = 'png' | 'jpeg';
const FORMATS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPG' },
] as const satisfies ReadonlyArray<{ value: Format; label: string }>;

/** Download the whole card sheet as one picture. */
export function SheetDownloadOptions({ onDone }: { onDone: () => void }) {
  const cards = useSheetStore((s) => s.cards);
  const settings = useSheetStore((s) => s.settings);
  const showToast = useUiStore((s) => s.showToast);
  const [format, setFormat] = useState<Format>('jpeg');
  const [quality, setQuality] = useState(0.92);
  const [fileName, setFileName] = useState('koma-kit-sheet');
  const [progress, setProgress] = useState<string | null>(null);
  const [canShare] = useState(canShareFiles);

  const size = sheetOutputSize(
    layoutSheet(
      cards.map((c) => c.aspect),
      settings,
    ),
  );

  const createFile = async () => {
    const canvas = await renderSheet(cards, settings, (done, total) =>
      setProgress(`Card ${done}/${total}`),
    );
    const blob = await canvasToBlob(canvas, `image/${format}`, quality);
    const ext = format === 'png' ? 'png' : 'jpg';
    return new File([blob], `${sanitizeFileName(fileName)}.${ext}`, { type: blob.type });
  };

  const run = async (action: 'download' | 'share') => {
    setProgress('Starting…');
    try {
      const file = await createFile();
      if (action === 'share' && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          downloadBlob(file, file.name);
        }
      } else {
        downloadBlob(file, file.name);
        showToast('Sheet downloaded', 'success');
      }
      onDone();
    } catch (e) {
      console.error(e);
      showToast("Couldn't create the sheet. Try fewer columns or a smaller card width", 'error');
    } finally {
      setProgress(null);
    }
  };

  if (cards.length === 0) {
    return <p className="text-sm text-neutral-400">Add a card first.</p>;
  }

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
        {size.width} × {size.height} px
      </p>
      <div className={canShare ? 'grid grid-cols-2 gap-2' : undefined}>
        <Button
          variant="primary"
          fullWidth
          icon={<Download />}
          loading={progress !== null}
          onClick={() => void run('download')}
        >
          {progress ?? 'Download'}
        </Button>
        {canShare && (
          <Button
            fullWidth
            icon={<Share2 />}
            disabled={progress !== null}
            onClick={() => void run('share')}
          >
            Share
          </Button>
        )}
      </div>
    </div>
  );
}
