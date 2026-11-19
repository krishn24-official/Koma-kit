import { Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useExport } from '@/hooks/useExport';
import { useTimelineDuration } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { Logo } from './Logo';

export function Header() {
  const resetProject = useEditorStore((s) => s.resetProject);
  const { download, busy } = useExport();
  const hasTimeline = useTimelineDuration() > 0;
  const isVideo = useEditorStore((s) => s.exportOptions.format === 'mp4') && hasTimeline;

  const handleReset = () => {
    if (!window.confirm('Start over? All images, videos and text will be removed.')) return;
    usePlaybackStore.getState().pause();
    usePlaybackStore.getState().seek(0);
    resetProject();
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-800 px-3 sm:px-5">
      <Logo />
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={handleReset}>
          <span className="hidden sm:inline">Reset</span>
          <span className="sr-only sm:hidden">Reset</span>
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon={<Download />}
          loading={busy === 'download'}
          onClick={download}
        >
          {isVideo ? 'Download MP4' : 'Download'}
        </Button>
      </div>
    </header>
  );
}
