import type { BadgeElement, CanvasElement, Size, StickerElement, TextElement } from '@/types';
import { getAppearance } from './elementTiming';
import { renderStickerLayer } from './pictureEffects';
import { getBadgeRenderStyle, getTextRenderStyle } from './textStyle';

type Ctx = CanvasRenderingContext2D;

/** Canvas letter spacing (Chrome, Edge, Safari 17+, Firefox 115+); ignored elsewhere. */
function setLetterSpacing(ctx: Ctx, px: number) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`;
}

function traceRoundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawText(ctx: Ctx, text: TextElement, unit: number) {
  const style = getTextRenderStyle(text, unit);
  const top = -(style.lineHeight * style.lines.length) / 2;

  ctx.font = style.cssFont;
  ctx.textAlign = text.align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  setLetterSpacing(ctx, style.letterSpacing);

  const applyShadow = () => {
    if (!style.shadow) return;
    ctx.shadowColor = style.shadow.color;
    ctx.shadowBlur = style.shadow.blur;
    ctx.shadowOffsetY = style.shadow.offsetY;
  };
  const clearShadow = () => {
    ctx.shadowColor = 'transparent';
  };

  style.lines.forEach((line, i) => {
    const y = top + style.lineHeight * (i + 0.5);
    // Stroke first, then fill on top, so the outline sits outside the letters
    // (same result as CSS `paint-order: stroke fill`).
    if (style.outline > 0) {
      applyShadow();
      ctx.lineWidth = style.outline * 2;
      ctx.strokeStyle = text.strokeColor;
      ctx.strokeText(line, 0, y);
      clearShadow();
    } else {
      applyShadow();
    }
    ctx.fillStyle = text.color;
    ctx.fillText(line, 0, y);
    clearShadow();
  });
}

function drawSticker(
  ctx: Ctx,
  sticker: StickerElement,
  unit: number,
  image: CanvasImageSource | undefined,
) {
  if (!sticker.src || !image) return; // empty placeholders aren't exported
  // Cropped, flipped, color-adjusted, faded, with glow and shadow.
  const layer = renderStickerLayer(sticker, image, unit);
  ctx.drawImage(layer.canvas, layer.x, layer.y);
}

function drawBadge(ctx: Ctx, badge: BadgeElement, unit: number) {
  const s = getBadgeRenderStyle(badge, unit);
  ctx.font = s.cssFont;
  setLetterSpacing(ctx, s.letterSpacing);
  // Letter spacing also adds space after the last letter; leave it out so the text is
  // centred (the preview cancels it the same way).
  const textWidth = ctx.measureText(badge.text).width - s.letterSpacing;
  // Same box as the CSS preview: text + padding + border on each side.
  const width = textWidth + s.paddingX * 2 + s.borderWidth * 2;
  const x = -width / 2;
  const y = -s.height / 2;

  if (badge.fill) {
    traceRoundRect(ctx, x, y, width, s.height, s.radius);
    ctx.fillStyle = badge.fill;
    ctx.fill();
  }
  if (s.borderWidth > 0) {
    const half = s.borderWidth / 2;
    traceRoundRect(
      ctx,
      x + half,
      y + half,
      width - s.borderWidth,
      s.height - s.borderWidth,
      s.radius - half,
    );
    ctx.lineWidth = s.borderWidth;
    ctx.strokeStyle = badge.borderColor;
    ctx.stroke();
  }
  ctx.fillStyle = badge.textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge.text, s.letterSpacing / 2, 0);
}

/**
 * Draws every element in order (later ones on top), as it looks at timeline time `time`
 * (timed elements may be hidden, fading, sliding…). `timelineEnd` is the timeline length.
 */
export function drawElements(
  ctx: Ctx,
  elements: CanvasElement[],
  size: Size,
  unit: number,
  stickers: Map<string, CanvasImageSource>,
  time = 0,
  timelineEnd = 0,
): void {
  for (const el of elements) {
    if (el.hidden) continue;
    const look = getAppearance(el, time, timelineEnd);
    if (!look.visible || look.opacity <= 0) continue;
    ctx.save();
    ctx.globalAlpha = el.opacity * look.opacity;
    ctx.translate((el.x + look.dx) * size.width, (el.y + look.dy) * size.height);
    ctx.rotate((el.rotation * Math.PI) / 180);
    if (look.scale !== 1) ctx.scale(look.scale, look.scale);
    // Blur-in/out (browsers without canvas filters just fade).
    if (look.blur > 0 && 'filter' in ctx) ctx.filter = `blur(${look.blur * unit}px)`;
    if (el.type === 'text') drawText(ctx, el, unit);
    else if (el.type === 'sticker') drawSticker(ctx, el, unit, stickers.get(el.id));
    else drawBadge(ctx, el, unit);
    ctx.restore();
  }
}
