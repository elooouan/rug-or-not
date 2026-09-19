/**
 * Telling Lucien's cloth from the rest of him: pure pixel work, no Phaser, so it can be
 * tested on a plain byte array. The wardrobe feeds it the loaded sprites.
 */

/** Lucien's trench-coat cloth: the orange family, mid tones; skin and the brass are lighter or yellower. */
export function isCloth(h: number, s: number, l: number): boolean {
  return h >= 18 && h <= 38 && s > 0.45 && l >= 0.22 && l <= 0.62;
}

/**
 * The cloth's shading: the darker, redder folds. Too close to the trousers and the skin's
 * shadows to be cloth on colour alone, so shade only counts where it touches cloth.
 */
export function isShade(h: number, s: number, l: number): boolean {
  return h >= 5 && h <= 40 && s >= 0.28 && l >= 0.1 && l <= 0.62;
}

/** A rectangle [x0, y0, x1, y1) of the image that shading must not spread into. */
export type Keep = [number, number, number, number];

export enum Cloth {
  none = 0,
  hat = 1,
  coat = 2,
}

/**
 * Which cloth each pixel belongs to. Cloth-coloured pixels are grouped into connected
 * pieces: a piece that starts above the split is the hat, one that starts below is the
 * coat, and a piece smaller than a hundredth of the image (the brass on the magnifier, the
 * rings on the coin, which share the trench's hue) is left alone. Shading then spreads
 * out from each piece into the folds next to it, except inside the `keep` rectangles
 * (the trousers, which are shade-coloured and touch the hem).
 */
export function clothParts(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  split: number,
  keep: Keep[] = [],
): Uint8Array {
  const cloth = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < cloth.length; i++, p += 4) {
    if (data[p + 3] < 128) continue;
    const [hue, s, l] = rgbToHsl(data[p] / 255, data[p + 1] / 255, data[p + 2] / 255);
    if (isCloth(hue, s, l)) cloth[i] = 1;
  }
  const out = new Uint8Array(w * h);
  const seen = new Uint8Array(w * h);
  const minSize = Math.ceil(w * h * 0.01);
  const stack: number[] = [];
  const piece: number[] = [];
  for (let start = 0; start < cloth.length; start++) {
    if (!cloth[start] || seen[start]) continue;
    // Flood the piece (8-connected) from this pixel.
    piece.length = 0;
    stack.push(start);
    seen[start] = 1;
    let top = h;
    while (stack.length) {
      const i = stack.pop() as number;
      piece.push(i);
      const x = i % w;
      const y = (i - x) / w;
      if (y < top) top = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx;
          if (cloth[n] && !seen[n]) {
            seen[n] = 1;
            stack.push(n);
          }
        }
      }
    }
    if (piece.length < minSize) continue;
    const part = top < split ? Cloth.hat : Cloth.coat;
    for (const i of piece) out[i] = part;
  }
  // Shading: flood from every labelled pixel into shade-coloured neighbours.
  const shade = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < shade.length; i++, p += 4) {
    if (out[i] || data[p + 3] < 128) continue;
    const x = i % w;
    const y = (i - x) / w;
    if (keep.some(([x0, y0, x1, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1)) continue;
    const [hue, s, l] = rgbToHsl(data[p] / 255, data[p + 1] / 255, data[p + 2] / 255);
    if (isShade(hue, s, l)) shade[i] = 1;
  }
  for (let i = 0; i < out.length; i++) if (out[i]) stack.push(i);
  while (stack.length) {
    const i = stack.pop() as number;
    const x = i % w;
    const y = (i - x) / w;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const n = ny * w + nx;
        if (shade[n] && !out[n]) {
          out[n] = out[i];
          stack.push(n);
        }
      }
    }
  }
  return out;
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [r + m, g + m, b + m];
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
