import { Newspaper, Users, type LucideIcon } from 'lucide-react';
import type { TemplateDesign } from '@/store/useEditorStore';
import { DEFAULT_CANVAS_SIZE } from './canvasSizes';
import { DEFAULT_STYLE } from './editor';
import { createBadge, createSticker, createText } from './elements';
import { getPreset } from './layouts';

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  /** Pixel size shown on the card. */
  size: string;
  icon: LucideIcon;
  /** Shown after loading: what to tap first. */
  hint: string;
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

/**
 * Group poster: the box holds the background art; character slots stand in a pyramid,
 * biggest in the middle and in front. Each fades out at the bottom and casts a shadow
 * on the ones behind it.
 */
const collagePoster = (): TemplateDesign => {
  const character = (x: number, y: number, width: number) =>
    createSticker({
      label: 'Character',
      slotAspect: 0.7,
      x,
      y,
      width,
      fade: { top: 0, bottom: 0.3, left: 0, right: 0 },
      shadow: { strength: 0.7, blur: 40, distance: 10 },
    });
  return {
    canvasSize: DEFAULT_CANVAS_SIZE,
    layoutRoot: getPreset('single').root,
    presetId: 'single',
    style: { ...DEFAULT_STYLE, gap: 0, padding: 0, radius: 0, backgroundColor: '#07070c' },
    boxFades: { 0: { color: '#07070c', opacity: 0.9, from: 'bottom', reach: 0.6 } },
    // Back row first, so the front ones are drawn on top.
    elements: [
      character(0.25, 0.36, 400),
      character(0.75, 0.36, 400),
      character(0.2, 0.6, 440),
      character(0.8, 0.6, 440),
      character(0.5, 0.55, 560),
      createText({ text: 'ANIME LEGENDS', fontId: 'bangers', fontSize: 120, y: 0.9 }),
    ],
  };
};

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'news-banner',
    name: 'News banner',
    description: 'Character art, anime logo, NEW INFO badge, event logo, date and subtitle.',
    size: '1600 × 500',
    icon: Newspaper,
    hint: 'Tap the box for the art and the dashed slots for logos',
    build: newsBanner,
  },
  {
    id: 'collage-poster',
    name: 'Group poster',
    description: 'Background art with characters stacked in a pyramid, fading into the dark.',
    size: '4:5',
    icon: Users,
    hint: 'Tap the box for the background and the dashed slots for characters',
    build: collagePoster,
  },
];
