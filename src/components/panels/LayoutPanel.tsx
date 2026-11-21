import { PanelSection } from '@/components/ui/PanelSection';
import { ImagesSection } from './ImagesSection';
import { LayersSection } from './LayersSection';
import { LayoutPicker } from './LayoutPicker';
import { MyTemplatesSection } from './MyTemplatesSection';
import { TemplatesSection } from './TemplatesSection';

export function LayoutPanel() {
  return (
    <div className="space-y-6">
      <MyTemplatesSection />
      <TemplatesSection />
      <ImagesSection />
      <LayersSection />
      <PanelSection title="Layout">
        <LayoutPicker />
      </PanelSection>
    </div>
  );
}
