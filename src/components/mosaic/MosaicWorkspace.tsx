import { useGesture } from '@use-gesture/react';
import { ImagePlus, Images, Loader2, Maximize, Minus, Plus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { HiddenFileInput } from '@/components/ui/HiddenFileInput';
import { IconButton } from '@/components/ui/IconButton';
import { useContainerSize } from '@/hooks/useContainerSize';
import { useMosaicStore } from '@/store/useMosaicStore';
import { clamp } from '@/utils/math';
import { drawMosaic, TILE_RES, type MosaicView } from '@/utils/mosaic';
import { MosaicCropper } from './MosaicCropper';

/** Largest zoom: a tile at a bit more than its stored size. */
const MAX_TILE_PX = TILE_RES * 1.5;

/**
 * Zoomable preview of the mosaic: drag to move, pinch / scroll / buttons to zoom.
 * Only the tiles on screen are drawn, so it stays quick with thousands of tiles.
 */
export function MosaicWorkspace() {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useContainerSize(boxRef);
  const target = useMosaicStore((s) => s.target);
  const tiles = useMosaicStore((s) => s.tiles);
  const grid = useMosaicStore((s) => s.grid);
  const assignment = useMosaicStore((s) => s.assignment);
  const blend = useMosaicStore((s) => s.settings.blend);
  const status = useMosaicStore((s) => s.status);
  const { setTarget, addTiles } = useMosaicStore.getState();
  const targetInput = useRef<HTMLInputElement>(null);
  const tilesInput = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<MosaicView | null>(null);

  const fitView = useCallback((): MosaicView | null => {
    // A zero-size moment (e.g. while the screen rotates) would give a zero zoom.
    if (!grid || size.width <= 0 || size.height <= 0) return null;
    const tile = Math.min(size.width / grid.cols, size.height / grid.rows) * 0.94;
    return {
      tile,
      x: (size.width - grid.cols * tile) / 2,
      y: (size.height - grid.rows * tile) / 2,
    };
  }, [grid, size.width, size.height]);

  // Fit again when the grid's shape or the space changes.
  const shape = grid ? `${grid.cols}x${grid.rows}` : '';
  useEffect(() => {
    const fit = fitView();
    if (fit) setView(fit);
  }, [shape, size.width, size.height]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw (once per frame at most).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0) return;
    const frame = requestAnimationFrame(() => {
      // Drawn in device pixels (no transform), so tiles stay sharp and the color
      // match works on real pixels.
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(size.width * dpr);
      const h = Math.round(size.height * dpr);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      if (grid && assignment && view) {
        const scaled = { tile: view.tile * dpr, x: view.x * dpr, y: view.y * dpr };
        drawMosaic(ctx, grid, assignment, tiles, blend, scaled, w, h);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [grid, assignment, tiles, blend, view, size.width, size.height]);

  /** Zooms by `factor` keeping the point (px, py) of the canvas in place. */
  const zoomAt = useCallback(
    (factor: number, px: number, py: number) =>
      setView((v) => {
        const fit = fitView();
        if (!v || !fit) return v;
        const tile = clamp(v.tile * factor, fit.tile * 0.5, MAX_TILE_PX);
        const k = tile / v.tile;
        return { tile, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
      }),
    [fitView],
  );

  useGesture(
    {
      onDrag: ({ delta: [dx, dy], pinching }) => {
        if (pinching) return;
        setView((v) => (v ? { ...v, x: v.x + dx, y: v.y + dy } : v));
      },
      onPinch: ({ origin: [ox, oy], offset: [scale], memo }) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return memo;
        const previous = (memo as number | undefined) ?? scale;
        zoomAt(scale / previous, ox - rect.left, oy - rect.top);
        return scale;
      },
      onWheel: ({ event, delta: [, dy] }) => {
        event.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect)
          zoomAt(Math.exp(-dy * 0.0015), event.clientX - rect.left, event.clientY - rect.top);
      },
    },
    {
      target: canvasRef,
      eventOptions: { passive: false },
      pinch: { scaleBounds: { min: 0.05, max: 50 } },
    },
  );

  const fit = fitView();
  const zoomPercent = view && fit ? Math.round((view.tile / fit.tile) * 100) : 100;

  return (
    <div
      ref={boxRef}
      className="relative min-h-0 flex-1 overflow-hidden"
      style={{
        backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.06) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full cursor-grab touch-none active:cursor-grabbing"
        aria-label="Mosaic preview"
      />

      {!target ? (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <Button
            variant="primary"
            icon={<ImagePlus />}
            onClick={() => targetInput.current?.click()}
          >
            Choose main picture
          </Button>
        </div>
      ) : tiles.length === 0 && status.kind === 'idle' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-4">
          <img
            src={target.url}
            alt=""
            className="max-h-[55%] max-w-[80%] rounded-lg object-contain opacity-60"
          />
          <Button variant="primary" icon={<Images />} onClick={() => tilesInput.current?.click()}>
            Add tile pictures
          </Button>
        </div>
      ) : null}

      {status.kind !== 'idle' && (
        <div className="pointer-events-none absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-900/90 px-3 py-1.5 text-xs text-neutral-200 tabular-nums">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {status.kind === 'loading'
            ? `Loading tiles ${status.done}/${status.total}`
            : `Matching ${Math.round(status.progress * 100)}%`}
        </div>
      )}

      {grid && assignment && view && (
        <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-xl bg-neutral-900/90 p-1">
          <IconButton
            label="Zoom out"
            icon={<Minus />}
            onClick={() => zoomAt(1 / 1.5, size.width / 2, size.height / 2)}
          />
          <span className="w-12 text-center text-xs text-neutral-300 tabular-nums">
            {zoomPercent}%
          </span>
          <IconButton
            label="Zoom in"
            icon={<Plus />}
            onClick={() => zoomAt(1.5, size.width / 2, size.height / 2)}
          />
          <IconButton label="Fit" icon={<Maximize />} onClick={() => setView(fitView())} />
        </div>
      )}

      <MosaicCropper size={size} />

      <HiddenFileInput
        ref={targetInput}
        accept="image/*"
        onFiles={([f]) => f && void setTarget(f)}
      />
      <HiddenFileInput
        ref={tilesInput}
        accept="image/*"
        multiple
        onFiles={(f) => void addTiles(f)}
      />
    </div>
  );
}
