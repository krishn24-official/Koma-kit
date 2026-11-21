import type { BoxFade, CanvasStyle, PixelRect, Size } from '@/types';
import { getCoverScale } from './imageTransform';

/** CSS for the gradient background (the editor preview). */
export const gradientCss = (style: CanvasStyle): string =>
  `linear-gradient(${style.gradientAngle}deg, ${style.gradientFrom}, ${style.gradientTo})`;

/**
 * Start and end points of a canvas gradient that matches CSS `linear-gradient(angle)`:
 * the gradient line passes through the centre and is just long enough to reach the corners.
 */
function gradientLine(size: Size, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const half = (Math.abs(size.width * dx) + Math.abs(size.height * dy)) / 2;
  const cx = size.width / 2;
  const cy = size.height / 2;
  return { x0: cx - dx * half, y0: cy - dy * half, x1: cx + dx * half, y1: cy + dy * half };
}

/**
 * Where the background image is drawn: covering the canvas plus a margin on every side.
 * The margin keeps blurred edges from fading to transparent.
 */
export function getBackgroundImageRect(image: Size, canvas: Size, margin: number): PixelRect {
  const area = { width: canvas.width + margin * 2, height: canvas.height + margin * 2 };
  const scale = getCoverScale(image, area);
  const width = image.width * scale;
  const height = image.height * scale;
  return {
    x: -margin + (area.width - width) / 2,
    y: -margin + (area.height - height) / 2,
    width,
    height,
  };
}

/** Margin for a blur radius, in the same units. */
export const blurMargin = (blur: number) => blur * 2;

/** Paints the background: solid color, then the gradient or blurred/dimmed image on top. */
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  style: CanvasStyle,
  size: Size,
  unit: number,
  image: CanvasImageSource | null,
): void {
  ctx.fillStyle = style.backgroundColor;
  ctx.fillRect(0, 0, size.width, size.height);

  if (style.backgroundType === 'gradient') {
    const { x0, y0, x1, y1 } = gradientLine(size, style.gradientAngle);
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, style.gradientFrom);
    gradient.addColorStop(1, style.gradientTo);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size.width, size.height);
    return;
  }

  if (style.backgroundType === 'image' && style.backgroundImage && image) {
    const blur = style.backgroundBlur * unit;
    const rect = getBackgroundImageRect(
      { width: style.backgroundImage.naturalWidth, height: style.backgroundImage.naturalHeight },
      size,
      blurMargin(blur),
    );
    ctx.save();
    if (blur > 0) ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
    ctx.restore();

    if (style.backgroundDim > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${style.backgroundDim})`;
      ctx.fillRect(0, 0, size.width, size.height);
    }
  }
}

/** "#0a0f1e" + 0.5 → "rgba(10, 15, 30, 0.5)" */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

type FadeDirection = 'to right' | 'to left' | 'to bottom' | 'to top';

/** Direction and [position 0–1, opacity] stops for a fade; shared by CSS and canvas. */
function fadeStops(fade: BoxFade): { direction: FadeDirection; stops: Array<[number, number]> } {
  const op = fade.opacity;
  const reach = Math.max(0.001, fade.reach);
  switch (fade.from) {
    case 'full':
      return {
        direction: 'to right',
        stops: [
          [0, op],
          [1, op],
        ],
      };
    case 'sides':
      return {
        direction: 'to right',
        stops: [
          [0, op],
          [reach / 2, 0],
          [1 - reach / 2, 0],
          [1, op],
        ],
      };
    default: {
      const direction = (
        { left: 'to right', right: 'to left', top: 'to bottom', bottom: 'to top' } as const
      )[fade.from];
      return {
        direction,
        stops: [
          [0, op],
          [reach, 0],
        ],
      };
    }
  }
}

/** CSS for a box fade (the editor preview). */
export function boxFadeCss(fade: BoxFade): string {
  const { direction, stops } = fadeStops(fade);
  const parts = stops.map(([at, alpha]) => `${hexToRgba(fade.color, alpha)} ${at * 100}%`);
  return `linear-gradient(${direction}, ${parts.join(', ')})`;
}

/** Paints a box fade over `rect`. Call inside the box's clip. */
export function drawBoxFade(ctx: CanvasRenderingContext2D, rect: PixelRect, fade: BoxFade): void {
  const { x, y, width: w, height: h } = rect;
  const { direction, stops } = fadeStops(fade);
  const line: Record<FadeDirection, [number, number, number, number]> = {
    'to right': [x, y, x + w, y],
    'to left': [x + w, y, x, y],
    'to bottom': [x, y, x, y + h],
    'to top': [x, y + h, x, y],
  };
  const gradient = ctx.createLinearGradient(...line[direction]);
  stops.forEach(([at, alpha]) => gradient.addColorStop(at, hexToRgba(fade.color, alpha)));
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, w, h);
}
