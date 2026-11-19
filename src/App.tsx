import { CellToolbar } from '@/components/editor/CellToolbar';
import { Workspace } from '@/components/editor/Workspace';
import { Header } from '@/components/layout/Header';
import { MobilePanel } from '@/components/layout/MobilePanel';
import { Sidebar } from '@/components/layout/Sidebar';
import { TimelineBar } from '@/components/timeline/TimelineBar';
import { ExportProgress } from '@/components/ui/ExportProgress';
import { Toast } from '@/components/ui/Toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { usePlaybackLoop } from '@/hooks/usePlaybackLoop';

export default function App() {
  useKeyboardShortcuts();
  usePlaybackLoop();

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <Workspace />
          <TimelineBar />
          <CellToolbar />
          <MobilePanel />
        </main>
      </div>
      <Toast />
      <ExportProgress />
    </div>
  );
}
