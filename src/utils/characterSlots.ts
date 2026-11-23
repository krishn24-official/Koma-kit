/**
 * Character boxes: the picture pieces of a collage (stickers labelled "Character").
 * Setting a count adds or removes boxes and arranges all of them in a pyramid:
 * a back row higher up and smaller, a front row lower and bigger, with the middle of
 * the front row biggest and on top.
 */
import { createSticker } from '@/constants/elements';
import type { CanvasElement, Size, StickerElement } from '@/types';

export const CHARACTER_LABEL = 'Character';
export const MAX_CHARACTERS = 20;
/** Shape of an empty character box (width / height). */
const SLOT_ASPECT = 0.7;

export const isCharacter = (el: CanvasElement): el is StickerElement =>
  el.type === 'sticker' && el.label === CHARACTER_LABEL;

export const newCharacterSlot = (patch: Partial<StickerElement> = {}): StickerElement =>
  createSticker({
    label: CHARACTER_LABEL,
    slotAspect: SLOT_ASPECT,
    fade: { top: 0, bottom: 0.3, left: 0, right: 0 },
    shadow: { strength: 0.7, blur: 40, distance: 10 },
    ...patch,
  });

interface Spot {
  x: number;
  y: number;
  width: number;
}

/** Pyramid positions for `n` boxes on a canvas of `design` units (width 1080). */
function pyramid(n: number, design: Size): { back: Spot[]; front: Spot[] } {
  // The front row has an odd count (one box in the middle), e.g. 3 → 1 in front and
  // 2 behind, 5 → 3 + 2, 8 → 3 + 5. One or two boxes all stand in front.
  const half = Math.ceil(n / 2);
  const frontCount = n <= 2 ? n : half % 2 === 1 ? half : half - 1;
  const backCount = n - frontCount;
  // Boxes share the width with some overlap and stay under ~65% of the height.
  const maxByHeight = design.height * 0.65 * SLOT_ASPECT;
  const front = Math.min(560, maxByHeight, (design.width / frontCount) * 1.25);
  const back = Math.min(front * 0.8, (design.width / Math.max(1, backCount)) * 1.2);

  const row = (count: number, y: number, width: number, bigMiddle: boolean): Spot[] =>
    Array.from({ length: count }, (_, i) => {
      // Spread across 8%–92% of the width; a single box sits in the middle.
      const x = count === 1 ? 0.5 : 0.08 + (0.84 * (i + 0.5)) / count;
      const middle = bigMiddle && count % 2 === 1 && i === (count - 1) / 2;
      return { x, y, width: Math.round(width * (middle && count > 1 ? 1.15 : 1)) };
    });

  return {
    back: row(backCount, 0.38, back, false),
    front: row(frontCount, 0.6, front, true),
  };
}

/** Draw order for a row: outer boxes first, the middle last (on top). */
const middleLast = <T>(items: T[]): T[] => {
  const mid = (items.length - 1) / 2;
  return items
    .map((item, i) => ({ item, d: Math.abs(i - mid) }))
    .sort((a, b) => b.d - a.d)
    .map(({ item }) => item);
};

export interface CharacterChange {
  elements: CanvasElement[];
  /** Filled boxes that had to be removed to reach the count. */
  removedFilled: number;
}

/**
 * Returns the elements with exactly `count` character boxes, all arranged in a
 * pyramid. Removes empty boxes first, then the last filled ones. Other elements
 * (text, logos, badges) keep their place in the stacking order, in front.
 */
export function setCharacterCount(
  elements: CanvasElement[],
  count: number,
  design: Size,
): CharacterChange {
  const n = Math.max(0, Math.min(MAX_CHARACTERS, Math.round(count)));
  let boxes = elements.filter(isCharacter);
  let removedFilled = 0;

  while (boxes.length > n) {
    const emptyIndex = boxes.map((b) => !b.src).lastIndexOf(true);
    if (emptyIndex < 0) removedFilled++;
    boxes = boxes.filter((_, i) => i !== (emptyIndex >= 0 ? emptyIndex : boxes.length - 1));
  }
  while (boxes.length < n) boxes.push(newCharacterSlot());

  const { back, front } = pyramid(n, design);
  // Boxes keep their order and take the spots back row first, then front row.
  const spots = [...back, ...front];
  const placed = boxes.map((box, i) => ({ ...box, ...spots[i]!, rotation: 0 }));

  // Stacking: back row (outer → middle), then front row (outer → middle).
  const backBoxes = middleLast(placed.slice(0, back.length));
  const frontBoxes = middleLast(placed.slice(back.length));
  const others = elements.filter((el) => !isCharacter(el));
  // Characters go behind the other elements, keeping any that were already behind.
  const firstCharacter = elements.findIndex(isCharacter);
  const behind =
    firstCharacter < 0 ? [] : others.filter((el) => elements.indexOf(el) < firstCharacter);
  const inFront = others.filter((el) => !behind.includes(el));

  return {
    elements: [...behind, ...backBoxes, ...frontBoxes, ...inFront],
    removedFilled,
  };
}
