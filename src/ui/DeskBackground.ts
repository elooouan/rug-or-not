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
import { BrowserPanel } from './BrowserPanel';
import { Vault, VAULT_COMBO } from './Vault';
import { lucienSays } from './DialogueBox';
import { localDateKey } from '@/systems/dailyCase';
import { awardBadge, bumpStat, noteSeen } from '@/systems/badges';
import { holderPerks } from '@/systems/wallet';
import { WEATHERS } from '@/systems/settings';
import { addText } from './text';
import { drawPixels } from '@/art/pixelUtil';

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

/** Texture key for the snapshot taken when the wall opens (see HistoryScene). */
export const LIVE_PHOTO_KEY = 'history-live';

type Station = 'lofi' | 'jazz' | 'static' | 'off';
const STATION_LABEL: Record<Station, string> = {
  lofi: '88.5  lo-fi',
  jazz: '92.1  late jazz',
  static: '104.3  ...static',
  off: 'off',
};
const STATIONS: Station[] = ['lofi', 'jazz', 'static', 'off'];

/** What the radio is tuned to; the music setting is the source of truth unless we're on static. */
function currentStation(): Station {
  if (audio.staticOn) return 'static';
  if (!saveStore.get().settings.music) return 'off';
  return audio.musicStyle === 'jazz' ? 'jazz' : 'lofi';
}

