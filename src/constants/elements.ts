import type {
  BadgeElement,
  BoxFade,
  PictureBorder,
  PictureEffects,
  StickerAdjust,
  StickerFade,
  StickerGlow,
  StickerShadow,
  StickerElement,
  TextElement,
} from '@/types';
import { createId } from '@/utils/id';
import { DEFAULT_FONT_ID } from './fonts';

export const ELEMENT_LIMITS = {
  fontSize: { min: 8, max: 300 },
  strokeWidth: { min: 0, max: 20 },
  letterSpacing: { min: -10, max: 50 },
  stickerWidth: { min: 20, max: 1080 },
  borderWidth: { min: 0, max: 12 },
  padding: { min: 0, max: 3 },
  rotation: { min: -180, max: 180 },
} as const;

/** No cropping: the whole picture. */
export const FULL_CROP = { x: 0, y: 0, w: 1, h: 1 } as const;

const base = () => ({
  id: createId(),
  x: 0.5,
  y: 0.5,
  rotation: 0,
  opacity: 1,
  hidden: false,
  locked: false,
});

export const NO_FADE: StickerFade = { top: 0, bottom: 0, left: 0, right: 0 };
export const DEFAULT_GLOW: StickerGlow = { color: '#a855f7', strength: 0, size: 40 };
export const DEFAULT_SHADOW: StickerShadow = { strength: 0, blur: 30, distance: 12 };
export const NO_ADJUST: StickerAdjust = { brightness: 1, contrast: 1, saturation: 1 };
export const NO_BORDER: PictureBorder = { width: 0, color: '#ffffff' };

/** Fresh effects with everything off. */
export const createEffects = (): PictureEffects => ({
  border: { ...NO_BORDER },
  fade: { ...NO_FADE },
  glow: { ...DEFAULT_GLOW },
  shadow: { ...DEFAULT_SHADOW },
  adjust: { ...NO_ADJUST },
});

export const createText = (patch: Partial<TextElement> = {}): TextElement => ({
  ...base(),
  type: 'text',
  text: 'Your title',
  fontId: DEFAULT_FONT_ID,
  fontSize: 96,
  align: 'center',
  letterSpacing: 0,
  color: '#ffffff',
  strokeColor: '#000000',
  strokeWidth: 6,
  shadow: true,
  ...patch,
});

/** An empty picture slot; tap it to upload. Width is in design units. */
export const createSticker = (patch: Partial<StickerElement> = {}): StickerElement => ({
  ...base(),
  type: 'sticker',
  src: null,
  file: null,
  naturalWidth: 0,
  naturalHeight: 0,
  crop: { ...FULL_CROP },
  width: 300,
  label: 'Logo',
  slotAspect: PLACEHOLDER_ASPECT,
  flipX: false,
  shape: 'none',
  points: null,
  border: { ...NO_BORDER },
  fade: { ...NO_FADE },
  glow: { ...DEFAULT_GLOW },
  shadow: { ...DEFAULT_SHADOW },
  adjust: { ...NO_ADJUST },
  ...patch,
});

export const createBadge = (patch: Partial<BadgeElement> = {}): BadgeElement => ({
  ...base(),
  type: 'badge',
  text: 'NEW INFO',
  fontId: 'inter',
  fontSize: 22,
  letterSpacing: 4,
  textColor: '#ffffff',
  fill: null,
  borderColor: '#ffffff',
  borderWidth: 3,
  paddingX: 1.6,
  paddingY: 0.45,
  roundness: 1,
  ...patch,
});

/** Placeholder shape for an empty sticker (width : height). */
export const PLACEHOLDER_ASPECT = 2.5;

export const DEFAULT_BOX_FADE: BoxFade = {
  color: '#0a0f1e',
  opacity: 0.95,
  from: 'left',
  reach: 0.75,
};
