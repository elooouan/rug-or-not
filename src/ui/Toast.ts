import type Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { FONT, GAME_WIDTH } from '@/config/layout';
import { HEX } from '@/config/palette';
import { audio } from '@/systems/audio';
import { setBadgeToaster } from '@/systems/badges';
import { saveStore } from '@/systems/save';
import { rect } from './shapes';
import { makeText } from './text';

const SHOW_MS = 3000;
const SLIDE_MS = 260;
/** When each scene's toast slot frees up, so back-to-back toasts queue instead of stacking. */
const busyUntil = new WeakMap<Phaser.Scene, number>();

/** A small card that slides in at the top-right and leaves on its own. Queued per scene. */
export function toast(scene: Phaser.Scene, title: string, body: string): void {
  const now = scene.time.now;
  const at = Math.max(now, busyUntil.get(scene) ?? 0);
  busyUntil.set(scene, at + SHOW_MS + SLIDE_MS * 2 + 150);
  if (at > now)
    scene.time.delayedCall(at - now, () => scene.scene.isActive() && show(scene, title, body));
  else show(scene, title, body);
}

function show(scene: Phaser.Scene, title: string, body: string): void {
  const w = 170;
  const h = 34;
  const x = GAME_WIDTH - w - 8;
  const c = scene.add.container(0, -h - 10).setDepth(DEPTH.toast);
  c.add(rect(scene, x + 3, 6 + 3, w, h, HEX.bg, 0.5));
  c.add(rect(scene, x - 2, 6 - 2, w + 4, h + 4, HEX.woodDark));
  c.add(rect(scene, x, 6, w, h, HEX.paper));
  c.add(
    scene.make
      .image({ x: x + 8, y: 6 + 8, key: TEX.iconCheck }, false)
      .setOrigin(0)
      .setScale(1.5),
  );
  c.add(makeText(scene, x + 26, 6 + 5, title, { size: FONT.size.tiny, color: 'stampRed' }));
  c.add(
    makeText(scene, x + 26, 6 + 15, body, { font: 'body', size: FONT.size.body, color: 'shadow' }),
  );
  audio.play('unlock');
  const reduced = saveStore.get().settings.reducedMotion;
  if (reduced) {
    c.setY(0);
    scene.time.delayedCall(SHOW_MS, () => c.destroy());
    return;
  }
  scene.tweens.chain({
    targets: c,
    tweens: [
      { y: 0, duration: SLIDE_MS, ease: 'Back.easeOut' },
      { y: -h - 10, duration: 220, delay: SHOW_MS, ease: 'Quad.easeIn' },
    ],
    onComplete: () => c.destroy(),
  });
}

/** Wire the badge system to the toast UI. Called once at boot. */
export function installToasts(): void {
  setBadgeToaster((scene, title, body) => toast(scene, title, body));
}
