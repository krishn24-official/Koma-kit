import { Circle, Hexagon, Images, Newspaper, Users, type LucideIcon } from 'lucide-react';
import type { TemplateDesign } from '@/store/useEditorStore';
import { DEFAULT_CANVAS_SIZE } from './canvasSizes';
import { DEFAULT_STYLE } from './editor';
import { createBadge, createSticker, createText } from './elements';
import { getPreset } from './layouts';
import { newCharacterSlot } from '@/utils/characterSlots';
import { createFrame } from '@/utils/stickerShape';

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
  const character = (x: number, y: number, width: number) => newCharacterSlot({ x, y, width });
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

/** A frame-collage design: the box holds the background picture, frames sit on top. */
const frameCollage = (
  backgroundColor: string,
  elements: TemplateDesign['elements'],
): TemplateDesign => ({
  canvasSize: DEFAULT_CANVAS_SIZE,
  layoutRoot: getPreset('single').root,
  presetId: 'single',
  style: { ...DEFAULT_STYLE, gap: 0, padding: 0, radius: 0, backgroundColor },
  elements,
});

/**
 * Honeycomb: 4 columns of flat-topped hexagons, every other column shifted half a
 * hexagon down, with white borders. Positions are worked out on the 1080 × 1350 canvas.
 */
const honeycomb = (): TemplateDesign => {
  const W = 300; // hexagon width (design units)
  const H = (W * Math.sqrt(3)) / 2;
  const stepX = W * 0.75 * 1.06; // a little space between hexagons
  const stepY = H * 1.06;
  const cols = 4;
  const rows = 4;
  const clusterW = W + (cols - 1) * stepX;
  const clusterH = H + (rows - 1) * stepY + stepY / 2;
  const left = (1080 - clusterW) / 2 + W / 2;
  const top = (1350 - clusterH) / 2 + H / 2;
  const frames = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      frames.push(
        createFrame({
          shape: 'hexagon',
          width: W,
          x: (left + c * stepX) / 1080,
          y: (top + r * stepY + (c % 2 ? stepY / 2 : 0)) / 1350,
          border: { width: 7, color: '#ffffff' },
          shadow: { strength: 0.45, blur: 24, distance: 6 },
        }),
      );
    }
  }
  return frameCollage('#1b2333', frames);
};

/** Bubbles: overlapping circles of different sizes; the bigger ones in front. */
const bubbles = (): TemplateDesign => {
  const spots: Array<[number, number, number]> = [
    [0.8, 0.12, 250],
    [0.22, 0.86, 260],
    [0.62, 0.86, 300],
    [0.74, 0.42, 340],
    [0.5, 0.2, 300],
    [0.24, 0.2, 380],
    [0.3, 0.55, 460],
  ];
  return frameCollage(
    '#2b5fb8',
    spots.map(([x, y, width]) =>
      createFrame({ shape: 'circle', x, y, width, border: { width: 10, color: '#ffffff' } }),
    ),
  );
};

/** Polaroid scatter: tilted photos with thick white borders on a light background. */
const polaroids = (): TemplateDesign => {
  const spots: Array<[number, number, number]> = [
    [0.27, 0.22, -7],
    [0.72, 0.25, 6],
    [0.3, 0.55, 4],
    [0.7, 0.6, -5],
    [0.48, 0.83, 3],
  ];
  return frameCollage(
    '#f3efe7',
    spots.map(([x, y, rotation]) =>
      createFrame({
        shape: 'square',
        slotAspect: 0.82,
        x,
        y,
        rotation,
        width: 400,
        border: { width: 18, color: '#ffffff' },
        shadow: { strength: 0.35, blur: 30, distance: 10 },
      }),
    ),
  );
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
  {
    id: 'honeycomb',
    name: 'Honeycomb',
    description: 'Hexagon frames in a honeycomb with white borders.',
    size: '4:5',
    icon: Hexagon,
    hint: 'Tap a hexagon to add a picture, and the background for the art behind',
    build: honeycomb,
  },
  {
    id: 'bubbles',
    name: 'Bubbles',
    description: 'Overlapping round frames of different sizes.',
    size: '4:5',
    icon: Circle,
    hint: 'Tap a circle to add a picture',
    build: bubbles,
  },
  {
    id: 'polaroids',
    name: 'Polaroid scatter',
    description: 'Tilted photos with thick white borders.',
    size: '4:5',
    icon: Images,
    hint: 'Tap a photo frame to add a picture',
    build: polaroids,
  },
];
