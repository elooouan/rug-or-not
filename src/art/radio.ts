import type Phaser from 'phaser';
import { HEX } from '@/config/palette';
import { TEX } from './keys';
import { drawPixels, makeGraphicsTexture } from './pixelUtil';

const RADIO = [
  '.......a..............',
  '.......m..............',
  '.......m..............',
  '.kkkkkkkkkkkkkkkkkkkk.',
  'kddddddddddddddddddddk',
  'kdsmsmsmsmsddpppppppdk',
  'kdmsmsmsmsmddppppappdk',
  'kdsmsmsmsmsddpppaappdk',
  'kdmsmsmsmsmddppappppdk',
  'kdsmsmsmsmsddpppppppdk',
  'kdmsmsmsmsmdddddddddDk',
  'kddddddddddddkkddkkddk',
  'kddddddddddddksddksddk',
  '.kkkkkkkkkkkkkkkkkkkk.',
  '..kk..............kk..',
];

/** A little bakelite radio: speaker grille, glowing dial, two knobs, a bent antenna. */
export function makeRadio(scene: Phaser.Scene): void {
  makeGraphicsTexture(scene, TEX.radio, 44, 30, (g) => {
    drawPixels(
      g,
      RADIO,
      { k: 'bg', s: 'shadow', m: 'woodMid', d: 'woodDark', a: 'amber', p: 'paper', D: 'woodDark' },
      0,
      0,
      2,
    );
    g.fillStyle(HEX.paper, 0.1);
    g.fillRect(4, 8, 36, 2);
  });
}
