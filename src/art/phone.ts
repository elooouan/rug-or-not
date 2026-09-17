import type Phaser from 'phaser';
import { HEX } from '@/config/palette';
import { TEX } from './keys';
import { drawPixels, makeGraphicsTexture } from './pixelUtil';

const PHONE = [
  '.kkkkkkkkkkkkkkkkkkkk.',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiaaiiggiippiiwwiikk',
  'kkiiaaiiggiippiiwwiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiwwiiaaiiggiiwwiikk',
  'kkiiwwiiaaiiggiiwwiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiggiiwwiiwwiippiikk',
  'kkiiggiiwwiiwwiippiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkiiiiiiiiiiiiiiiiiikk',
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kkkkkkkkwwwwwwkkkkkkkk',
  'kkkkkkkkkkkkkkkkkkkkkk',
  '.kkkkkkkkkkkkkkkkkkkk.',
];

/** A smartphone lying on the desk: tap it to open NetScope. */
export function makePhone(scene: Phaser.Scene): void {
  makeGraphicsTexture(scene, TEX.phone, 22, 36, (g) => {
    drawPixels(g, PHONE, {
      k: 'bg',
      i: 'ink',
      a: 'amber',
      g: 'stampGreen',
      p: 'stampRed',
      w: 'paper',
    });
    // Screen sheen and body highlight.
    g.fillStyle(HEX.paper, 0.12);
    g.fillRect(2, 2, 18, 8);
    g.fillStyle(HEX.shadow, 1);
    g.fillRect(0, 1, 1, 34);
  });
  makeGraphicsTexture(scene, TEX.phoneGlow, 30, 44, (g) => {
    g.fillStyle(HEX.amber, 0.25);
    g.fillRect(0, 0, 30, 44);
    g.fillStyle(HEX.amber, 0.35);
    g.fillRect(3, 3, 24, 38);
  });
}
