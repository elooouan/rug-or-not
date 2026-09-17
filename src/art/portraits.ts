import type Phaser from 'phaser';
import { HEX, type PaletteKey } from '@/config/palette';
import { makeRng } from '@/systems/rng';
import { portraitKey } from './keys';
import { makeGraphicsTexture } from './pixelUtil';

export type PortraitStyle = 'normal' | 'stock' | 'ai' | 'anon';
export const PORTRAIT_SIZE = 28;

/**
 * Deterministic pixel portrait from a seed. `stock` looks over-polished,
 * `ai` has subtle asymmetry, `anon` is a silhouette with a question mark.
 */
export function makePortrait(scene: Phaser.Scene, seed: string, style: PortraitStyle): string {
  const key = portraitKey(`${seed}-${style}`);
  makeGraphicsTexture(scene, key, PORTRAIT_SIZE, PORTRAIT_SIZE, (g) => {
    const rng = makeRng(seed);
    const S = PORTRAIT_SIZE;
    const bgs: PaletteKey[] = ['ink', 'lampGreen', 'woodMid', 'shadow'];
    const skins: PaletteKey[] = ['paper', 'paperShadow', 'woodLight', 'woodMid'];
    const hairs: PaletteKey[] = ['woodDark', 'shadow', 'bg', 'amber', 'paperShadow'];
    g.fillStyle(HEX[style === 'stock' ? 'paperShadow' : rng.pick(bgs)], 1);
    g.fillRect(0, 0, S, S);

    if (style === 'anon') {
      g.fillStyle(HEX.shadow, 1);
      g.fillCircle(14, 11, 7);
      g.fillRect(4, 19, 20, 9);
      g.fillStyle(HEX.paper, 1);
      // Question mark.
      g.fillRect(12, 7, 5, 1);
      g.fillRect(16, 8, 1, 2);
      g.fillRect(14, 10, 2, 1);
      g.fillRect(14, 11, 1, 2);
      g.fillRect(14, 14, 1, 1);
      return;
    }

    const skin = rng.pick(skins);
    const hair = rng.pick(hairs);
    // Shoulders.
    g.fillStyle(HEX[rng.pick<PaletteKey>(['woodDark', 'ink', 'shadow', 'lampGreen'])], 1);
    g.fillRect(3, 21, 22, 7);
    // Neck + head.
    g.fillStyle(HEX[skin], 1);
    g.fillRect(12, 18, 4, 4);
    g.fillRect(8, 5, 12, 14);
    // Hair style.
    g.fillStyle(HEX[hair], 1);
    const hs = rng.int(0, 3);
    if (hs === 0) g.fillRect(8, 4, 12, 3);
    if (hs === 1) {
      g.fillRect(7, 4, 14, 4);
      g.fillRect(7, 8, 2, 10);
      g.fillRect(19, 8, 2, 10);
    }
    if (hs === 2) {
      g.fillRect(9, 3, 10, 2);
      g.fillRect(8, 5, 12, 1);
    }
    if (hs === 3) {
      // Hat.
      g.fillRect(6, 5, 16, 2);
      g.fillRect(9, 2, 10, 3);
    }
    // Eyes (AI style: subtly uneven).
    g.fillStyle(HEX.bg, 1);
    const eyeYL = 10;
    const eyeYR = style === 'ai' ? 11 : 10;
    g.fillRect(10, eyeYL, 2, 2);
    g.fillRect(16, eyeYR, style === 'ai' ? 3 : 2, 2);
    if (rng.chance(0.3)) {
      // Glasses.
      g.fillStyle(HEX.ink, 1);
      g.fillRect(9, 9, 4, 1);
      g.fillRect(9, 12, 4, 1);
      g.fillRect(15, 9, 4, 1);
      g.fillRect(15, 12, 4, 1);
      g.fillRect(13, 10, 2, 1);
    }
    // Mouth.
    g.fillStyle(HEX.stampRed, 1);
    if (style === 'stock') g.fillRect(11, 15, 6, 1);
    else g.fillRect(12, 15, 4, 1);
    if (style === 'stock') {
      // Too-perfect teeth line + studio highlight.
      g.fillStyle(HEX.paper, 1);
      g.fillRect(12, 15, 4, 1);
      g.fillStyle(0xffffff, 0.18);
      g.fillRect(0, 0, S, 6);
    }
    if (style === 'ai') {
      // Odd earring only on one side, smeared background corner.
      g.fillStyle(HEX.amber, 1);
      g.fillRect(20, 14, 1, 2);
      g.fillStyle(HEX.paperShadow, 0.5);
      g.fillRect(0, 20, 5, 8);
    }
  });
  return key;
}
