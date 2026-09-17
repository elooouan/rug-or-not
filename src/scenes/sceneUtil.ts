import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from '@/config/layout';
import { CursorScene } from './CursorScene';

/**
 * Call first thing in every scene's create(): points the main camera at the
 * 640x360 world at RENDER_SCALE zoom and keeps the cursor overlay on top.
 */
export function setupScene(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(RENDER_SCALE).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  if (scene.scene.isActive(CursorScene.KEY)) scene.scene.bringToTop(CursorScene.KEY);
}
