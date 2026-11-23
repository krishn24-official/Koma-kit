import { Columns3, Equal, Plus, Rows3, SquareMinus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PanelSection } from '@/components/ui/PanelSection';
import { AddLogoButton } from '@/components/editor/AddLogoButton';
import { MAX_CELLS } from '@/constants/layouts';
import { useCurrentLayout } from '@/store/selectors';
import { useEditorStore } from '@/store/useEditorStore';

/** Grow, shrink and even out the current layout. */
export function LayersSection() {
  const boxCount = useCurrentLayout().cells.length;
  const selectedIndex = useEditorStore((s) =>
    s.selection?.kind === 'cell' ? s.selection.index : null,
  );
  const addLayer = useEditorStore((s) => s.addLayer);
  const addRow = useEditorStore((s) => s.addRow);
  const addColumn = useEditorStore((s) => s.addColumn);
  const removeBox = useEditorStore((s) => s.removeBox);
  const equalizeLayout = useEditorStore((s) => s.equalizeLayout);
  const full = boxCount >= MAX_CELLS;

  return (
    <PanelSection
      title={`Layers (${boxCount} ${boxCount === 1 ? 'box' : 'boxes'})`}
      action={
        <Button variant="ghost" size="sm" icon={<Equal />} onClick={equalizeLayout}>
          Equal sizes
        </Button>
      }
    >
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" icon={<Plus />} disabled={full} onClick={addLayer}>
            {full ? `Max ${MAX_CELLS} boxes` : 'Add layer'}
          </Button>
          <AddLogoButton size="md" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" icon={<Rows3 />} disabled={full} onClick={addRow}>
            Add row
          </Button>
          <Button size="sm" icon={<Columns3 />} disabled={full} onClick={addColumn}>
            Add column
          </Button>
        </div>
        <Button
          size="sm"
          variant="danger"
          fullWidth
          icon={<SquareMinus />}
          disabled={selectedIndex === null || boxCount <= 1}
          onClick={() => selectedIndex !== null && removeBox(selectedIndex)}
        >
          {selectedIndex === null ? 'Remove box' : `Remove box ${selectedIndex + 1}`}
        </Button>
      </div>
    </PanelSection>
  );
}