function tuneRadio(): Station {
  const next = STATIONS[(STATIONS.indexOf(currentStation()) + 1) % STATIONS.length];
  const playing = next === 'lofi' || next === 'jazz';
  saveStore.update((d) => (d.settings.music = playing));
  if (playing) audio.setStyle(next);
  audio.setMusic(playing);
  audio.setStatic(next === 'static', VAULT_COMBO);
  return next;
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
  private aurora!: Phaser.GameObjects.Graphics;
  private clouds!: Phaser.GameObjects.Graphics;
  private stars0!: Phaser.GameObjects.Image;
  private stars1!: Phaser.GameObjects.Image;
  private fogA!: Phaser.GameObjects.Image;
  private fogB!: Phaser.GameObjects.Image;
  private weather: Weather = 'rain';
  private sillSnow!: Phaser.GameObjects.Rectangle;
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
  /** Biscuit is following something outside (the train); idle frames wait. */
  private catWatching = false;
  private dark!: Phaser.GameObjects.Rectangle;
  private dust?: Phaser.GameObjects.Particles.ParticleEmitter;
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

    const wood = scene.add.image(0, 0, TEX.wood).setOrigin(0).setDepth(DEPTH.wood);
    wood.setInteractive({ useHandCursor: false });
    let knocks = 0;
    wood.on('pointerdown', (p: Phaser.Input.Pointer) => {
      // Idle clicks on the desk: mostly nothing, occasionally a knock.
      knocks++;
      if (knocks % 3 !== 0) return;
      audio.play('click');
      floatText(
        scene,
        p.worldX,
        p.worldY - 6,
        knocks % 9 === 0 ? "who's there?" : 'knock knock',
        'woodLight',
      );
    });
    this.buildWindow(s.weather);
    const cork = scene.add
      .image(DESK.corkboard.x, DESK.corkboard.y, TEX.corkboard)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain);
    // The polaroid at the board's right end opens the history wall.
    const polaroid = scene.add
      .zone(DESK.corkboard.x + 78, DESK.corkboard.y + 8, 34, 32)
      .setOrigin(0)
      .setDepth(DEPTH.deskProps)
      .setInteractive({ useHandCursor: false });
    polaroid.on('pointerover', () => audio.play('hover'));
    polaroid.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        audio.play('paper');
        const go = () => {
          scene.scene.launch('HistoryScene', { returnTo: scene.scene.key });
          scene.scene.pause();
        };
        // Photograph the desk as it is right now: it becomes the last polaroid on the wall.
        try {
          scene.game.renderer.snapshot((img) => {
            if (img instanceof HTMLImageElement) {
              if (scene.textures.exists(LIVE_PHOTO_KEY)) scene.textures.remove(LIVE_PHOTO_KEY);
              scene.textures.addImage(LIVE_PHOTO_KEY, img);
            }
            go();
          });
        } catch {
          go();
        }
      },
    );
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
      this.buildPhone();
      this.buildSafe();
      this.buildRadio();
      this.buildSeasonal();
    }
    if (opts.stamps !== false) this.buildInkPad();

    this.light = scene.add
      .image(0, 0, TEX.lampLight)
      .setOrigin(0)
      .setDepth(DEPTH.light)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.vignette = scene.add.image(0, 0, TEX.vignette).setOrigin(0).setDepth(DEPTH.vignette);
    // With the lamp off the desk really goes dark; only the window and the HUD keep their light.
    this.dark = scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, HEX.bg, 0.45)
      .setOrigin(0)
      .setDepth(DEPTH.light)
      .setVisible(false);
    this.overlays = [this.light, this.vignette, this.flash, this.dark];
    // Dust in the lamplight: a handful of faint motes drifting through the beam.
    if (this.motion) {
      this.dust = scene.add.particles(0, 0, TEX.pixel, {
        x: { min: DESK.lightCenter.x - 150, max: DESK.lightCenter.x + 150 },
        y: { min: 40, max: 320 },
        lifespan: { min: 7000, max: 12000 },
        speedX: { min: -3, max: 4 },
        speedY: { min: 1, max: 4 },
        // Fade in, hang, fade out.
        alpha: { values: [0, 0.3, 0.3, 0], interpolation: 'linear' },
        tint: HEX.amber,
        frequency: 900,
        maxAliveParticles: 12,
        blendMode: Phaser.BlendModes.ADD,
      });
      this.dust.setDepth(DEPTH.light - 1);
      this.overlays.push(this.dust);
    }

    this.setFlicker(s.lampFlicker && this.motion);
    if (this.motion && opts.props !== false) this.scheduleFly();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** Clickable props lift a pixel under the pointer so the desk reads as touchable. */
  private liftOnHover(obj: Phaser.GameObjects.Image, sound = true): void {
    const y0 = obj.y;
    obj.on('pointerover', () => {
      if (sound) audio.play('hover');
      obj.setY(y0 - 1);
    });
    obj.on('pointerout', () => obj.setY(y0));
  }

  // ---- the fly ----------------------------------------------------------------

  /** Now and then a fly finds the lamp. Swat it for a badge. */
  private scheduleFly(): void {
    this.scene.time.delayedCall(Phaser.Math.Between(12000, 40000), () => {
      if (!this.lampOn) {
        this.scheduleFly();
        return;
      }
      this.spawnFly();
    });
  }

  private spawnFly(): void {
    const scene = this.scene;
    const cx = DESK.lamp.x + 62;
    const cy = DESK.lamp.y + 30;
    const fly = scene.add
      .rectangle(cx, cy, 3, 2, HEX.bg)
      .setOrigin(0.5)
      .setDepth(DEPTH.deskProps + 1);
    // A generous hit box: the fly is two pixels wide.
    fly.setInteractive(new Phaser.Geom.Rectangle(-5, -5, 12, 12), Phaser.Geom.Rectangle.Contains);
    const born = scene.time.now;
    const life = Phaser.Math.Between(9000, 16000);
    let alive = true;
    const step = () => {
      if (!alive || !fly.active) return;
      const t = (scene.time.now - born) / 1000;
      // Two slow loops around the shade plus a jitter so it never looks tweened.
      fly.setPosition(
        Math.round(cx + Math.cos(t * 2.1) * 34 + Math.sin(t * 9.7) * 3),
        Math.round(cy + Math.sin(t * 3.3) * 12 + Math.cos(t * 11.3) * 2),
      );
      // Wing blur: the body flickers between two and three pixels wide.
      fly.setSize(Math.floor(t * 30) % 2 === 0 ? 3 : 2, 2);
      if (scene.time.now - born > life || !this.lampOn) leave();
    };
    const leave = () => {
      if (!alive) return;
      alive = false;
      scene.events.off(Phaser.Scenes.Events.UPDATE, step);
      scene.tweens.add({
        targets: fly,
        x: GAME_WIDTH + 10,
        y: -10,
        duration: 700,
        ease: 'Quad.easeIn',
        onComplete: () => fly.destroy(),
      });
      this.scheduleFly();
    };
    fly.on('pointerdown', () => {
      if (!alive) return;
      alive = false;
      scene.events.off(Phaser.Scenes.Events.UPDATE, step);
      audio.play('click');
      floatText(scene, fly.x, fly.y - 4, 'swat', 'amber');
      fly.destroy();
      awardBadge(scene, 'swatter');
      this.scheduleFly();
    });
    scene.events.on(Phaser.Scenes.Events.UPDATE, step);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      alive = false;
      scene.events.off(Phaser.Scenes.Events.UPDATE, step);
    });
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
    // Northern lights for coin holders, on clear nights only.
    this.aurora = scene.add.graphics().setDepth(DEPTH.windowRain).setMask(mask).setVisible(false);
    // Cloud cover: two shreds drifting over the moon whenever the night isn't clear (the
    // moon is baked into the glass, so weather has to hide it from the front).
    this.clouds = scene.add.graphics().setDepth(DEPTH.windowRain).setMask(mask).setVisible(false);
    const moonX = x + w - 60;
    const moonY = y + 4 + 12;
    const shred = (cx: number, cy: number, len: number) => {
      this.clouds.fillStyle(HEX.bg, 0.9);
      this.clouds.fillRect(cx - len / 2, cy - 2, len, 5);
      this.clouds.fillRect(cx - len / 2 + 5, cy - 4, len - 10, 2);
      this.clouds.fillStyle(HEX.shadow, 0.7);
      this.clouds.fillRect(cx - len / 2 + 3, cy - 4, len - 14, 1);
    };
    shred(moonX - 5, moonY - 3, 34);
    shred(moonX + 9, moonY + 5, 26);
    if (this.motion)
      scene.tweens.add({
        targets: this.clouds,
        x: 10,
        duration: 16000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
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
      frequency: 55,
      alpha: { start: 0.95, end: 0.3 },
      scale: { start: 1, end: 0.6 },
    });
    this.snow.setDepth(DEPTH.windowRain);
    // Snow settles on the sill.
    this.sillSnow = scene.add
      .rectangle(x + 4, y + h - 7, w - 8, 2, HEX.paper, 0.9)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain)
      .setVisible(false);

    // Click the glass to change the weather; click the moon because why not.
    glass.setInteractive({ useHandCursor: false });
    glass.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const next = cycleWeather();
      this.setWeather(next);
      if (noteSeen('weathersSeen', next).length >= WEATHERS.length)
        awardBadge(scene, 'weather-watcher');
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
    // Life in the city: a night train along the horizon, a plane across the sky.
    if (this.motion) {
      this.scheduleTrain();
      this.schedulePlane();
    }

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
            !this.catWatching &&
            this.cat.setTexture(`${TEX.cat}-${this.cat.texture.key.endsWith('-1') ? 0 : 1}`),
        }),
        scene.time.addEvent({
          delay: Phaser.Math.Between(2500, 5000),
          loop: true,
          callback: () => {
            if (this.catWatching) return;
            this.cat.setTexture(`${TEX.cat}-2`);
            scene.time.delayedCall(
              140,
              () => this.cat.active && this.cat.setTexture(`${TEX.cat}-0`),
            );
          },
        }),
        // Biscuit strolls along the sill now and then.
        scene.time.addEvent({
          delay: Phaser.Math.Between(25000, 50000),
          loop: true,
          callback: () => {
            if (this.catAsleep || !this.cat.active) return;
            const home = DESK.cat.x;
            this.cat.setFlipX(true);
            scene.tweens.chain({
              targets: this.cat,
              tweens: [
                { x: home - 70, duration: 2200, ease: 'Sine.easeInOut' },
                { x: home - 70, duration: 3000, onStart: () => this.cat.setFlipX(false) },
                {
                  x: home,
                  duration: 2200,
                  ease: 'Sine.easeInOut',
                  onStart: () => this.cat.setFlipX(false),
                },
              ],
            });
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
          delay: 70,
          loop: true,
          callback: () => {
            if (!this.aurora.visible) return;
            this.drawAurora(scene.time.now / 1000);
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
      this.scheduleSiren();
      this.scheduleShootingStar();
    }
  }

  /** A lit night train crosses the horizon every few minutes. */
  private scheduleTrain(): void {
    const t = this.scene.time.delayedCall(Phaser.Math.Between(45000, 120000), () => {
      if (this.weather !== 'fog') this.train();
      this.scheduleTrain();
    });
    this.timers.push(t);
  }

  /** Send the night train across the window now. */
  train(): void {
    const scene = this.scene;
    const { x, y, w, h } = DESK.window;
    const horizon = y + h - 6 - 1; // just above the sill line of the skyline
    const cars = 6;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const startX = dir > 0 ? x + 4 - cars * 6 : x + w - 4;
    const endX = dir > 0 ? x + w - 4 : x + 4 - cars * 6;
    const g = scene.add.graphics({ x: startX, y: horizon - 3 }).setDepth(DEPTH.windowRain);
    for (let i = 0; i < cars; i++) {
      g.fillStyle(HEX.amber, 0.9);
      g.fillRect(i * 6, 0, 4, 2);
      g.fillStyle(HEX.woodDark, 1);
      g.fillRect(i * 6 + 4, 0, 2, 2);
    }
    // Only the glass shows the train; the frame masks the ends of its run.
    const mask = scene.make.graphics({ x: 0, y: 0 }, false);
    mask.fillRect(x + 4, y + 4, w - 8, h - 10);
    g.setMask(new Phaser.Display.Masks.GeometryMask(scene, mask));
    const duration = Phaser.Math.Between(7000, 11000);
    scene.tweens.add({
      targets: g,
      x: endX,
      duration,
      ease: 'Linear',
      onComplete: () => {
        g.destroy();
        mask.destroy();
      },
    });
    // Biscuit watches it go by.
    if (this.cat?.active && !this.catWatching) {
      this.catWatching = true;
      this.cat.setTexture(`${TEX.cat}-3`);
      this.timers.push(
        scene.time.delayedCall(duration, () => {
          this.catWatching = false;
          if (this.cat.active) this.cat.setTexture(`${TEX.cat}-0`);
        }),
      );
    }
  }

  /** A plane's blinking light crosses the top of the sky, rarely. */
  private schedulePlane(): void {
    const t = this.scene.time.delayedCall(Phaser.Math.Between(90000, 240000), () => {
      if (this.weather === 'clear' || this.weather === 'snow') this.plane();
      this.schedulePlane();
    });
    this.timers.push(t);
  }

  /** Send a plane across the sky now. */
  plane(): void {
    const scene = this.scene;
    const { x, y, w } = DESK.window;
    const py = y + Phaser.Math.Between(6, 12);
    const light = scene.add
      .rectangle(x + 6, py, 1, 1, HEX.stampRed)
      .setOrigin(0)
      .setDepth(DEPTH.windowRain);
    const blink = scene.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => light.setVisible(!light.visible),
    });
    this.timers.push(blink);
    scene.tweens.add({
      targets: light,
      x: x + w - 8,
      duration: 16000,
      ease: 'Linear',
      onComplete: () => {
        blink.remove(false);
        light.destroy();
      },
    });
  }

  /** On clear nights a star falls across the window now and then. Click it to make a wish. */
  private scheduleShootingStar(): void {
    const t = this.scene.time.delayedCall(Phaser.Math.Between(20000, 55000), () => {
      if (this.weather === 'clear' && this.lampOn) this.shootingStar();
      this.scheduleShootingStar();
    });
    this.timers.push(t);
  }

  private shootingStar(): void {
    const scene = this.scene;
    const { x, y, w } = DESK.window;
    const sx = x + Phaser.Math.Between(40, w - 120);
    const sy = y + Phaser.Math.Between(6, 18);
    const star = scene.add.container(sx, sy).setDepth(DEPTH.windowRain + 1);
    // A bright head with a fading tail behind it.
    star.add(scene.add.rectangle(-8, 0, 8, 1, HEX.paper, 0.35).setOrigin(1, 0.5));
    star.add(scene.add.rectangle(-3, 0, 3, 1, HEX.paper, 0.7).setOrigin(1, 0.5));
    star.add(scene.add.rectangle(0, 0, 2, 2, HEX.paper).setOrigin(0.5));
    star.setAngle(18);
    const zone = scene.add.zone(0, 0, 18, 12).setOrigin(0.5);
    zone.setInteractive({ useHandCursor: false });
    star.add(zone);
    let wished = false;
    zone.on('pointerdown', () => {
      if (wished) return;
      wished = true;
      audio.play('unlock');
      floatText(scene, star.x, star.y - 6, 'wish granted (probably)', 'amber');
      awardBadge(scene, 'stargazer');
    });
    scene.tweens.add({
      targets: star,
      x: sx + 70,
      y: sy + 22,
      alpha: { from: 1, to: 0 },
      duration: 1100,
      ease: 'Quad.easeOut',
      onComplete: () => star.destroy(),
    });
  }

  /** Every few minutes a patrol car passes somewhere below. Noir. */
  private scheduleSiren(): void {
    const t = this.scene.time.delayedCall(Phaser.Math.Between(90000, 220000), () => {
      if (this.weather !== 'storm' && Math.random() < 0.6) audio.play('siren');
      this.scheduleSiren();
    });
    this.timers.push(t);
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
        // The room catches a little of the flash too.
        const room = this.scene.add
          .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, HEX.paper, storm ? 0.12 : 0.07)
          .setOrigin(0)
          .setDepth(DEPTH.light);
        this.scene.tweens.add({
          targets: room,
          alpha: 0,
          duration: 220,
          onComplete: () => room.destroy(),
        });
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
    this.sillSnow.setVisible(w === 'snow');
    const clear = w === 'clear';
    this.stars0.setVisible(clear);
    this.stars1.setVisible(clear && this.stars1.visible);
    this.aurora.setVisible(clear && this.motion && holderPerks());
    if (this.aurora.visible) this.drawAurora(this.scene.time.now / 1000);
    this.clouds.setVisible(rainOn || w === 'snow');
    this.fogA.setVisible(w === 'fog');
    this.fogB.setVisible(w === 'fog');
    this.lights0.setAlpha(w === 'fog' ? 0.35 : 1);
    this.lights1.setAlpha(w === 'fog' ? 0 : this.lights1.alpha);
    this.scheduleLightning();
  }

  /** Three slow ribbons of light behind the skyline. */
  private drawAurora(t: number): void {
    const g = this.aurora;
    g.clear();
    const { x, y, w } = DESK.window;
    const bands = [
      { color: HEX.lampGreen, base: y + 9, amp: 4, thick: 7, k: 0.035, speed: 0.5, alpha: 0.38 },
      { color: HEX.ink, base: y + 15, amp: 5, thick: 6, k: 0.05, speed: -0.4, alpha: 0.3 },
      { color: HEX.stampGreen, base: y + 6, amp: 3, thick: 4, k: 0.028, speed: 0.7, alpha: 0.3 },
    ];
    const step = 4;
    for (const b of bands) {
      g.fillStyle(b.color, b.alpha);
      g.beginPath();
      g.moveTo(x, b.base + Math.sin(t * b.speed) * b.amp);
      for (let px = 0; px <= w; px += step)
        g.lineTo(x + px, b.base + Math.sin(px * b.k + t * b.speed) * b.amp);
      for (let px = w; px >= 0; px -= step)
        g.lineTo(
          x + px,
          b.base + b.thick + Math.sin(px * b.k * 1.3 + t * b.speed * 0.8 + 1) * b.amp,
        );
      g.closePath();
      g.fillPath();
    }
  }

  petCat(): void {
    this.pets++;
    if (bumpStat('pets') >= 10) awardBadge(this.scene, 'cat-person');
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
    if (this.pets === 1) lucienSays(this.scene, 'cat');
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
      if (bumpStat('lampClicks') >= 10) awardBadge(this.scene, 'electrician');
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
      this.dust?.setVisible(this.lampOn);
      this.dark.setVisible(!this.lampOn);
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
    this.liftOnHover(stack, false);
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

  private buildPhone(): void {
    const scene = this.scene;
    const { x, y } = DESK.phone;
    // A soft glow pulses when today's daily case hasn't been played yet.
    const glow = scene.add
      .image(x - 4, y - 4, TEX.phoneGlow)
      .setOrigin(0)
      .setDepth(DEPTH.deskProps)
      .setAlpha(0);
    const dailyPending = saveStore.get().daily.lastPlayed !== localDateKey();
    if (dailyPending && this.motion) {
      scene.tweens.add({
        targets: glow,
        alpha: { from: 0.15, to: 0.6 },
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    const phone = scene.add.image(x, y, TEX.phone).setOrigin(0).setDepth(DEPTH.deskProps);
    phone.setInteractive({ useHandCursor: false });
    this.liftOnHover(phone);
    phone.on('pointerdown', () => {
      glow.setAlpha(0);
      scene.tweens.killTweensOf(glow);
      BrowserPanel.toggle(scene);
    });
  }

  /** The desk radio: lo-fi, static (with a numbers station underneath), off. */
  // ---- seasonal dressing ----------------------------------------------------------

  /** A pumpkin on the desk for the last week of October, fairy lights in the window for December. */
  private buildSeasonal(now: Date = new Date()): void {
    const scene = this.scene;
    const month = now.getMonth();
    const day = now.getDate();
    if (month === 9 && day >= 24) {
      const g = scene.add
        .graphics({ x: DESK.mug.x + 40, y: DESK.mug.y + 4 })
        .setDepth(DEPTH.deskProps);
      drawPixels(
        g,
        [
          '.....gg.....',
          '.....g......',
          '..oooooooo..',
          '.oooooooooo.',
          'ooo.oooo.ooo',
          'oooooooooooo',
          'oo.oooooo.oo',
          'ooo......ooo',
          '.oooooooooo.',
          '..oooooooo..',
        ],
        { o: 'amber', g: 'stampGreen' },
        0,
        0,
        2,
      );
      g.setInteractive(new Phaser.Geom.Rectangle(0, 0, 24, 20), Phaser.Geom.Rectangle.Contains);
      g.on('pointerdown', () => {
        audio.play('sip');
        floatText(
          scene,
          g.x + 6,
          g.y - 6,
          ['boo.', 'seasonal.', 'not a coin.'][Phaser.Math.Between(0, 2)],
        );
      });
      return;
    }
    if (month === 11 && day >= 10) {
      // A string of lights along the top of the window, each on its own slow blink.
      const colours: PaletteKey[] = ['stampRed', 'amber', 'stampGreen', 'ink'];
      for (let i = 0; i < 14; i++) {
        const x = DESK.window.x + 12 + i * 28;
        const y = DESK.window.y + 3 + (i % 2);
        const bulb = scene.add
          .rectangle(x, y, 2, 3, HEX[colours[i % colours.length]])
          .setOrigin(0)
          .setDepth(DEPTH.deskProps);
        if (this.motion)
          scene.tweens.add({
            targets: bulb,
            alpha: { from: 1, to: 0.25 },
            duration: 700 + (i % 5) * 180,
            yoyo: true,
            repeat: -1,
            delay: i * 90,
          });
      }
    }
  }

  private buildRadio(): void {
    const scene = this.scene;
    const { x, y } = DESK.radio;
    const radio = scene.add.image(x, y, TEX.radio).setOrigin(0).setDepth(DEPTH.deskProps);
    const light = scene.add
      .rectangle(x + 30, y + 22, 2, 2, HEX.amber)
      .setOrigin(0)
      .setDepth(DEPTH.deskProps);
    let lucienTimer: Phaser.Time.TimerEvent | undefined;
    const apply = (st: Station) => {
      light.setVisible(st !== 'off');
      scene.tweens.killTweensOf(light);
      if (st === 'static' && this.motion)
        scene.tweens.add({
          targets: light,
          alpha: { from: 1, to: 0.3 },
          duration: 90,
          yoyo: true,
          repeat: -1,
        });
      else light.setAlpha(1);
      lucienTimer?.remove(false);
      lucienTimer = undefined;
      if (st === 'static')
        lucienTimer = scene.time.delayedCall(12000, () => {
          if (currentStation() !== 'static') return;
          awardBadge(scene, 'night-radio');
          lucienSays(scene, 'radio');
        });
    };
    apply(currentStation());
    radio.setInteractive({ useHandCursor: false });
    radio.on('pointerover', () => audio.play('hover'));
    radio.on('pointerdown', () => {
      const next = tuneRadio();
      audio.play('click');
      apply(next);
      floatText(scene, x + 22, y - 2, STATION_LABEL[next]);
      scene.events.emit('radio:tune', next);
      if (this.motion) {
        radio.setScale(1.06, 0.94);
        scene.tweens.add({
          targets: radio,
          scaleX: 1,
          scaleY: 1,
          duration: 160,
          ease: 'Back.easeOut',
        });
      }
    });
  }

  private buildSafe(): void {
    const { x, y } = DESK.safe;
    const safe = this.scene.add.image(x, y, TEX.safe).setOrigin(0).setDepth(DEPTH.deskProps);
    safe.setInteractive({ useHandCursor: false });
    this.liftOnHover(safe);
    safe.on('pointerdown', () => new Vault(this.scene));
  }

  private buildInkPad(): void {
    const pad = this.scene.add
      .image(DESK.inkPad.x, DESK.inkPad.y, TEX.inkPad)
      .setOrigin(0)
      .setDepth(DEPTH.deskProps);
    pad.setInteractive({ useHandCursor: false });
    this.liftOnHover(pad, false);
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
    if (bumpStat('sips') >= 10) awardBadge(this.scene, 'wired');
    if (this.sips === 6) lucienSays(this.scene, 'coffee');
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
