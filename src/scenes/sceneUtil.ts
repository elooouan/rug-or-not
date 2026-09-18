import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from '@/config/layout';
import { CursorScene } from './CursorScene';
import { saveStore } from '@/systems/save';

/**
 * Call first thing in every scene's create(): points the main camera at the
 * 640x360 world at RENDER_SCALE zoom and keeps the cursor overlay on top.
 */
export function setupScene(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(RENDER_SCALE).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  if (scene.scene.isActive(CursorScene.KEY)) {
    // While the scene manager is mid-step, bringToTop only queues itself; queued from
    // inside the queue it re-queues forever (the manager's flag stays up after a frame
    // that threw). Wait for the step to end instead.
    if (scene.scene.manager.isProcessing)
      scene.events.once(Phaser.Scenes.Events.POST_UPDATE, () =>
        scene.scene.bringToTop(CursorScene.KEY),
      );
    else scene.scene.bringToTop(CursorScene.KEY);
  }
  // A short fade up from the dark so screens don't hard-cut. Overlays launched on top of a
  // paused scene skip it (they slide in over the desk).
  if (!saveStore.get().settings.reducedMotion && !scene.scene.isPaused(otherScene(scene)))
    scene.cameras.main.fadeIn(160, 0x1b, 0x1a, 0x1f);
}

/** The scene this one was launched over, if any (overlay data carries returnTo). */
function otherScene(scene: Phaser.Scene): string {
  const data = scene.scene.settings.data as { returnTo?: string } | undefined;
  return data?.returnTo ?? '';
}
