import { useRef, useState, type PointerEvent } from 'react';
import { CLOSE_DISTANCE, useFrameDraw } from '@/hooks/useFrameDraw';
import { useUiStore } from '@/store/useUiStore';
import type { Size } from '@/types';
import { simplifyOutline } from '@/utils/cutout';

/** Moving further than this (pixels) while pressed means tracing, not a tap. */
const TRACE_START = 8;
/** While tracing, a new point every this many pixels. */
const TRACE_STEP = 4;

type Point = [number, number];

/**
 * Drawing an outline on the canvas, two ways:
 *  - press and drag to trace it freehand; letting go finishes it;
 *  - tap corners one by one; tapping the first corner again (or Done) finishes.
 */
export function FrameDrawOverlay({ size }: { size: Size }) {
  const draw = useUiStore((s) => s.frameDraw);
  const { addPoint, setTrace: commitTrace, finish } = useFrameDraw();
  const down = useRef<{ x: number; y: number; id: number } | null>(null);
  const [trace, setTrace] = useState<Point[] | null>(null);
  if (!draw) return null;

  const px = (trace ?? draw.points.map(([x, y]) => [x * size.width, y * size.height] as Point)).map(
    ([x, y]) => [x, y] as Point,
  );
  const first = draw.points[0] && [draw.points[0][0] * size.width, draw.points[0][1] * size.height];

  const local = (e: PointerEvent<HTMLDivElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return [
      Math.min(rect.width, Math.max(0, e.clientX - rect.left)),
      Math.min(rect.height, Math.max(0, e.clientY - rect.top)),
    ];
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = local(e);
    down.current = { x, y, id: e.pointerId };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const start = down.current;
    if (!start || start.id !== e.pointerId) return;
    const [x, y] = local(e);
    if (!trace) {
      if (Math.hypot(x - start.x, y - start.y) < TRACE_START) return;
      setTrace([
        [start.x, start.y],
        [x, y],
      ]);
      return;
    }
    const last = trace[trace.length - 1]!;
    if (Math.hypot(x - last[0], y - last[1]) >= TRACE_STEP) setTrace([...trace, [x, y]]);
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = down.current;
    down.current = null;
    if (!start) return;

    if (trace) {
      // A traced outline replaces any corners.
      const points = simplifyOutline(trace, 1.5);
      setTrace(null);
      if (points.length < 3) return;
      // Shown for checking: Done finishes it, Undo removes it.
      commitTrace(points.map(([x, y]) => [x / size.width, y / size.height] as Point));
      return;
    }

    // A tap: close on the first corner, or add a corner.
    const [x, y] = local(e);
    if (
      first &&
      draw.points.length >= 3 &&
      Math.hypot(x - first[0]!, y - first[1]!) <= CLOSE_DISTANCE
    ) {
      finish();
      return;
    }
    addPoint(x / size.width, y / size.height);
  };

  const line = px.map(([x, y]) => `${x},${y}`).join(' ');
  const closed = px.length >= 3;
  return (
    <div
      className="absolute inset-0 z-30 cursor-crosshair touch-none"
      style={{ background: 'rgb(0 0 0 / 0.25)' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        down.current = null;
        setTrace(null);
      }}
      role="application"
      aria-label="Draw an outline: drag to trace, or tap to place corners"
    >
      <svg width={size.width} height={size.height} className="absolute inset-0 overflow-visible">
        {closed && <polygon points={line} fill="rgb(244 63 94 / 0.18)" stroke="none" />}
        <polyline
          points={line}
          fill="none"
          stroke="white"
          strokeWidth={2}
          strokeDasharray={trace ? undefined : '6 4'}
          strokeLinejoin="round"
        />
        {!trace &&
          px.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={i === 0 && closed ? 9 : 5}
              fill={i === 0 ? 'rgb(244 63 94)' : 'white'}
              stroke="black"
              strokeWidth={1.5}
            />
          ))}
      </svg>
    </div>
  );
}
