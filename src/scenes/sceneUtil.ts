import type Phaser from 'phaser';
import { CursorScene } from './CursorScene';

/** Scenes launched later would cover the cursor overlay; call this in create(). */
export function keepCursorOnTop(scene: Phaser.Scene): void {
  if (scene.scene.isActive(CursorScene.KEY)) scene.scene.bringToTop(CursorScene.KEY);
}
