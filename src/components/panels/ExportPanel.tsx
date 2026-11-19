import { Copy, Download, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field, TextInput } from '@/components/ui/Field';
import { PanelSection } from '@/components/ui/PanelSection';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Slider } from '@/components/ui/Slider';
import { EXPORT_SCALES, VIDEO_FPS, VIDEO_WIDTHS, X_MAX_VIDEO_SECONDS } from '@/constants/editor';
import { canCopyImage, canShareFiles, useExport } from '@/hooks/useExport';
import {
  useCurrentAspectRatio,
  useCurrentLayout,
  useFilledCellCount,
  useTimelineDuration,
} from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import type { ExportFormat } from '@/types';
import { formatTime } from '@/utils/timeline';

const even = (n: number) => Math.round(n / 2) * 2;

function Note({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: React.ReactNode }) {
  return (
    <p
      className={
        tone === 'warn'
          ? 'rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300'
          : 'rounded-lg bg-neutral-800/60 px-3 py-2 text-xs text-neutral-300'
      }
    >
      {children}
    </p>
  );
}

export function ExportPanel() {
  const options = useEditorStore((s) => s.exportOptions);
  const updateOptions = useEditorStore((s) => s.updateExportOptions);
  const hasAudio = useEditorStore((s) => s.audioSourceId !== null);
  const aspectRatio = useCurrentAspectRatio();
  const emptyCells = useCurrentLayout().cells.length - useFilledCellCount();
  const duration = useTimelineDuration();
  const hasTimeline = duration > 0;
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const { download, copy, share, busy } = useExport();
  const [capabilities] = useState(() => ({ copy: canCopyImage(), share: canShareFiles() }));

  const format: ExportFormat = options.format === 'mp4' && !hasTimeline ? 'png' : options.format;
  const isVideo = format === 'mp4';

  const formatOptions = [
    { value: 'png' as const, label: 'PNG', hint: 'Image' },
    { value: 'jpeg' as const, label: 'JPG', hint: 'Smaller' },
    ...(hasTimeline ? [{ value: 'mp4' as const, label: 'MP4', hint: 'Video' }] : []),
  ];

  const scaleOptions = EXPORT_SCALES.map((s) => ({
    value: s.value,
    label: s.label,
    hint: `${Math.round(aspectRatio.width * s.value)}×${Math.round(aspectRatio.height * s.value)}`,
  }));

  const videoOptions = VIDEO_WIDTHS.map((w) => ({
    value: w.value,
    label: w.label,
    hint: `${even(w.value)}×${even((w.value * aspectRatio.height) / aspectRatio.width)}`,
  }));

  return (
    <div className="space-y-6">
      <PanelSection title="Format">
        <SegmentedControl
          ariaLabel="Format"
          options={formatOptions}
          value={format}
          onChange={(next) => updateOptions({ format: next })}
        />
      </PanelSection>

      <PanelSection title="Resolution">
        {isVideo ? (
          <SegmentedControl
            ariaLabel="Video resolution"
            options={videoOptions}
            value={options.videoWidth}
            onChange={(videoWidth) => updateOptions({ videoWidth })}
          />
        ) : (
          <SegmentedControl
            ariaLabel="Resolution"
            options={scaleOptions}
            value={options.scale}
            onChange={(scale) => updateOptions({ scale })}
          />
        )}
      </PanelSection>

      {format === 'jpeg' && (
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

      <div className="space-y-2">
        {isVideo && (
          <Note>
            {formatTime(duration)} · {VIDEO_FPS} fps · H.264
            {hasAudio ? ' with original sound' : ' · no sound'}
          </Note>
        )}
        {isVideo && !hasAudio && (
          <Note tone="warn">
            No sound selected. Select a video cell and tap the speaker button to use its sound.
          </Note>
        )}
        {isVideo && duration > X_MAX_VIDEO_SECONDS && (
          <Note tone="warn">
            Longer than {formatTime(X_MAX_VIDEO_SECONDS)}. X may reject it for most accounts.
          </Note>
        )}
        {!isVideo && hasTimeline && (
          <Note>Saves the frame at {formatTime(currentTime)}. Pick MP4 for the full video.</Note>
        )}
        {emptyCells > 0 && (
          <Note tone="warn">
            {emptyCells} empty {emptyCells === 1 ? 'cell' : 'cells'} will be filled with the
            background color.
          </Note>
        )}
      </div>

      <div className="space-y-2">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<Download />}
          loading={busy === 'download'}
          onClick={download}
        >
          {isVideo ? 'Create & download video' : 'Download'}
        </Button>
        {((capabilities.copy && !isVideo) || capabilities.share) && (
          <div className="grid grid-cols-2 gap-2">
            {capabilities.copy && !isVideo && (
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
                className={capabilities.copy && !isVideo ? undefined : 'col-span-2'}
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
