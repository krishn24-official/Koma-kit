import { PenTool, SquareDashed } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useFrameDraw } from '@/hooks/useFrameDraw';
import { useEditorStore } from '@/store/useEditorStore';
import { useUiStore } from '@/store/useUiStore';
import { createFrame } from '@/utils/stickerShape';

/** "Add frame" (an empty circle frame to fill) and "Draw frame" (draw its outline). */
export function FrameButtons({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const { start } = useFrameDraw();
  return (
    <>
      <Button
        size={size}
        icon={<SquareDashed />}
        onClick={() => {
          useEditorStore.getState().addElement(createFrame());
          useUiStore.getState().setActivePanel('elements');
        }}
      >
        Add frame
      </Button>
      <Button size={size} icon={<PenTool />} onClick={() => start()}>
        Draw frame
      </Button>
    </>
  );
}
