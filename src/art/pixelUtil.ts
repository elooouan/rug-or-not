import type Phaser from 'phaser';
import { HEX, PALETTE, type PaletteKey } from '@/config/palette';

/** Map from a single character to a palette key. '.' (or missing) is transparent. */
export type PixelMap = Record<string, PaletteKey>;

/** Draw a hand-coded pixel array onto a Graphics object at (ox, oy). */
export function drawPixels(
  g: Phaser.GameObjects.Graphics,
  rows: readonly string[],
  map: PixelMap,
  ox = 0,
  oy = 0,
  px = 1,
): void {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const key = map[row[x]];
      if (!key) continue;
      g.fillStyle(HEX[key], 1);
      g.fillRect(ox + x * px, oy + y * px, px, px);
    }
  }
}

/** Create a texture by drawing with Graphics, then throw the Graphics away. */
export function makeGraphicsTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

/** Create a texture by drawing on a 2D canvas (for gradients / per-pixel work). */
export function makeCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  draw(tex.context, w, h);
  tex.refresh();
}

/** 4x4 ordered-dither threshold in [0, 16). */
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];
export function bayer4(x: number, y: number): number {
  return BAYER4[y & 3][x & 3];
}

/** Quantise v in [0,1] into `bands` levels with ordered dithering. */
export function ditherBand(v: number, x: number, y: number, bands: number): number {
  const scaled = v * bands + bayer4(x, y) / 16;
  return Math.min(bands, Math.floor(scaled)) / bands;
}

export function css(key: PaletteKey, alpha = 1): string {
  if (alpha >= 1) return PALETTE[key];
  const v = HEX[key];
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${alpha})`;
}

/** Radial falloff painted with dithered bands into an ImageData buffer. */
export function paintRadial(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cx: number,
  cy: number,
  radius: number,
  color: PaletteKey,
  alphaAt: (t: number) => number, // t = 0 at centre, 1 at radius (clamped)
  bands = 8,
): void {
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const v = HEX[color];
  const r = (v >> 16) & 255;
  const g = (v >> 8) & 255;
  const b = v & 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const t = Math.min(1, Math.sqrt(dx * dx + dy * dy) / radius);
      const a = ditherBand(alphaAt(t), x, y, bands);
      const i = (y * w + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
}
