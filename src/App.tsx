import { CellToolbar } from '@/components/editor/CellToolbar';
import { Workspace } from '@/components/editor/Workspace';
import { Header } from '@/components/layout/Header';
import { MobilePanel } from '@/components/layout/MobilePanel';
import { Sidebar } from '@/components/layout/Sidebar';
import { Toast } from '@/components/ui/Toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function App() {
  useKeyboardShortcuts();

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col">
          <Workspace />
          <CellToolbar />
          <MobilePanel />
        </main>
      </div>
      <Toast />
    </div>
  );
}
