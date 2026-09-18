import type Phaser from 'phaser';
import type { CaseData } from '@/data/schema';
import { generateCase } from './caseGen';
import { gameState } from './gameState';
import { saveStore } from './save';

/** Generate the file for `seed` (a `d<1-5>-` prefix pins its difficulty) and put it on the desk. */
export function startColdCase(scene: Phaser.Scene, seed: string): void {
  const m = /^d([1-5])-/.exec(seed);
  gameState.mode = 'cold';
  gameState.coldSeed = seed;
  gameState.currentCase = generateCase(seed, m ? { difficulty: Number(m[1]) } : {});
  gameState.currentIndex = -1;
  scene.scene.start('InvestigationScene');
}

/** How many ordinary campaign files have been stamped right (drives cold difficulty). */
export function solvedRegular(): number {
  const results = saveStore.get().caseResults;
  return gameState.cases.filter((c) => !c.secret && results[c.id]?.solved).length;
}

/** A file from the editor: played like a cold case (own tally, no campaign effects). */
export function startCustomCase(scene: Phaser.Scene, c: CaseData): void {
  gameState.mode = 'cold';
  gameState.coldSeed = null;
  gameState.currentCase = c;
  gameState.currentIndex = -1;
  scene.scene.start('InvestigationScene');
}
