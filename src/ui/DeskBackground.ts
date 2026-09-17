import Phaser from 'phaser';
import { STEAM_FRAMES, TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { DESK, FONT, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { HEX, type PaletteKey } from '@/config/palette';
import { audio } from '@/systems/audio';
import { saveStore } from '@/systems/save';
import { WEATHER_LABEL, type Weather } from '@/systems/settings';
import { cycleWeather } from '@/systems/weather';
import { TIPS } from '@/data/tips';
import { StickyNote } from './StickyNote';
import { CursorScene } from '@/scenes/CursorScene';
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
  private snow?: Phaser.GameObjects.Particles.ParticleEmitter;
  private stars0!: Phaser.GameObjects.Image;
  private stars1!: Phaser.GameObjects.Image;
  private fogA!: Phaser.GameObjects.Image;
  private fogB!: Phaser.GameObjects.Image;
  private weather: Weather = 'rain';
  private lightningTimer?: Phaser.Time.TimerEvent;
  private lights0!: Phaser.GameObjects.Image;
  private lights1!: Phaser.GameObjects.Image;
  private flash!: Phaser.GameObjects.Image;
  private cat!: Phaser.GameObjects.Image;
  private mug?: Phaser.GameObjects.Image;
  private timers: Phaser.Time.TimerEvent[] = [];
  private flickerOn = true;
  private motion = true;
  private lampOn = true;
  private lampClicks = 0;
  private sipping = false;
  private sips = 0;
  private pets = 0;
  private catAsleep = false;
  private note?: StickyNote;

  constructor(
    private scene: Phaser.Scene,
    opts: DeskOptions = {},
  ) {
    const s = saveStore.get().settings;
    this.motion = !s.reducedMotion;

    scene.add.image(0, 0, TEX.wood).setOrigin(0).setDepth(DEPTH.wood);
    this.buildWindow(s.weather);
    const cork = scene.add
      .image(DESK.corkboard.x, DESK.corkboard.y, TEX.corkboard)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain);
    cork.setInteractive({ useHandCursor: false });
    cork.on('pointerdown', () => {
      this.note?.destroy();
      const tip = TIPS[Phaser.Math.Between(0, TIPS.length - 1)];
      this.note = new StickyNote(
        scene,
        DESK.corkboard.x - 120,
        DESK.corkboard.y + 44,
        'from the corkboard',
        tip,
        220,
      );
    });
    this.buildLamp();

    if (opts.props !== false) {
      this.buildFolderStack();
      this.buildMug();
    }
    if (opts.stamps !== false) this.buildInkPad();

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

  private buildWindow(weather: Weather): void {
    const { x, y, w, h } = DESK.window;
    const scene = this.scene;
    const glass = scene.add.image(x, y, TEX.window).setOrigin(0).setDepth(DEPTH.windowRain);
    this.stars0 = scene.add
      .image(x, y, `${TEX.stars}-0`)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain)
      .setVisible(false);
    this.stars1 = scene.add
      .image(x, y, `${TEX.stars}-1`)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain)
      .setVisible(false);
    this.lights0 = scene.add
      .image(x, y, `${TEX.windowLights}-0`)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain);
    this.lights1 = scene.add
      .image(x, y, `${TEX.windowLights}-1`)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain)
      .setAlpha(0);
    // Fog: two wide bands drifting in opposite directions, masked to the glass.
    const fogMask = scene.make.graphics({ x: 0, y: 0 }, false);
    fogMask.fillStyle(0xffffff, 1);
    fogMask.fillRect(x + 4, y + 4, w - 8, h - 10);
    const mask = new Phaser.Display.Masks.GeometryMask(scene, fogMask);
    this.fogA = scene.add
      .image(x - w, y + 4, TEX.fog)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain)
      .setAlpha(0.35)
      .setMask(mask)
      .setVisible(false);
    this.fogB = scene.add
      .image(x, y + 4, TEX.fog)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain)
      .setAlpha(0.25)
      .setMask(mask)
      .setVisible(false);
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
    this.snow = scene.add.particles(x + 4, y - 3, TEX.snowflake, {
      x: { min: 0, max: w - 8 },
      speedY: { min: 14, max: 30 },
      speedX: { min: -10, max: 10 },
      lifespan: 1600,
      quantity: 1,
      frequency: 90,
      alpha: { start: 0.95, end: 0.3 },
      scale: { start: 1, end: 0.6 },
    });
    this.snow.setDepth(DEPTH.windowRain);

    // Click the glass to change the weather; click the moon because why not.
    glass.setInteractive({ useHandCursor: false });
    glass.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const next = cycleWeather();
      this.setWeather(next);
      floatText(scene, p.worldX, y + h + 8, WEATHER_LABEL[next]);
      audio.play('click');
    });
    const moon = scene.add
      .zone(x + w - 66, y, 22, 22)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain)
      .setInteractive({ useHandCursor: false });
    moon.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        audio.play('hover');
        const lines = [
          'made of cheese. allegedly.',
          'waxing. or waning. one of those.',
          'no rugs on the moon. yet.',
          'a moon, unrelated to any coin.',
          'just vibing up there.',
        ];
        floatText(scene, x + w - 55, y + 4, lines[Phaser.Math.Between(0, lines.length - 1)]);
      },
    );
    this.setWeather(weather);

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
            if (this.weather === 'fog') return;
            const a = this.lights1.alpha > 0.5 ? 0 : 1;
            this.lights1.setAlpha(a);
            this.lights0.setAlpha(1 - a * 0.5);
            if (this.weather === 'clear') this.stars1.setVisible(!this.stars1.visible);
          },
        }),
        scene.time.addEvent({
          delay: 50,
          loop: true,
          callback: () => {
            if (this.weather !== 'fog') return;
            const { x, w } = DESK.window;
            this.fogA.x += 0.35;
            this.fogB.x -= 0.2;
            if (this.fogA.x > x) this.fogA.x = x - w;
            if (this.fogB.x < x - w) this.fogB.x = x;
          },
        }),
      );
      this.scheduleLightning();
    }
  }

  private scheduleLightning(): void {
    this.lightningTimer?.remove(false);
    if (this.weather !== 'rain' && this.weather !== 'storm') return;
    const storm = this.weather === 'storm';
    this.lightningTimer = this.scene.time.delayedCall(
      storm ? Phaser.Math.Between(5000, 14000) : Phaser.Math.Between(18000, 45000),
      () => {
        if (!this.motion) return;
        const peak = storm ? 0.6 : 0.42;
        this.flash.setAlpha(peak);
        audio.play('thunder');
        this.scene.tweens.add({
          targets: this.flash,
          alpha: { from: peak, to: 0 },
          duration: 90,
          yoyo: true,
          repeat: storm ? 2 : 1,
          hold: 40,
          onComplete: () => this.flash.setAlpha(0),
        });
        this.scheduleLightning();
      },
    );
    this.timers.push(this.lightningTimer);
  }

  /** Swap the sky: particles, stars, fog, lightning cadence. */
  setWeather(w: Weather): void {
    this.weather = w;
    const rainOn = w === 'rain' || w === 'storm';
    if (this.rain) {
      if (rainOn) {
        this.rain.frequency = w === 'storm' ? 12 : 32;
        this.rain.speedY = w === 'storm' ? { min: 170, max: 230 } : { min: 110, max: 150 };
        this.rain.start();
      } else {
        this.rain.stop();
        this.rain.killAll();
      }
    }
    if (this.snow) {
      if (w === 'snow') this.snow.start();
      else {
        this.snow.stop();
        this.snow.killAll();
      }
    }
    const clear = w === 'clear';
    this.stars0.setVisible(clear);
    this.stars1.setVisible(clear && this.stars1.visible);
    this.fogA.setVisible(w === 'fog');
    this.fogB.setVisible(w === 'fog');
    this.lights0.setAlpha(w === 'fog' ? 0.35 : 1);
    this.lights1.setAlpha(w === 'fog' ? 0 : this.lights1.alpha);
    this.scheduleLightning();
  }

  private petCat(): void {
    this.pets++;
    if (this.catAsleep) {
      floatText(this.scene, this.cat.x + 14, this.cat.y - 22, 'zzz');
      return;
    }
    if (this.pets >= 7) {
      this.catAsleep = true;
      audio.play('meow');
      floatText(this.scene, this.cat.x + 14, this.cat.y - 22, 'enough.');
      this.cat.setTexture(`${TEX.cat}-2`);
      this.scene.time.delayedCall(12000, () => {
        this.catAsleep = false;
        this.pets = 0;
        if (this.cat.active) this.cat.setTexture(`${TEX.cat}-0`);
      });
      return;
    }
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
      this.lampClicks++;
      audio.play('click');
      const line =
        this.lampClicks === 10
          ? 'please stop'
          : this.lampClicks > 10 && this.lampClicks % 5 === 0
            ? 'the bulb has feelings'
            : this.lampOn
              ? 'click'
              : 'click.';
      floatText(this.scene, DESK.lamp.x + 58, DESK.lamp.y + 20, line);
      this.light.setVisible(this.lampOn);
      this.vignette.setAlpha(this.lampOn ? 1 : 1.4);
      this.vignette.setTint(this.lampOn ? 0xffffff : HEX.bg);
    });
  }

  private buildFolderStack(): void {
    const stack = this.scene.add
      .image(DESK.folderStack.x, DESK.folderStack.y, TEX.folderStack)
      .setOrigin(0)
      .setDepth(DEPTH.folderStack);
    stack.setInteractive({ useHandCursor: false });
    const lines = [
      'cold cases',
      'nothing new',
      'a pizza coupon. expired.',
      'the $PUPCOIN file. again.',
      'someone spilled coffee on these',
      'a rubber duck?',
    ];
    stack.on('pointerdown', () => {
      audio.play('paper');
      floatText(
        this.scene,
        DESK.folderStack.x + 48,
        DESK.folderStack.y - 4,
        lines[Phaser.Math.Between(0, lines.length - 1)],
      );
      if (this.motion) {
        this.scene.tweens.add({
          targets: stack,
          y: DESK.folderStack.y - 3,
          duration: 90,
          yoyo: true,
          ease: 'Quad.easeOut',
        });
      }
    });
  }

  private buildInkPad(): void {
    const pad = this.scene.add
      .image(DESK.inkPad.x, DESK.inkPad.y, TEX.inkPad)
      .setOrigin(0)
      .setDepth(DEPTH.deskProps);
    pad.setInteractive({ useHandCursor: false });
    pad.on('pointerdown', () => {
      audio.play('pin');
      floatText(this.scene, DESK.inkPad.x + 31, DESK.inkPad.y - 4, 'ink on your thumb');
      const cursor = this.scene.scene.get(CursorScene.KEY) as CursorScene | null;
      cursor?.setInked(6000);
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

  /** Full-screen size helper for scenes drawing extra overlays. */
  static get size(): { w: number; h: number } {
    return { w: GAME_WIDTH, h: GAME_HEIGHT };
  }

  destroy(): void {
    this.timers.forEach((t) => t.remove(false));
    this.timers = [];
  }
}
