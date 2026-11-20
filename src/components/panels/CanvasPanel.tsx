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
