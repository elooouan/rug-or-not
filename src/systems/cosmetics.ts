import type Phaser from 'phaser';
import { makeLamp, makeMagnifier, makeStamps, makeWood, TEX } from '@/art';
import type { CosmeticSelection } from './save';
import { findUnlockable } from './unlocks';

/** Regenerate the cosmetic textures for the chosen selection. Purely visual. */
export function applyCosmetics(scene: Phaser.Scene, sel: CosmeticSelection): void {
  const wood = findUnlockable('desk', sel.desk).style;
  const lamp = findUnlockable('lamp', sel.lamp).style;
  const rim = findUnlockable('rim', sel.rim).style;
  const ink = findUnlockable('ink', sel.ink).style;
  const drop = (keys: string[]) =>
    keys.forEach((k) => scene.textures.exists(k) && scene.textures.remove(k));
  drop([
    TEX.wood,
    TEX.lamp,
    TEX.cursor,
    TEX.lensRim,
    TEX.lensRimGlow,
    TEX.lensVignette,
    TEX.lensGlint,
    TEX.stampRug,
    TEX.stampLegit,
    TEX.inkPad,
  ]);
  makeWood(scene, TEX.wood, wood);
  makeLamp(scene, lamp.shade);
  makeMagnifier(scene, rim);
  makeStamps(scene, ink.rug, ink.legit);
}
