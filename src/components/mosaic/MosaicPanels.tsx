import { ArrowLeft, Crop, Grid3x3, ImagePlus, Images, Settings2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { PanelSection } from '@/components/ui/PanelSection';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import { useMosaicStore } from '@/store/useMosaicStore';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/utils/cn';
import type { CellRect } from '@/types';
import { MAX_TILES, MOSAIC_LIMITS, mosaicOutput, rowsFor } from '@/utils/mosaic';

/** Square thumbnail showing only the cropped part of the main picture. */
function CroppedThumb({ url, crop, ratio }: { url: string; crop: CellRect; ratio: number }) {
  // The crop is fitted into the 64 px box; the whole picture is shifted behind it.
  const cropRatio = (crop.w * ratio) / crop.h;
  const boxW = cropRatio >= 1 ? 64 : 64 * cropRatio;
  const boxH = cropRatio >= 1 ? 64 / cropRatio : 64;
  const fullW = boxW / crop.w;
  const fullH = boxH / crop.h;
  return (
    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-800">
      <div className="relative overflow-hidden" style={{ width: boxW, height: boxH }}>
        <img
          src={url}
          alt=""
          className="absolute max-w-none"
          style={{ width: fullW, height: fullH, left: -crop.x * fullW, top: -crop.y * fullH }}
        />
      </div>
    </div>
  );
}

/** Main picture and tile pictures. */
export function MosaicPicturesPanel() {
  const target = useMosaicStore((s) => s.target);
  const tileCount = useMosaicStore((s) => s.tiles.length);
  const loading = useMosaicStore((s) => s.status.kind === 'loading');
  const { close, setTarget, addTiles, clearTiles, startCrop } = useMosaicStore.getState();
  const targetInput = useRef<HTMLInputElement>(null);
  const tilesInput = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      <Button fullWidth icon={<ArrowLeft />} onClick={close}>
        Back to single design
      </Button>

      <PanelSection title="Main picture">
        <div className="flex items-center gap-3">
          {target && (
            <CroppedThumb
              url={target.url}
              crop={target.crop}
              ratio={target.width / target.height}
            />
          )}
          <div className={target ? 'grid flex-1 grid-cols-2 gap-2' : 'flex-1'}>
            <Button
              variant={target ? 'secondary' : 'primary'}
              fullWidth
              icon={<ImagePlus />}
              onClick={() => targetInput.current?.click()}
            >
              {target ? 'Replace' : 'Choose main picture'}
            </Button>
            {target && (
              <Button icon={<Crop />} onClick={startCrop}>
                Crop
              </Button>
            )}
          </div>
        </div>
        <HiddenFileInput
          ref={targetInput}
          accept="image/*"
          onFiles={([f]) => f && void setTarget(f)}
        />
      </PanelSection>

      <PanelSection
        title={`Tile pictures (${tileCount})`}
        action={
          tileCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 />}
              onClick={() => window.confirm('Remove all tile pictures?') && clearTiles()}
            >
              Clear
            </Button>
          )
        }
      >
        <Button
          variant={target && tileCount === 0 ? 'primary' : 'secondary'}
          fullWidth
          icon={<Images />}
          loading={loading}
          disabled={tileCount >= MAX_TILES}
          onClick={() => tilesInput.current?.click()}
        >
          Add tile pictures
        </Button>
        <HiddenFileInput
          ref={tilesInput}
          accept="image/*"
          multiple
          onFiles={(f) => void addTiles(f)}
        />
      </PanelSection>
    </div>
  );
}

const px = (v: number) => `${Math.round(v)} px`;

/** Grid size, tile size, blend and repeats. */
export function MosaicSettingsPanel() {
  const settings = useMosaicStore((s) => s.settings);
  const target = useMosaicStore((s) => s.target);
  const update = useMosaicStore((s) => s.updateSettings);
  const rows = target ? rowsFor(target, settings.cols) : null;
  const out = rows ? mosaicOutput({ cols: settings.cols, rows }, settings.tileSize) : null;

  return (
    <PanelSection title="Mosaic">
      <div className="space-y-4">
        <Slider
          label="Tiles across"
          {...MOSAIC_LIMITS.cols}
          value={settings.cols}
          onChange={(cols) => update({ cols })}
        />
        {rows && (
          <p className="-mt-2 text-xs text-neutral-500 tabular-nums">
            {settings.cols} × {rows} = {settings.cols * rows} tiles
          </p>
        )}
        <Slider
          label="Tile size"
          {...MOSAIC_LIMITS.tileSize}
          value={settings.tileSize}
          onChange={(tileSize) => update({ tileSize })}
          formatValue={px}
        />
        {out && (
          <p className="-mt-2 text-xs text-neutral-500 tabular-nums">
            Download {out.width} × {out.height} px
          </p>
        )}
        <Slider
          label="Color match"
          {...MOSAIC_LIMITS.blend}
          step={0.05}
          value={settings.blend}
          onChange={(blend) => update({ blend })}
          formatValue={(v) => `${Math.round(v * 100)}%`}
        />
        <Toggle
          label="Avoid repeats side by side"
          checked={settings.avoidRepeats}
          onChange={(avoidRepeats) => update({ avoidRepeats })}
        />
      </div>
    </PanelSection>
  );
}

/** Sidebar (tablet/desktop) while the mosaic is open. */
export function MosaicSidebar() {
  return (
    <aside className="hidden w-80 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900/40 md:flex xl:w-96">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
        <MosaicPicturesPanel />
        <MosaicSettingsPanel />
      </div>
    </aside>
  );
}

type Tab = 'pictures' | 'settings';
const TABS = [
  { id: 'pictures', label: 'Pictures', icon: Images },
  { id: 'settings', label: 'Mosaic', icon: Settings2 },
] as const;

/** Phone: two tabs that open the panels under the preview. */
export function MosaicMobilePanel() {
  const open = useUiStore((s) => s.mobilePanelOpen);
  const [tab, setTab] = useState<Tab>('pictures');
  const toggle = (id: Tab) => {
    if (open && tab === id) useUiStore.getState().closeMobilePanel();
    else {
      setTab(id);
      useUiStore.setState({ mobilePanelOpen: true });
    }
  };
  return (
    <div className="shrink-0 md:hidden">
      {open && (
        <div className="max-h-[45dvh] overflow-y-auto overscroll-contain border-t border-neutral-800 bg-neutral-900 p-4">
          {tab === 'pictures' ? <MosaicPicturesPanel /> : <MosaicSettingsPanel />}
        </div>
      )}
      <nav className="grid grid-cols-2 border-t border-neutral-800 bg-neutral-950 px-1 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = open && tab === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(id)}
              className={cn(
                'flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors',
                active ? 'text-brand-400' : 'text-neutral-400 hover:text-neutral-200',
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/** Templates tab entry point. */
export function MosaicEntrySection() {
  return (
    <PanelSection title="Photo mosaic">
      <Button fullWidth icon={<Grid3x3 />} onClick={() => void useMosaicStore.getState().open()}>
        Open photo mosaic
      </Button>
    </PanelSection>
  );
}
