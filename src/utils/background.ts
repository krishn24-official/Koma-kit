import type { CanvasStyle, PixelRect, Size } from '@/types';
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
