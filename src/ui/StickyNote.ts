import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { HEX } from '@/config/palette';
import { audio } from '@/systems/audio';
import { saveStore } from '@/systems/save';
import { rect } from './shapes';
import { charWidth, makeText, wrapMono } from './text';

/** A pinned paper note that pops up near a point and closes on click. */
export class StickyNote extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, title: string, body: string, width = 200) {
    super(scene, 0, 0);
    const pad = 8;
    const cw = charWidth(scene, 'body', FONT.size.body);
    const lines = wrapMono(body, Math.floor((width - pad * 2) / cw));
    const h = pad * 2 + 14 + lines.length * 12 + 12;
    // Keep the note on screen.
    const nx = Phaser.Math.Clamp(x, 4, GAME_WIDTH - width - 4);
    const ny = Phaser.Math.Clamp(y, 4, GAME_HEIGHT - h - 4);
    const shadow = rect(scene, nx + 3, ny + 4, width, h, HEX.bg, 0.5);
    const paper = rect(scene, nx, ny, width, h, HEX.paper);
    const edge = rect(scene, nx, ny + h - 1, width, 1, HEX.paperShadow);
    const pin = scene.make
      .image({ x: nx + width / 2, y: ny - 4, key: TEX.pin }, false)
      .setOrigin(0.5, 0);
    this.add([shadow, paper, edge, pin]);
    this.add(
      makeText(scene, nx + pad, ny + pad - 2, title, { size: FONT.size.small, color: 'stampRed' }),
    );
    lines.forEach((l, i) =>
      this.add(
        makeText(scene, nx + pad, ny + pad + 12 + i * 12, l, {
          font: 'body',
          size: FONT.size.body,
          color: 'shadow',
        }),
      ),
    );
    this.add(
      makeText(scene, nx + width - pad, ny + h - pad - 2, 'click to close', {
        size: FONT.size.tiny,
        color: 'paperShadow',
      }).setOrigin(1, 1),
    );
    paper.setInteractive({ useHandCursor: false });
    paper.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        this.close();
      },
    );
    this.setDepth(DEPTH.toast);
    this.setAngle(Phaser.Math.Between(-3, 3));
    scene.add.existing(this);
    audio.play('paper');
    if (!saveStore.get().settings.reducedMotion) {
      this.setAlpha(0).setScale(0.9);
      scene.tweens.add({ targets: this, alpha: 1, scale: 1, duration: 160, ease: 'Back.easeOut' });
    }
  }

  close(): void {
    audio.play('paper');
    if (saveStore.get().settings.reducedMotion) {
      this.destroy();
      return;
    }
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.9,
      duration: 120,
      onComplete: () => this.destroy(),
    });
  }
}
