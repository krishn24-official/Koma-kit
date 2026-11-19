import { PanelSection } from '@/components/ui/PanelSection';
import { AspectRatioPicker } from './AspectRatioPicker';
import { ImagesSection } from './ImagesSection';
import { LayoutPicker } from './LayoutPicker';

export function LayoutPanel() {
  return (
    <div className="space-y-6">
      <ImagesSection />
      <PanelSection title="Layout">
        <LayoutPicker />
      </PanelSection>
      <PanelSection title="Canvas size">
        <AspectRatioPicker />
      </PanelSection>
    </div>
  );
}
