import { TEXT_LINE_HEIGHT } from '@/constants/editor';
import { getFont, toCssFont } from '@/constants/fonts';
import type { FontOption, TextOverlay } from '@/types';

export interface TextRenderStyle {
  font: FontOption;
  cssFont: string;
  fontSize: number;
  lineHeight: number;
  /** Visible outline thickness in pixels. Canvas/CSS stroke width is 2× this. */
  outline: number;
  shadow: { color: string; blur: number; offsetY: number } | null;
  lines: string[];
}

/**
 * Resolves a text overlay into pixel values for a given unit (pixels per design unit).
 * The DOM preview and the canvas export both use this, so they look the same.
 */
export function getTextRenderStyle(text: TextOverlay, unit: number): TextRenderStyle {
  const font = getFont(text.fontId);
  const fontSize = text.fontSize * unit;

  return {
    font,
    cssFont: toCssFont(font, fontSize),
    fontSize,
    lineHeight: fontSize * TEXT_LINE_HEIGHT,
    outline: (fontSize * text.strokeWidth) / 100,
    shadow: text.shadow
      ? { color: 'rgba(0, 0, 0, 0.7)', blur: fontSize * 0.12, offsetY: fontSize * 0.04 }
      : null,
    lines: text.text.split('\n'),
  };
}
