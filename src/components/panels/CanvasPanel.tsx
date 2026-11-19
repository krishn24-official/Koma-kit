import { Crop, Scan } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PanelSection } from '@/components/ui/PanelSection';
import { useCrop } from '@/hooks/useCrop';
import { useFitToPictures } from '@/hooks/useFitToPictures';
import { BackgroundSection } from './BackgroundSection';
import { CanvasSizePicker } from './CanvasSizePicker';

export function CanvasPanel() {
  const fitToPictures = useFitToPictures();
  const { start: startCrop } = useCrop();

  return (
    <div className="space-y-6">
      <PanelSection title="Crop & fit">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" icon={<Crop />} onClick={startCrop}>
            Crop
          </Button>
          <Button icon={<Scan />} onClick={fitToPictures}>
            Fit to pictures
          </Button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-neutral-400">
          <span className="text-neutral-200">Crop</span> cuts the canvas to the area you
          choose; edges snap to your pictures. <span className="text-neutral-200">Fit</span>{' '}
          picks the height automatically so every picture fills its box.
        </p>
      </PanelSection>
      <PanelSection title="Canvas size">
        <CanvasSizePicker />
      </PanelSection>
      <PanelSection title="Background">
        <BackgroundSection />
      </PanelSection>
    </div>
  );
}
