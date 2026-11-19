import type { AspectRatio, AspectRatioId } from '@/types';

/** Every canvas is 1080 design units wide; height follows the ratio. */
export const DESIGN_WIDTH = 1080;

const ratio = (id: AspectRatioId, w: number, h: number, hint: string): AspectRatio => ({
  id,
  label: id,
  hint,
  width: DESIGN_WIDTH,
  height: (DESIGN_WIDTH * h) / w,
});

export const ASPECT_RATIOS: AspectRatio[] = [
  ratio('4:5', 4, 5, 'Feed'),
  ratio('1:1', 1, 1, 'Square'),
  ratio('3:4', 3, 4, 'Portrait'),
  ratio('2:3', 2, 3, 'Tall'),
  ratio('16:9', 16, 9, 'Wide'),
  ratio('9:16', 9, 16, 'Story'),
];

export const DEFAULT_ASPECT_RATIO_ID: AspectRatioId = '4:5';

export const getAspectRatio = (id: AspectRatioId): AspectRatio =>
  ASPECT_RATIOS.find((r) => r.id === id) ?? ASPECT_RATIOS[0]!;
