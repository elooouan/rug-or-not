import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, RENDER_SCALE } from '@/config/layout';
import { DEPTH } from '@/config/depth';
import { PixelButton } from '@/ui/PixelButton';
import { addText } from '@/ui/text';
import { CursorScene } from './CursorScene';
import { saveStore } from '@/systems/save';
import { rgb } from '@/config/palette';

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
    scene.cameras.main.fadeIn(160, ...rgb('bg'));
}

const LEAVING = new WeakSet<Phaser.Scene>();

/**
 * Leave for another scene the way the screens arrive: a short dip to dark, then the
 * switch (which fades the new one up). A second call during the dip is ignored, so a
 * double-click on a button can't start two scenes. Reduced motion cuts straight over.
 */
export function goTo(scene: Phaser.Scene, key: string, data?: object): void {
  if (LEAVING.has(scene)) return;
  if (saveStore.get().settings.reducedMotion || !scene.scene.isActive()) {
    scene.scene.start(key, data);
    return;
  }
  LEAVING.add(scene);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => LEAVING.delete(scene));
  const cam = scene.cameras.main;
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
  cam.fadeOut(130, ...rgb('bg'));
}

/**
 * A small "<" chip in the top-left corner: the same way out as Esc, for people who'd
 * rather not reach for the keyboard (and for phones, where there is none). Sits above
 * the lamp shade, out of the way of everything else. The caller decides what "back"
 * means on its screen.
 */
export function backChip(scene: Phaser.Scene, onPress: () => void, tip = 'back'): PixelButton {
  const chip = new PixelButton(scene, 4, 2, '<', onPress, { variant: 'ink', width: 22 });
  chip.setDepth(DEPTH.hud);
  chip.setName('backChip');
  // A word on hover, so the glyph isn't a mystery.
  const label = addText(scene, 4 + chip.bw + 4, 4, tip, { size: FONT.size.tiny, color: 'paper' })
    .setDepth(DEPTH.hud)
    .setAlpha(0);
  chip.on('pointerover', () => label.setAlpha(0.9));
  chip.on('pointerout', () => label.setAlpha(0));
  return chip;
}

/** The scene this one was launched over, if any (overlay data carries returnTo). */
function otherScene(scene: Phaser.Scene): string {
  const data = scene.scene.settings.data as { returnTo?: string } | undefined;
  return data?.returnTo ?? '';
}
