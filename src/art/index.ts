import type Phaser from 'phaser';
import {
  DEFAULT_WOOD,
  makeClock,
  makeCorkboard,
  makeDrawer,
  makeFolders,
  makeLamp,
  makeLampLight,
  makeMug,
  makeStamps,
  makeVignette,
  makeWood,
} from './desk';
import { makeIcons } from './icons';
import { makeCat, makeWindow } from './window';
import { makePhone } from './phone';
import { TEX } from './keys';
import { DEFAULT_RIM, makeMagnifier } from './magnifier';
import { makePaper } from './paper';

export { TEX, STEAM_FRAMES, portraitKey } from './keys';
export { makePortrait, PORTRAIT_SIZE, type PortraitStyle } from './portraits';
export { makeWood, makeLamp, makeStamps, type WoodStyle, DEFAULT_WOOD } from './desk';
export { makeMagnifier, type RimStyle, DEFAULT_RIM } from './magnifier';

/** Generate every placeholder texture. Called once from BootScene. */
export function generateAllTextures(scene: Phaser.Scene): void {
  makeWood(scene, TEX.wood, DEFAULT_WOOD);
  makeLamp(scene);
  makeLampLight(scene);
  makeVignette(scene);
  makeMug(scene);
  makeFolders(scene);
  makeStamps(scene);
  makeCorkboard(scene);
  makeWindow(scene);
  makeCat(scene);
  makePhone(scene);
  makeClock(scene);
  makeDrawer(scene);
  makePaper(scene);
  makeMagnifier(scene, DEFAULT_RIM);
  makeIcons(scene);
}
