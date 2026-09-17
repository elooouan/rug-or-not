import Phaser from 'phaser';
import { TEX, STEAM_FRAMES } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { DESK, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { saveStore } from '@/systems/save';

export interface DeskOptions {
  /** Draw mug, folder stack, ink pad (title/select scenes want a tidier desk). */
  props?: boolean;
  stamps?: boolean;
}

/**
 * The shared noir desk: wood, window rain, corkboard, lamp, props, then the
 * amber light pool and vignette on top. Every scene builds one of these.
 */
export class DeskBackground {
  readonly light: Phaser.GameObjects.Image;
  readonly vignette: Phaser.GameObjects.Image;
  /** Screen-space overlays the lens camera must not render. */
  readonly overlays: Phaser.GameObjects.GameObject[];
  private steam?: Phaser.GameObjects.Sprite;
  private rain?: Phaser.GameObjects.Particles.ParticleEmitter;
  private flickerTimer?: Phaser.Time.TimerEvent;
  private flickerOn = true;
  private motion = true;

  constructor(
    private scene: Phaser.Scene,
    opts: DeskOptions = {},
  ) {
    const s = saveStore.get().settings;
    this.motion = !s.reducedMotion;

    scene.add.image(0, 0, TEX.wood).setOrigin(0).setDepth(DEPTH.wood);

    // Window + rain along the top edge.
    scene.add
      .image(DESK.window.x, DESK.window.y, TEX.window)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain);
    this.rain = scene.add.particles(DESK.window.x + 4, DESK.window.y - 4, TEX.raindrop, {
      x: { min: 0, max: DESK.window.w - 8 },
      speedY: { min: 90, max: 130 },
      speedX: { min: 10, max: 24 },
      lifespan: 180,
      quantity: 1,
      frequency: 45,
      alpha: { start: 0.9, end: 0.2 },
    });
    this.rain.setDepth(DEPTH.windowRain);
    this.setRain(s.rain);

    scene.add
      .image(DESK.corkboard.x, DESK.corkboard.y, TEX.corkboard)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain);
    scene.add.image(DESK.lamp.x, DESK.lamp.y, TEX.lamp).setOrigin(0).setDepth(DEPTH.deskProps);

    if (opts.props !== false) {
      scene.add
        .image(DESK.folderStack.x, DESK.folderStack.y, TEX.folderStack)
        .setOrigin(0)
        .setDepth(DEPTH.folderStack);
      scene.add.image(DESK.mug.x, DESK.mug.y, TEX.mug).setOrigin(0).setDepth(DEPTH.deskProps);
      this.steam = scene.add
        .sprite(DESK.mug.x + 10, DESK.mug.y - 17, `${TEX.steam}-0`)
        .setOrigin(0)
        .setDepth(DEPTH.deskProps)
        .setAlpha(0.55);
      if (!scene.anims.exists('steam')) {
        scene.anims.create({
          key: 'steam',
          frames: Array.from({ length: STEAM_FRAMES }, (_, i) => ({ key: `${TEX.steam}-${i}` })),
          frameRate: 4,
          repeat: -1,
        });
      }
      this.setSteam(this.motion);
    }
    if (opts.stamps !== false) {
      scene.add
        .image(DESK.inkPad.x, DESK.inkPad.y, TEX.inkPad)
        .setOrigin(0)
        .setDepth(DEPTH.deskProps);
    }

    this.light = scene.add
      .image(0, 0, TEX.lampLight)
      .setOrigin(0)
      .setDepth(DEPTH.light)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.vignette = scene.add.image(0, 0, TEX.vignette).setOrigin(0).setDepth(DEPTH.vignette);
    this.overlays = [this.light, this.vignette];

    this.setFlicker(s.lampFlicker && this.motion);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  setFlicker(on: boolean): void {
    this.flickerOn = on;
    this.flickerTimer?.remove(false);
    this.flickerTimer = undefined;
    this.light.setAlpha(1);
    if (on) this.scheduleFlicker();
  }

  private scheduleFlicker(): void {
    if (!this.flickerOn) return;
    const delay = Phaser.Math.Between(1800, 6500);
    this.flickerTimer = this.scene.time.delayedCall(delay, () => {
      if (!this.flickerOn) return;
      const dips = Phaser.Math.Between(1, 2);
      this.scene.tweens.add({
        targets: this.light,
        alpha: { from: 1, to: 0.82 },
        duration: 55,
        yoyo: true,
        repeat: dips - 1,
        ease: 'Sine.easeInOut',
        onComplete: () => this.scheduleFlicker(),
      });
    });
  }

  setSteam(on: boolean): void {
    if (!this.steam) return;
    this.steam.setVisible(on);
    if (on) this.steam.play('steam');
    else this.steam.stop();
  }

  setRain(on: boolean): void {
    if (!this.rain) return;
    if (on) this.rain.start();
    else {
      this.rain.stop();
      this.rain.killAll();
    }
  }

  /** Full-screen size helper for scenes drawing extra overlays. */
  static get size(): { w: number; h: number } {
    return { w: GAME_WIDTH, h: GAME_HEIGHT };
  }

  destroy(): void {
    this.flickerTimer?.remove(false);
  }
}
