import { goTo } from '@/scenes/sceneUtil';
import type Phaser from 'phaser';
import type { CaseData } from '@/data/schema';
import { generateCase } from './caseGen';
import { gameState } from './gameState';

/** Generate the file for `seed` (a `d<1-5>-` prefix pins its difficulty) and put it on the desk. */
export function startColdCase(scene: Phaser.Scene, seed: string): void {
  const m = /^d([1-5])-/.exec(seed);
  gameState.mode = 'cold';
  gameState.coldSeed = seed;
  // The weekly is for everyone, so it sits in the middle of the range (3 or 4).
  const wk = /^(?:week|holders)-\d{4}-w(\d{2})$/.exec(seed);
  // Both weekly files sit mid-range; the holders' one a notch harder.
  const weekly = wk
    ? { difficulty: 3 + (Number(wk[1]) % 2) + (seed.startsWith('holders-') ? 1 : 0) }
    : {};
  gameState.currentCase = generateCase(seed, m ? { difficulty: Number(m[1]) } : weekly);
  gameState.currentIndex = -1;
  goTo(scene, 'InvestigationScene');
}

export { coldDifficulty, solvedRegular } from './gameState';

/** A file from the editor: played like a cold case (own tally, no campaign effects). */
export function startCustomCase(scene: Phaser.Scene, c: CaseData): void {
  gameState.mode = 'cold';
  gameState.coldSeed = null;
  gameState.currentCase = c;
  gameState.currentIndex = -1;
  goTo(scene, 'InvestigationScene');
}

/** Today's daily (handcrafted or generated) goes on the desk. */
export function startDaily(scene: Phaser.Scene, c: CaseData): void {
  gameState.mode = 'daily';
  gameState.coldSeed = null;
  gameState.currentCase = c;
  gameState.currentIndex = gameState.cases.indexOf(c);
  goTo(scene, 'InvestigationScene');
}
