import { useState, type DragEvent, type PointerEvent } from 'react';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useEditorStore } from '@/store/useEditorStore';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/utils/cn';
import { TemplateCanvas } from './TemplateCanvas';

/** Area around the canvas. Files dropped here fill empty cells in order. */
export function Workspace() {
  const { uploadMany } = useMediaUpload();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    void uploadMany(Array.from(e.dataTransfer.files));
  };

  /** Tapping empty space around the canvas closes the phone panel and deselects. */
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-canvas-area]')) return;
    const ui = useUiStore.getState();
    if (ui.cropRect || ui.stickerCrop) return; // keep the crop open until Apply/Cancel
    ui.closeMobilePanel();
    useEditorStore.getState().clearSelection();
  };

  return (
    <div
      className={cn(
        'relative min-h-0 flex-1 p-4 transition-colors sm:p-8',
        isDragOver && 'bg-brand-500/5',
      )}
      style={{
        backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.06) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      onDragOver={handleDragOver}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDragOver(false);
      }}
      onDrop={handleDrop}
      onPointerDown={handlePointerDown}
    >
      <TemplateCanvas />
    </div>
  );
}
