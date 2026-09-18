import Phaser from 'phaser';
import { DEPTH } from '@/config/depth';
import { FONT, GAME_HEIGHT } from '@/config/layout';
import { HEX } from '@/config/palette';
import { audio } from '@/systems/audio';
import { saveStore } from '@/systems/save';
import { LUCIEN_FACE_TEX, LUCIEN_TEX } from './DialogueBox';
import { rect } from './shapes';
import { charWidth, makeText, wrapMono } from './text';

/**
 * Lucien's face in the corner with a short speech bubble. Non-blocking, for
 * quick reactions during play ("that's blank paper, partner").
 */
export class LucienBubble extends Phaser.GameObjects.Container {
  private static current: LucienBubble | null = null;

  static dismiss(): void {
    LucienBubble.current?.destroy();
    LucienBubble.current = null;
  }

  /** `lift` raises the bubble above things at the bottom of the screen (e.g. report buttons). */
  static say(scene: Phaser.Scene, text: string, ms = 3200, lift = 0): void {
    LucienBubble.current?.destroy();
    if (!saveStore.get().settings.quips) return;
    LucienBubble.current = new LucienBubble(scene, text, ms, lift);
  }

  constructor(scene: Phaser.Scene, text: string, ms: number, lift = 0) {
    super(scene, 0, -lift);
    // Scenes with the whole detective on the desk (the title) get the bubble beside him;
    // everywhere else his face comes with the bubble. Never both heads at once.
    const onDesk = scene.children.list.find(
      (o): o is Phaser.GameObjects.Image =>
        o instanceof Phaser.GameObjects.Image && o.texture.key === LUCIEN_TEX && o.visible,
    );
    const faceH = 40;
    const face = onDesk
      ? null
      : scene.make.image({ x: 6, y: GAME_HEIGHT - 4, key: LUCIEN_FACE_TEX }, false).setOrigin(0, 1);
    face?.setDisplaySize(Math.round(face.width * (faceH / face.height)), faceH);
    const cw = charWidth(scene, 'body', FONT.size.body);
    const maxW = 220;
    const lines = wrapMono(text, Math.floor((maxW - 12) / cw));
    const bw = Math.min(maxW, Math.max(...lines.map((l) => l.length)) * cw + 12);
    const bh = lines.length * 12 + 10;
    const bx = onDesk ? onDesk.x + onDesk.displayWidth + 4 : 6 + (face?.displayWidth ?? 0) + 4;
    const by = GAME_HEIGHT - 8 - bh;
    this.add(rect(scene, bx + 2, by + 2, bw, bh, HEX.bg, 0.4));
    this.add(rect(scene, bx - 1, by - 1, bw + 2, bh + 2, HEX.woodDark));
    this.add(rect(scene, bx, by, bw, bh, HEX.paper));
    // Little tail pointing at the face.
    this.add(rect(scene, bx - 3, by + bh - 12, 3, 3, HEX.paper));
    lines.forEach((l, i) =>
      this.add(
        makeText(scene, bx + 6, by + 5 + i * 12, l, {
          font: 'body',
          size: FONT.size.body,
          color: 'shadow',
        }),
      ),
    );
    if (face) this.add(face);
    this.setDepth(DEPTH.toast);
    scene.add.existing(this);
    // Don't linger over a pause overlay, and don't talk over the dialogue box.
    const drop = () => this.active && this.destroy();
    scene.events.once(Phaser.Scenes.Events.PAUSE, drop);
    scene.events.once('dialogue:open', drop);
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      scene.events.off(Phaser.Scenes.Events.PAUSE, drop);
      scene.events.off('dialogue:open', drop);
    });
    audio.play('hover');
    const reduced = saveStore.get().settings.reducedMotion;
    if (!reduced) {
      this.setAlpha(0).setY(6 - lift);
      scene.tweens.add({ targets: this, alpha: 1, y: -lift, duration: 160, ease: 'Quad.easeOut' });
    }
    scene.time.delayedCall(ms, () => {
      if (!this.active) return;
      if (reduced) this.destroy();
      else
        scene.tweens.add({
          targets: this,
          alpha: 0,
          duration: 200,
          onComplete: () => this.destroy(),
        });
    });
  }

  override destroy(fromScene?: boolean): void {
    if (LucienBubble.current === this) LucienBubble.current = null;
    super.destroy(fromScene);
  }
}
