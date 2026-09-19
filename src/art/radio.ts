import type Phaser from 'phaser';
import { HEX, type PaletteKey } from '@/config/palette';
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
export interface RadioStyle {
  body: PaletteKey;
  dark: PaletteKey;
}

export function makeRadio(scene: Phaser.Scene, style?: RadioStyle): void {
  const body = style?.body ?? 'woodMid';
  const dark = style?.dark ?? 'woodDark';
  makeGraphicsTexture(scene, TEX.radio, 44, 30, (g) => {
    drawPixels(
      g,
      RADIO,
      { k: 'bg', s: 'shadow', m: body, d: dark, a: 'amber', p: 'paper', D: dark },
      0,
      0,
      2,
    );
    g.fillStyle(HEX.paper, 0.1);
    g.fillRect(4, 8, 36, 2);
  });
}
