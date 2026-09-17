import type Phaser from 'phaser';
import { HEX, type PaletteKey } from '@/config/palette';
import { LENS } from '@/config/layout';
import { TEX } from './keys';
import { drawPixels, makeCanvasTexture, makeGraphicsTexture, css } from './pixelUtil';

export interface RimStyle {
  rim: PaletteKey;
  rimDark: PaletteKey;
  handle: PaletteKey;
}
export const DEFAULT_RIM: RimStyle = { rim: 'amber', rimDark: 'woodDark', handle: 'woodDark' };

const CURSOR = [
  '......bbbbbb........',
  '....bb......bb......',
  '...b..........b.....',
  '..b............b....',
  '.b......pp......b...',
  '.b.....p........b...',
  '.b.....p........b...',
  'b................b..',
  'b................b..',
  'b................b..',
  'b................b..',
  '.b..............b...',
  '.b..............b...',
  '.b..............b...',
  '..b............b....',
  '...b..........b.....',
  '....bb......bbhh....',
  '......bbbbbb..hhh...',
  '...............hhh..',
  '................hhh.',
];

export function makeMagnifier(scene: Phaser.Scene, style: RimStyle = DEFAULT_RIM): void {
  makeGraphicsTexture(scene, TEX.cursor, 20, 20, (g) => {
    drawPixels(g, CURSOR, { b: style.rim, p: 'paper', h: style.handle });
  });

  const r = LENS.radius;
  const size = r * 2 + 40; // room for the handle
  const c = r + 4;
  const rim = (key: string, glow: boolean) =>
    makeGraphicsTexture(scene, key, size, size, (g) => {
      // Handle (angled down-right).
      g.lineStyle(9, HEX[style.rimDark], 1);
      g.lineBetween(c + r * 0.66, c + r * 0.66, c + r + 26, c + r + 26);
      g.lineStyle(5, HEX[style.handle], 1);
      g.lineBetween(c + r * 0.7, c + r * 0.7, c + r + 25, c + r + 25);
      g.lineStyle(1, HEX.woodLight, 1);
      g.lineBetween(c + r * 0.72, c + r * 0.66, c + r + 24, c + r + 20);
      // Rim: dark outer, brass middle, dark inner.
      g.lineStyle(2, HEX[style.rimDark], 1);
      g.strokeCircle(c, c, r + 4);
      g.lineStyle(3, HEX[glow ? 'paper' : style.rim], 1);
      g.strokeCircle(c, c, r + 2);
      g.lineStyle(1, HEX[glow ? 'amber' : style.rimDark], 1);
      g.strokeCircle(c, c, r);
      if (glow) {
        g.lineStyle(1, HEX.amber, 0.6);
        g.strokeCircle(c, c, r + 6);
      }
    });
  rim(TEX.lensRim, false);
  rim(TEX.lensRimGlow, true);

  makeCanvasTexture(scene, TEX.lensVignette, r * 2, r * 2, (ctx) => {
    const grad = ctx.createRadialGradient(r, r, r * 0.55, r, r, r);
    grad.addColorStop(0, css('bg', 0));
    grad.addColorStop(1, css('bg', 0.42));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.fill();
  });

  makeGraphicsTexture(scene, TEX.lensGlint, 24, 14, (g) => {
    g.fillStyle(HEX.paper, 0.55);
    g.fillRect(4, 4, 14, 2);
    g.fillRect(2, 6, 3, 2);
    g.fillRect(18, 2, 4, 2);
    g.fillRect(8, 8, 8, 1);
  });
}
