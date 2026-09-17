import Phaser from 'phaser';
import { STEAM_FRAMES, TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { DESK, FONT, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { HEX, type PaletteKey } from '@/config/palette';
import { audio } from '@/systems/audio';
import { saveStore } from '@/systems/save';
import { addText } from './text';

export interface DeskOptions {
  /** Draw mug, folder stack, ink pad (title/select scenes want a tidier desk). */
  props?: boolean;
  stamps?: boolean;
}

/** A little word that drifts up and fades ("ahh", "click", "mrrp"). */
export function floatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color: PaletteKey = 'paper',
): void {
  const t = addText(scene, x, y, text, { size: FONT.size.small, color })
    .setOrigin(0.5, 1)
    .setDepth(DEPTH.toast);
  const reduced = saveStore.get().settings.reducedMotion;
  if (reduced) {
    scene.time.delayedCall(700, () => t.destroy());
    return;
  }
  scene.tweens.add({
    targets: t,
    y: y - 16,
    alpha: 0,
    duration: 900,
    ease: 'Sine.easeOut',
    onComplete: () => t.destroy(),
  });
}

/**
 * The shared noir desk: wood, a rainy city window with a cat on the sill,
 * corkboard, lamp, props, then the amber light pool and vignette on top.
 * Hover the coffee to take a sip; click the lamp to switch it off and on.
 */
export class DeskBackground {
  readonly light: Phaser.GameObjects.Image;
  readonly vignette: Phaser.GameObjects.Image;
  /** Screen-space overlays the lens camera must not render. */
  readonly overlays: Phaser.GameObjects.GameObject[];
  private steam?: Phaser.GameObjects.Sprite;
  private rain?: Phaser.GameObjects.Particles.ParticleEmitter;
  private lights0!: Phaser.GameObjects.Image;
  private lights1!: Phaser.GameObjects.Image;
  private flash!: Phaser.GameObjects.Image;
  private cat!: Phaser.GameObjects.Image;
  private mug?: Phaser.GameObjects.Image;
  private timers: Phaser.Time.TimerEvent[] = [];
  private flickerOn = true;
  private motion = true;
  private lampOn = true;
  private sipping = false;
  private sips = 0;

  constructor(
    private scene: Phaser.Scene,
    opts: DeskOptions = {},
  ) {
    const s = saveStore.get().settings;
    this.motion = !s.reducedMotion;

    scene.add.image(0, 0, TEX.wood).setOrigin(0).setDepth(DEPTH.wood);
    this.buildWindow(s.rain);
    scene.add
      .image(DESK.corkboard.x, DESK.corkboard.y, TEX.corkboard)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain);
    this.buildLamp();

    if (opts.props !== false) {
      scene.add
        .image(DESK.folderStack.x, DESK.folderStack.y, TEX.folderStack)
        .setOrigin(0)
        .setDepth(DEPTH.folderStack);
      this.buildMug();
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
    this.overlays = [this.light, this.vignette, this.flash];

    this.setFlicker(s.lampFlicker && this.motion);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  // ---- window -----------------------------------------------------------------

  private buildWindow(rainOn: boolean): void {
    const { x, y, w, h } = DESK.window;
    const scene = this.scene;
    scene.add.image(x, y, TEX.window).setOrigin(0).setDepth(DEPTH.windowRain);
    this.lights0 = scene.add
      .image(x, y, `${TEX.windowLights}-0`)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain);
    this.lights1 = scene.add
      .image(x, y, `${TEX.windowLights}-1`)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain)
      .setAlpha(0);
    this.flash = scene.add
      .image(x, y, TEX.windowFlash)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain)
      .setAlpha(0);

    this.rain = scene.add.particles(x + 4, y - 6, TEX.raindrop, {
      x: { min: 0, max: w - 8 },
      speedY: { min: 110, max: 150 },
      speedX: { min: 14, max: 28 },
      lifespan: 300,
      quantity: 1,
      frequency: 32,
      alpha: { start: 0.9, end: 0.15 },
      angle: 12,
    });
    this.rain.setDepth(DEPTH.windowRain);
    this.setRain(rainOn);

    // Cat on the sill: blinks, swishes its tail, and has opinions when clicked.
    this.cat = scene.add
      .image(DESK.cat.x, DESK.cat.y, `${TEX.cat}-0`)
      .setOrigin(0, 1)
      .setDepth(DEPTH.deskProps);
    this.cat.setInteractive({ useHandCursor: false });
    this.cat.on('pointerdown', () => this.petCat());
    if (this.motion) {
      this.timers.push(
        scene.time.addEvent({
          delay: 700,
          loop: true,
          callback: () =>
            this.cat.setTexture(`${TEX.cat}-${this.cat.texture.key.endsWith('-1') ? 0 : 1}`),
        }),
        scene.time.addEvent({
          delay: Phaser.Math.Between(2500, 5000),
          loop: true,
          callback: () => {
            this.cat.setTexture(`${TEX.cat}-2`);
            scene.time.delayedCall(
              140,
              () => this.cat.active && this.cat.setTexture(`${TEX.cat}-0`),
            );
          },
        }),
        // Distant windows twinkle.
        scene.time.addEvent({
          delay: 1400,
          loop: true,
          callback: () => {
            const a = this.lights1.alpha > 0.5 ? 0 : 1;
            this.lights1.setAlpha(a);
            this.lights0.setAlpha(1 - a * 0.5);
          },
        }),
      );
      this.scheduleLightning();
    }
    void h;
  }

  private scheduleLightning(): void {
    const t = this.scene.time.delayedCall(Phaser.Math.Between(18000, 45000), () => {
      if (!this.motion) return;
      this.flash.setAlpha(0.42);
      audio.play('thunder');
      this.scene.tweens.add({
        targets: this.flash,
        alpha: { from: 0.42, to: 0 },
        duration: 90,
        yoyo: true,
        repeat: 1,
        hold: 40,
        onComplete: () => this.flash.setAlpha(0),
      });
      this.scheduleLightning();
    });
    this.timers.push(t);
  }

  private petCat(): void {
    audio.play('meow');
    floatText(
      this.scene,
      this.cat.x + 14,
      this.cat.y - 22,
      ['mrrp', 'prrr', 'mew', '...'][Phaser.Math.Between(0, 3)],
    );
    const heart = this.scene.add
      .image(this.cat.x + 20, this.cat.y - 24, TEX.heart)
      .setDepth(DEPTH.toast);
    if (!this.motion) {
      this.scene.time.delayedCall(600, () => heart.destroy());
      return;
    }
    this.cat.setScale(1.1, 0.9);
    this.scene.tweens.add({
      targets: this.cat,
      scaleX: 1,
      scaleY: 1,
      duration: 260,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: heart,
      y: heart.y - 14,
      alpha: 0,
      duration: 800,
      ease: 'Sine.easeOut',
      onComplete: () => heart.destroy(),
    });
  }

  // ---- lamp -----------------------------------------------------------------------

  private buildLamp(): void {
    const lamp = this.scene.add
      .image(DESK.lamp.x, DESK.lamp.y, TEX.lamp)
      .setOrigin(0)
      .setDepth(DEPTH.deskProps);
    lamp.setInteractive({ useHandCursor: false });
    lamp.on('pointerdown', () => {
      this.lampOn = !this.lampOn;
      audio.play('click');
      floatText(this.scene, DESK.lamp.x + 58, DESK.lamp.y + 20, this.lampOn ? 'click' : 'click.');
      this.light.setVisible(this.lampOn);
      this.vignette.setAlpha(this.lampOn ? 1 : 1.4);
      this.vignette.setTint(this.lampOn ? 0xffffff : HEX.bg);
    });
  }

  // ---- coffee ---------------------------------------------------------------------

  private buildMug(): void {
    const scene = this.scene;
    this.mug = scene.add
      .image(DESK.mug.x, DESK.mug.y, TEX.mug)
      .setOrigin(0)
      .setDepth(DEPTH.deskProps);
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
    this.mug.setInteractive({ useHandCursor: false });
    this.mug.on('pointerover', () => this.sip());
  }

  private sip(): void {
    if (this.sipping || !this.mug) return;
    this.sipping = true;
    this.sips++;
    audio.play('sip');
    const lines = ['ahh', 'sip', 'mmm', 'needed that', 'still warm', 'ok. focus.'];
    const line =
      this.sips >= 8 && this.sips % 4 === 0
        ? 'too much coffee'
        : lines[Phaser.Math.Between(0, lines.length - 1)];
    floatText(this.scene, DESK.mug.x + 22, DESK.mug.y - 20, line);
    const puff = this.scene.add
      .image(DESK.mug.x + 22, DESK.mug.y - 10, TEX.steamPuff)
      .setDepth(DEPTH.deskProps)
      .setAlpha(0.7);
    if (!this.motion) {
      this.scene.time.delayedCall(500, () => puff.destroy());
      this.scene.time.delayedCall(1800, () => (this.sipping = false));
      return;
    }
    const mug = this.mug;
    const steam = this.steam;
    const x0 = mug.x;
    const y0 = mug.y;
    this.scene.tweens.chain({
      targets: mug,
      tweens: [
        { y: y0 - 10, x: x0 + 6, angle: -14, duration: 220, ease: 'Sine.easeOut' },
        { angle: -18, duration: 260, ease: 'Sine.easeInOut' },
        { y: y0, x: x0, angle: 0, duration: 260, ease: 'Bounce.easeOut' },
      ],
      onComplete: () => this.scene.time.delayedCall(1200, () => (this.sipping = false)),
    });
    steam?.setVisible(false);
    this.scene.tweens.add({
      targets: puff,
      y: puff.y - 18,
      alpha: 0,
      scale: 1.6,
      duration: 700,
      ease: 'Sine.easeOut',
      onComplete: () => {
        puff.destroy();
        steam?.setVisible(this.motion);
      },
    });
  }

  // ---- settings hooks ---------------------------------------------------------------

  setFlicker(on: boolean): void {
    this.flickerOn = on;
    this.light.setAlpha(1);
    if (on) this.scheduleFlicker();
  }

  private scheduleFlicker(): void {
    if (!this.flickerOn) return;
    const t = this.scene.time.delayedCall(Phaser.Math.Between(1800, 6500), () => {
      if (!this.flickerOn) return;
      this.scene.tweens.add({
        targets: this.light,
        alpha: { from: 1, to: 0.82 },
        duration: 55,
        yoyo: true,
        repeat: Phaser.Math.Between(0, 1),
        ease: 'Sine.easeInOut',
        onComplete: () => this.scheduleFlicker(),
      });
    });
    this.timers.push(t);
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
    this.timers.forEach((t) => t.remove(false));
    this.timers = [];
  }
}
