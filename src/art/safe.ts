import type Phaser from 'phaser';
import { HEX } from '@/config/palette';
import { TEX } from './keys';
import { drawPixels, makeGraphicsTexture } from './pixelUtil';

const SAFE = [
  '.kkkkkkkkkkkkkkkkkkkk.',
  'kkssssssssssssssssssskk',
  'kssddddddddddddddddsskk',
  'ksdddddddddddddddddsskk',
  'ksdddddddddddddddddsskk',
  'ksddddaaaaddddddpddsskk',
  'ksdddaaddaadddddpddsskk',
  'ksdddadddadddddppddsskk',
  'ksdddaaddaadddddpddsskk',
  'ksddddaaaaddddddpddsskk',
  'ksdddddddddddddddddsskk',
  'ksdddddddddddddddddsskk',
  'ksdddddddddddddddddsskk',
  'kssddddddddddddddddsskk',
  'kkssssssssssssssssssskk',
  '.kkkkkkkkkkkkkkkkkkkk.',
  '..kk..............kk..',
  '..kk..............kk..',
];

/** A squat floor safe: shadow body, lighter door, amber dial, paper handle. */
export function makeSafe(scene: Phaser.Scene): void {
  makeGraphicsTexture(scene, TEX.safe, 46, 36, (g) => {
    drawPixels(g, SAFE, { k: 'bg', s: 'shadow', d: 'woodDark', a: 'amber', p: 'paper' }, 0, 0, 2);
    g.fillStyle(HEX.paper, 0.12);
    g.fillRect(4, 4, 36, 2);
  });
}
