import type { TemplateDesign } from '@/store/useEditorStore';
import { DEFAULT_STYLE } from './editor';
import { createBadge, createSticker, createText } from './elements';
import { getPreset } from './layouts';

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  /** Pixel size shown on the card. */
  size: string;
  /** Builds a fresh design (new ids every time). */
  build: () => TemplateDesign;
}

/**
 * Wide news card: character art with dark fades on both sides, anime logo + NEW INFO
 * badge on the left, event logo + big date + subtitle on the right.
 * Positions are fractions of the 1600×500 card.
 */
const newsBanner = (): TemplateDesign => ({
  canvasSize: { presetId: null, width: 1600, height: 500, exact: true },
  layoutRoot: getPreset('single').root,
  presetId: 'single',
  style: { ...DEFAULT_STYLE, gap: 0, padding: 0, radius: 0, backgroundColor: '#0a1426' },
  boxFades: { 0: { color: '#0a1426', opacity: 0.97, from: 'sides', reach: 0.8 } },
  elements: [
    createSticker({ label: 'Anime logo', x: 0.15, y: 0.4, width: 270 }),
    createBadge({ x: 0.15, y: 0.68, fontSize: 18, paddingX: 2.2, letterSpacing: 6 }),
    createSticker({ label: 'Event logo', x: 0.83, y: 0.22, width: 160 }),
    createText({
      text: 'DEC 19',
      fontId: 'montserrat-black',
      // Sized so the widest dates ("DEC 20", "NOV 30") still fit inside the card.
      fontSize: 84,
      align: 'left',
      x: 0.665,
      y: 0.54,
      letterSpacing: -2,
      strokeWidth: 0,
      shadow: true,
    }),
    createText({
      text: 'Expected : Season 4 Release info',
      fontId: 'inter-regular',
      fontSize: 17,
      align: 'left',
      x: 0.672,
      y: 0.71,
      color: '#e5e7eb',
      strokeWidth: 0,
      shadow: false,
    }),
    createText({
      text: '@yourhandle',
      fontId: 'inter-regular',
      fontSize: 11,
      align: 'right',
      x: 0.985,
      y: 0.95,
      strokeWidth: 0,
      shadow: false,
      opacity: 0.7,
    }),
  ],
});

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'news-banner',
    name: 'News banner',
    description: 'Character art, anime logo, NEW INFO badge, event logo, date and subtitle.',
    size: '1600 × 500',
    build: newsBanner,
  },
];
