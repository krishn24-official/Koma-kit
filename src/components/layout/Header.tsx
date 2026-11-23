import { Download, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useEditorStore } from '@/store/useEditorStore';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useMosaicStore } from '@/store/useMosaicStore';
import { useSheetStore } from '@/store/useSheetStore';
import { useTemplatesStore } from '@/store/useTemplatesStore';
import { useUiStore } from '@/store/useUiStore';
import { Logo } from './Logo';

export function Header() {
  const resetProject = useEditorStore((s) => s.resetProject);
  const openDownload = useUiStore((s) => s.setDownloadDialogOpen);
  const sheetOpen = useSheetStore((s) => s.active);
  const mosaicOpen = useMosaicStore((s) => s.active);
  // The card sheet and mosaic have no Reset/Save (they save themselves or aren't designs).
  const otherMode = sheetOpen || mosaicOpen;

  const handleReset = () => {
    if (!window.confirm('Start over? All images, videos and text will be removed.')) return;
    usePlaybackStore.getState().pause();
    usePlaybackStore.getState().seek(0);
    resetProject();
    useTemplatesStore.getState().clearCurrent();
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-800 px-3 sm:px-5">
      <Logo />
      <div className="flex items-center gap-2">
        {!otherMode && (
          <>
            <Button variant="ghost" size="sm" icon={<RotateCcw />} onClick={handleReset}>
              <span className="hidden sm:inline">Reset</span>
              <span className="sr-only sm:hidden">Reset</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Save />}
              aria-haspopup="dialog"
              onClick={() => useTemplatesStore.getState().setSaveDialogOpen(true)}
            >
              <span className="hidden sm:inline">Save</span>
              <span className="sr-only sm:hidden">Save template</span>
            </Button>
          </>
        )}
        <Button
          variant="primary"
          size="sm"
          icon={<Download />}
          aria-haspopup="dialog"
          onClick={() => openDownload(true)}
        >
          Download
        </Button>
      </div>
    </header>
  );
}
