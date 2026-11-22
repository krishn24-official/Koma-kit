import { DownloadDialog } from '@/components/download/DownloadDialog';
import { SaveTemplateDialog } from '@/components/templates/SaveTemplateDialog';
import { CellToolbar } from '@/components/editor/CellToolbar';
import { Workspace } from '@/components/editor/Workspace';
import { Header } from '@/components/layout/Header';
import { MobilePanel } from '@/components/layout/MobilePanel';
import { Sidebar } from '@/components/layout/Sidebar';
import { EditingCardBar, SheetMobilePanel, SheetSidebar } from '@/components/sheet/SheetChrome';
import { SheetToolbar } from '@/components/sheet/SheetToolbar';
import { SheetWorkspace } from '@/components/sheet/SheetWorkspace';
import { TimelineBar } from '@/components/timeline/TimelineBar';
import { ExportProgress } from '@/components/ui/ExportProgress';
import { Toast } from '@/components/ui/Toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePasteShortcut } from '@/hooks/usePaste';
import { usePlaybackLoop } from '@/hooks/usePlaybackLoop';
import { useVideoFormatDefault } from '@/hooks/useVideoFormatDefault';
import { useSheetStore } from '@/store/useSheetStore';

export default function App() {
  useKeyboardShortcuts();
  usePlaybackLoop();
  usePasteShortcut();
  useVideoFormatDefault();
  const sheetOpen = useSheetStore((s) => s.active);

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <div className="flex min-h-0 flex-1">
        {sheetOpen ? (
          <>
            <SheetSidebar />
            <main className="flex min-w-0 flex-1 flex-col">
              <SheetWorkspace />
              <SheetToolbar />
              <SheetMobilePanel />
            </main>
          </>
        ) : (
          <>
            <Sidebar />
            <main className="flex min-w-0 flex-1 flex-col">
              <EditingCardBar />
              <Workspace />
              <TimelineBar />
              <CellToolbar />
              <MobilePanel />
            </main>
          </>
        )}
      </div>
      <DownloadDialog />
      <SaveTemplateDialog />
      <Toast />
      <ExportProgress />
    </div>
  );
}
