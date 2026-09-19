import { describe, expect, it } from 'vitest';
import { Cloth, clothParts } from '@/systems/cloth';

/** The trench's orange, and the darker red-brown of its folds. */
const CLOTH = [212, 135, 64];
const SHADE = [122, 58, 38];

/** A small transparent image with coloured rectangles painted on it. */
function image(
  w: number,
  h: number,
  rects: [number, number, number, number][],
  shaded: [number, number, number, number][] = [],
) {
  const data = new Uint8ClampedArray(w * h * 4);
  const paint = (rect: [number, number, number, number], rgb: number[]) => {
    const [x0, y0, x1, y1] = rect;
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) data.set([...rgb, 255], (y * w + x) * 4);
  };
  for (const r of rects) paint(r, CLOTH);
  for (const r of shaded) paint(r, SHADE);
  return data;
}

describe('clothParts', () => {
  const w = 40;
  const h = 40;
  const split = 12;
  // A crown, a brim that dips below the split, a coat, and a brass-sized speck; a fold
  // down the coat, a shade-coloured block off on its own, and shaded "trousers" under the
  // hem that the keep rectangle protects.
  const data = image(
    w,
    h,
    [
      [10, 0, 30, 8],
      [2, 8, 38, 16],
      [8, 22, 32, 36],
      [34, 18, 37, 21],
    ],
    [
      [18, 24, 21, 34],
      [0, 30, 4, 34],
      [12, 36, 28, 40],
    ],
  );
  const parts = clothParts(data, w, h, split, [[8, 36, 32, 40]]);
  const at = (x: number, y: number) => parts[y * w + x];

  it('keeps the whole brim with the hat even below the split', () => {
    expect(at(20, 4)).toBe(Cloth.hat);
    expect(at(5, 14)).toBe(Cloth.hat);
    expect(at(36, 15)).toBe(Cloth.hat);
  });

  it('gives the coat its own cloth', () => {
    expect(at(20, 30)).toBe(Cloth.coat);
    expect(at(9, 35)).toBe(Cloth.coat);
  });

  it('leaves small brass-sized pieces and the background alone', () => {
    expect(at(35, 19)).toBe(Cloth.none);
    expect(at(0, 0)).toBe(Cloth.none);
    expect(at(20, 19)).toBe(Cloth.none);
  });

  it('takes the folds with the cloth they sit in, not stray shade or the trousers', () => {
    expect(at(19, 28)).toBe(Cloth.coat);
    expect(at(1, 31)).toBe(Cloth.none);
    expect(at(20, 38)).toBe(Cloth.none);
  });
});
