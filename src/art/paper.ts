import type Phaser from 'phaser';
import { HEX } from '@/config/palette';
import { PAPER, TABS, UI } from '@/config/layout';
import { makeRng } from '@/systems/rng';
import { TEX } from './keys';
import { drawPixels, makeCanvasTexture, makeGraphicsTexture, css } from './pixelUtil';

export function makePaper(scene: Phaser.Scene): void {
  const sheet = (key: string, w: number, h: number) =>
    makeGraphicsTexture(scene, key, w, h, (g) => {
      const rng = makeRng(key);
      g.fillStyle(HEX.paper, 1);
      g.fillRect(0, 0, w, h);
      // Ragged right/bottom edges.
      g.fillStyle(HEX.paperShadow, 1);
      g.fillRect(0, h - 1, w, 1);
      g.fillRect(w - 1, 0, 1, h);
      for (let i = 0; i < w; i += rng.int(6, 14)) g.fillRect(i, h - 2, rng.int(2, 5), 1);
      for (let i = 0; i < h; i += rng.int(6, 14)) g.fillRect(w - 2, i, 1, rng.int(2, 5));
      // Fibre speckles.
      for (let i = 0; i < (w * h) / 220; i++)
        g.fillRect(rng.int(1, w - 2), rng.int(1, h - 2), 1, 1);
      // Top-left highlight.
      g.fillStyle(0xffffff, 0.08);
      g.fillRect(0, 0, w, 1);
      g.fillRect(0, 0, 1, h);
    });
  sheet(TEX.paper, PAPER.w, PAPER.h);
  sheet(TEX.paperSmall, 200, 120);

  makeGraphicsTexture(scene, TEX.paperclip, 8, 20, (g) => {
    drawPixels(
      g,
      [
        '..ssss..',
        '.s....s.',
        '.s....s.',
        '.s.ss.s.',
        '.s.s..s.',
        '.s.s..s.',
        '.s.s..s.',
        '.s.s..s.',
        '.s.s..s.',
        '.s.s..s.',
        '.s.s..s.',
        '.s.s..s.',
        '.s.s..s.',
        '.s.s..s.',
        '.s.s..s.',
        '.s.s.s..',
        '.s..s...',
        '.ss.....',
        '..s.....',
        '........',
      ],
      { s: 'paperShadow' },
    );
    g.fillStyle(HEX.paper, 0.6);
    g.fillRect(2, 1, 4, 1);
  });

  makeCanvasTexture(scene, TEX.coffeeRing, 44, 44, (ctx) => {
    ctx.strokeStyle = css('woodMid', 0.45);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(22, 22, 18, 0.3, Math.PI * 1.85);
    ctx.stroke();
    ctx.strokeStyle = css('woodDark', 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(22, 22, 16, 0.6, Math.PI * 1.6);
    ctx.stroke();
  });

  makeGraphicsTexture(scene, TEX.pin, 9, 12, (g) => {
    drawPixels(
      g,
      [
        '...rrr...',
        '..rprrr..',
        '.rprrrrr.',
        '.rrrrrrr.',
        '.rrrrrrr.',
        '..rrrrr..',
        '...rrr...',
        '....s....',
        '....s....',
        '....s....',
        '....k....',
        '....k....',
      ],
      { r: 'stampRed', p: 'paper', s: 'paperShadow', k: 'shadow' },
    );
  });

  // Stray (empty-area) pin: same silhouette, ink-blue head with an outline, so it
  // reads differently even without colour.
  makeGraphicsTexture(scene, TEX.pinStray, 9, 12, (g) => {
    drawPixels(
      g,
      [
        '...kkk...',
        '..kbbbk..',
        '.kbpbbbk.',
        '.kbbbbbk.',
        '.kbbbbbk.',
        '..kbbbk..',
        '...kkk...',
        '....s....',
        '....s....',
        '....s....',
        '....k....',
        '....k....',
      ],
      { b: 'ink', p: 'paper', s: 'paperShadow', k: 'shadow' },
    );
  });

  // The second look's amber tag: a small label on a string, where a pin should have gone.
  makeGraphicsTexture(scene, TEX.tagMissed, 9, 12, (g) => {
    drawPixels(
      g,
      [
        '....s....',
        '....s....',
        '..kkkkk..',
        '.kaaaaak.',
        '.kapaaak.',
        '.kaaaaak.',
        '.kakaaak.',
        '.kaaaaak.',
        '..kkkkk..',
        '.........',
        '.........',
        '.........',
      ],
      { a: 'amber', p: 'paper', s: 'paperShadow', k: 'shadow' },
    );
  });

  const tab = (key: string, active: boolean) =>
    makeGraphicsTexture(scene, key, TABS.w, TABS.h, (g) => {
      g.fillStyle(HEX[active ? 'paper' : 'paperShadow'], 1);
      g.fillRect(2, 0, TABS.w - 4, TABS.h);
      g.fillRect(0, 2, TABS.w, TABS.h - 2);
      g.fillStyle(HEX[active ? 'paperShadow' : 'woodLight'], 1);
      g.fillRect(0, 2, 1, TABS.h - 2);
      g.fillRect(TABS.w - 1, 2, 1, TABS.h - 2);
      g.fillRect(2, 0, TABS.w - 4, 1);
      if (!active) {
        g.fillStyle(HEX.shadow, 0.25);
        g.fillRect(0, 0, TABS.w, TABS.h);
      }
    });
  tab(TEX.tab, false);
  tab(TEX.tabActive, true);

  const button = (key: string, hover: boolean) =>
    makeGraphicsTexture(scene, key, 16, UI.buttonH, (g) => {
      g.fillStyle(HEX.shadow, 1);
      g.fillRect(0, 0, 16, UI.buttonH);
      g.fillStyle(HEX[hover ? 'paper' : 'paperShadow'], 1);
      g.fillRect(1, 1, 14, UI.buttonH - 2);
      g.fillStyle(HEX[hover ? 'amber' : 'woodLight'], 1);
      g.fillRect(1, UI.buttonH - 2, 14, 1);
    });
  button(TEX.button, false);
  button(TEX.buttonHover, true);

  makeGraphicsTexture(scene, TEX.pixel, 2, 2, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 2);
  });
}
