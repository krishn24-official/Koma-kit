import { TEXT_LINE_HEIGHT } from '@/constants/editor';
import { getFont, toCssFont } from '@/constants/fonts';
import type { BadgeElement, FontOption, TextElement } from '@/types';

export interface TextRenderStyle {
  font: FontOption;
  cssFont: string;
  fontSize: number;
  lineHeight: number;
  /** Extra space between letters in pixels. */
  letterSpacing: number;
  /** Visible outline thickness in pixels. Canvas/CSS stroke width is 2× this. */
  outline: number;
  shadow: { color: string; blur: number; offsetY: number } | null;
  lines: string[];
}

/**
 * Resolves a text element into pixel values for a given unit (pixels per design unit).
 * The DOM preview and the canvas export both use this, so they look the same.
 */
export function getTextRenderStyle(text: TextElement, unit: number): TextRenderStyle {
  const font = getFont(text.fontId);
  const fontSize = text.fontSize * unit;

  return {
    font,
    cssFont: toCssFont(font, fontSize),
    fontSize,
    lineHeight: fontSize * TEXT_LINE_HEIGHT,
    letterSpacing: (fontSize * text.letterSpacing) / 100,
    outline: (fontSize * text.strokeWidth) / 100,
    shadow: text.shadow
      ? { color: 'rgba(0, 0, 0, 0.7)', blur: fontSize * 0.12, offsetY: fontSize * 0.04 }
      : null,
    lines: text.text.split('\n'),
  };
}

export interface BadgeRenderStyle {
  font: FontOption;
  cssFont: string;
  fontSize: number;
  letterSpacing: number;
  /** Box height in pixels (border included). */
  height: number;
  /** Horizontal space between border and text, in pixels. */
  paddingX: number;
  borderWidth: number;
  radius: number;
}

/** Badge measurements in pixels. Width depends on the text, so it is measured separately. */
export function getBadgeRenderStyle(badge: BadgeElement, unit: number): BadgeRenderStyle {
  const font = getFont(badge.fontId);
  const fontSize = badge.fontSize * unit;
  const height = fontSize * TEXT_LINE_HEIGHT + fontSize * badge.paddingY * 2;
  return {
    font,
    cssFont: toCssFont(font, fontSize),
    fontSize,
    letterSpacing: (fontSize * badge.letterSpacing) / 100,
    height,
    paddingX: fontSize * badge.paddingX,
    borderWidth: badge.borderWidth * unit,
    radius: (badge.roundness * height) / 2,
  };
}
