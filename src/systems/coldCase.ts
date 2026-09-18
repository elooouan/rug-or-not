import type Phaser from 'phaser';
import { generateCase } from './caseGen';
import { gameState } from './gameState';

/** Generate the file for `seed` and put it on the desk. */
export function startColdCase(scene: Phaser.Scene, seed: string): void {
  gameState.mode = 'cold';
  gameState.coldSeed = seed;
  gameState.currentCase = generateCase(seed);
  gameState.currentIndex = -1;
  scene.scene.start('InvestigationScene');
}
