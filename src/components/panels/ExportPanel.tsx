import { Copy, Download, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { PanelSection } from '@/components/ui/PanelSection';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Slider } from '@/components/ui/Slider';
import { EXPORT_SCALES } from '@/constants/editor';
import { canCopyImage, canShareFiles, useExport } from '@/hooks/useExport';
import { useCurrentAspectRatio, useCurrentLayout, useFilledCellCount } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import type { ExportFormat } from '@/types';

const FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG', hint: 'Best quality' },
  { value: 'jpeg', label: 'JPG', hint: 'Smaller file' },
] as const satisfies ReadonlyArray<{ value: ExportFormat; label: string; hint: string }>;

export function ExportPanel() {
  const options = useEditorStore((s) => s.exportOptions);
  const updateOptions = useEditorStore((s) => s.updateExportOptions);
  const aspectRatio = useCurrentAspectRatio();
  const emptyCells = useCurrentLayout().cells.length - useFilledCellCount();
  const { download, copy, share, busy } = useExport();
  const [capabilities] = useState(() => ({ copy: canCopyImage(), share: canShareFiles() }));

  const scaleOptions = EXPORT_SCALES.map((s) => ({
    value: s.value,
    label: s.label,
    hint: `${Math.round(aspectRatio.width * s.value)}×${Math.round(aspectRatio.height * s.value)}`,
  }));

  return (
    <div className="space-y-6">
      <PanelSection title="Format">
        <SegmentedControl
          ariaLabel="Format"
          options={FORMAT_OPTIONS}
          value={options.format}
          onChange={(format) => updateOptions({ format })}
        />
      </PanelSection>

      <PanelSection title="Resolution">
        <SegmentedControl
          ariaLabel="Resolution"
          options={scaleOptions}
          value={options.scale}
          onChange={(scale) => updateOptions({ scale })}
        />
      </PanelSection>

      {options.format === 'jpeg' && (
        <Slider
          label="JPG quality"
          min={0.6}
          max={1}
          step={0.01}
          value={options.quality}
          onChange={(quality) => updateOptions({ quality })}
          formatValue={(v) => `${Math.round(v * 100)}%`}
        />
      )}

      <Field label="File name">
        {(id) => (
          <TextInput
            id={id}
            value={options.fileName}
            onChange={(e) => updateOptions({ fileName: e.target.value })}
          />
        )}
      </Field>

      {emptyCells > 0 && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {emptyCells} empty {emptyCells === 1 ? 'cell' : 'cells'} will be filled with the
          background color.
        </p>
      )}

      <div className="space-y-2">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<Download />}
          loading={busy === 'download'}
          onClick={download}
        >
          Download
        </Button>
        {(capabilities.copy || capabilities.share) && (
          <div className="grid grid-cols-2 gap-2">
            {capabilities.copy && (
              <Button
                icon={<Copy />}
                loading={busy === 'copy'}
                onClick={copy}
                className={capabilities.share ? undefined : 'col-span-2'}
              >
                Copy
              </Button>
            )}
            {capabilities.share && (
              <Button
                icon={<Share2 />}
                loading={busy === 'share'}
                onClick={share}
                className={capabilities.copy ? undefined : 'col-span-2'}
              >
                Share
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
