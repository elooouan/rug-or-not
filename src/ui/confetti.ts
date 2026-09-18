import type Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { GAME_WIDTH } from '@/config/layout';
import { HEX } from '@/config/palette';
import { audio } from '@/systems/audio';
import { saveStore } from '@/systems/save';

/** A few seconds of paper confetti from the top of the screen. Skipped under reduced motion. */
export function confetti(scene: Phaser.Scene, ms = 3000): void {
  audio.play('unlock');
  if (saveStore.get().settings.reducedMotion) return;
  const emitter = scene.add.particles(GAME_WIDTH / 2, -4, TEX.pixel, {
    x: { min: -GAME_WIDTH / 2, max: GAME_WIDTH / 2 },
    speedY: { min: 40, max: 90 },
    speedX: { min: -20, max: 20 },
    lifespan: 4000,
    quantity: 2,
    frequency: 30,
    scale: { min: 0.8, max: 1.6 },
    rotate: { start: 0, end: 360 },
    tint: [HEX.amber, HEX.stampRed, HEX.stampGreen, HEX.paper, HEX.ink],
    gravityY: 20,
  });
  emitter.setDepth(DEPTH.toast);
  scene.time.delayedCall(ms, () => emitter.stop());
  scene.time.delayedCall(ms + 4500, () => emitter.destroy());
}
