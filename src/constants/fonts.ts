import type { FontOption } from '@/types';

/** Fonts are loaded from Google Fonts in index.html. */
export const FONTS: FontOption[] = [
  { id: 'bangers', label: 'Bangers', family: 'Bangers', weight: 400 },
  { id: 'anton', label: 'Anton', family: 'Anton', weight: 400 },
  { id: 'bebas-neue', label: 'Bebas Neue', family: 'Bebas Neue', weight: 400 },
  { id: 'permanent-marker', label: 'Marker', family: 'Permanent Marker', weight: 400 },
  { id: 'playfair', label: 'Playfair', family: 'Playfair Display', weight: 700 },
  { id: 'cinzel', label: 'Cinzel', family: 'Cinzel', weight: 700 },
  { id: 'oswald', label: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'inter', label: 'Inter Bold', family: 'Inter', weight: 800 },
  { id: 'inter-regular', label: 'Inter', family: 'Inter', weight: 500 },
  { id: 'montserrat-black', label: 'Montserrat', family: 'Montserrat', weight: 900 },
];

export const DEFAULT_FONT_ID = 'bangers';

export const getFont = (id: string): FontOption =>
  FONTS.find((font) => font.id === id) ?? FONTS[0]!;

export const toCssFont = (font: FontOption, sizePx: number): string =>
  `${font.weight} ${sizePx}px "${font.family}"`;
