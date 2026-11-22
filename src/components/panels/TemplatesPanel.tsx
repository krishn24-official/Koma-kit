import { MosaicEntrySection } from '@/components/mosaic/MosaicPanels';
import { SheetEntrySection } from '@/components/sheet/SheetChrome';
import { MyTemplatesSection } from './MyTemplatesSection';
import { TemplatesSection } from './TemplatesSection';

/** Saved designs (My templates), ready-made starter templates and the card sheet. */
export function TemplatesPanel() {
  return (
    <div className="space-y-6">
      <MyTemplatesSection />
      <TemplatesSection />
      <SheetEntrySection />
      <MosaicEntrySection />
    </div>
  );
}
