import Phaser from 'phaser';
import { makeCork } from '@/art/desk';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { FONT, GAME_HEIGHT, GAME_WIDTH, WALL } from '@/config/layout';
import { HEX } from '@/config/palette';
import { HISTORY, type HistoryFrame } from '@/data/history';
import { audio } from '@/systems/audio';
import { saveStore } from '@/systems/save';
import { lucienSays } from '@/ui/DialogueBox';
import { awardBadge, badgeCount } from '@/systems/badges';
import { rankForScore } from '@/systems/ranks';
import { WEATHER_LABEL } from '@/systems/settings';
import { LIVE_PHOTO_KEY } from '@/ui/DeskBackground';
import { PixelButton } from '@/ui/PixelButton';
import { rect } from '@/ui/shapes';
import { addText, charWidth, makeText, wrapMono } from '@/ui/text';
import { shareOrDownloadCanvas } from '@/systems/shareCard';
import { toast } from '@/ui/Toast';
import { backChip, setupScene } from './sceneUtil';
import { touchScreen } from '@/ui/lensLift';

const KEY = (f: HistoryFrame): string => (f.file === 'live' ? LIVE_PHOTO_KEY : `history-${f.file}`);

/**
 * The evidence wall: every notable build of the game, pinned as a polaroid,
 * joined in order by red string. Click a photo to look closer.
 */
export class HistoryScene extends Phaser.Scene {
  static readonly KEY = 'HistoryScene';
  private returnTo = 'TitleScene';
  private string!: Phaser.GameObjects.Graphics;
  private points: { x: number; y: number }[] = [];
  private progress = 0;
  private big?: Phaser.GameObjects.Container;
  /** The published frames plus, when the desk was photographed on the way in, tonight's. */
  private frames: HistoryFrame[] = [];
  /** Cork, photos and string live here; scrolling moves the layer, not the camera. */
  private layer!: Phaser.GameObjects.Container;

  constructor() {
    super(HistoryScene.KEY);
  }

  init(data: { returnTo?: string } | undefined): void {
    this.returnTo = data?.returnTo ?? 'TitleScene';
  }

  preload(): void {
    for (const f of HISTORY)
      if (!this.textures.exists(KEY(f))) this.load.image(KEY(f), `img/history/${f.file}.jpg`);
  }

  create(): void {
    setupScene(this);
    const save = saveStore.get();
    const reduced = save.settings.reducedMotion;
    this.frames = [...HISTORY];
    if (this.textures.exists(LIVE_PHOTO_KEY)) {
      const badges = badgeCount();
      this.frames.push({
        file: 'live',
        version: 'now',
        date: new Date().toISOString().slice(0, 10),
        title: 'Tonight',
        caption: `Your desk, a moment ago. ${WEATHER_LABEL[save.settings.weather]} outside, ${rankForScore(save.totalScore)} at the desk, ${badges.earned}/${badges.total} badges on the wall.`,
      });
    }
    const frames = this.frames;
    // The wall grows downward as frames are added; the wheel slides the layer up.
    const rows = Math.ceil(frames.length / WALL.cols);
    const contentH = Math.max(GAME_HEIGHT, WALL.y0 + rows * WALL.dy + 40);
    this.layer = this.add.container(0, 0).setDepth(DEPTH.wood);
    this.layer.add(
      this.make.image({ x: 0, y: 0, key: makeCork(this, contentH) }, false).setOrigin(0),
    );
    const scrollTo = (y: number) => {
      this.layer.y = Phaser.Math.Clamp(y, -(contentH - GAME_HEIGHT), 0);
    };
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (this.big) return;
      scrollTo(this.layer.y - (dy > 0 ? 30 : -30));
    });
    // Dragging the wall scrolls it too (phones have no wheel).
    let dragY: number | null = null;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (dragY = p.worldY));
    this.input.on('pointerup', () => (dragY = null));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (dragY === null || !p.isDown || this.big) return;
      scrollTo(this.layer.y + (p.worldY - dragY));
      dragY = p.worldY;
    });
    rect(this, 0, 0, GAME_WIDTH, 22, HEX.woodDark, 0.85).setDepth(DEPTH.hud - 1);
    addText(this, GAME_WIDTH / 2, 8, 'CASE FILE: RUG OR NOT?  -  how the office came together', {
      size: FONT.size.small,
      color: 'paper',
    })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud);

    // Photos, staggered rows so the string zig-zags.
    this.points = [];
    frames.forEach((frame, i) => {
      const col = i % WALL.cols;
      const row = Math.floor(i / WALL.cols);
      const x = WALL.x0 + col * WALL.dx + (row % 2 ? WALL.stagger : 0);
      const y = WALL.y0 + row * WALL.dy;
      const photo = this.polaroid(frame, i, x, y);
      const pin = { x: x + (WALL.thumbW + WALL.frame * 2) / 2, y: y + 2 };
      this.points.push(pin);
      if (!reduced) {
        photo.setAlpha(0).setY(y - 14);
        this.tweens.add({
          targets: photo,
          alpha: 1,
          y,
          delay: 80 + i * 110,
          duration: 260,
          ease: 'Back.easeOut',
          onStart: () => audio.play('pin'),
        });
      }
    });

    // Red string, drawn progressively from photo to photo.
    this.string = this.make.graphics({ x: 0, y: 0 }, false);
    this.layer.add(this.string);
    this.progress = reduced ? 1 : 0;
    if (!reduced) {
      this.tweens.add({
        targets: this,
        progress: 1,
        duration: 200 + frames.length * 130,
        delay: 300,
        ease: 'Sine.easeInOut',
      });
    }
    this.drawString();

    const back = new PixelButton(
      this,
      GAME_WIDTH - 100,
      GAME_HEIGHT - 24,
      'Back  [Esc]',
      () => this.close(),
      { hotkey: 'ESC', width: 88 },
    );
    back.setDepth(DEPTH.hud);
    backChip(this, () => this.close());
    addText(
      this,
      8,
      GAME_HEIGHT - 12,
      `${frames.length} photos  ·  ${touchScreen() ? 'tap' : 'click'} one to look closer${rows > WALL.visibleRows ? (touchScreen() ? '  ·  drag to scroll' : '  ·  wheel to scroll') : ''}`,
      { size: FONT.size.tiny, color: 'paper' },
    ).setDepth(DEPTH.hud);

    this.time.delayedCall(reduced ? 0 : 1200 + frames.length * 130, () => {
      if (!this.big && this.scene.isActive()) lucienSays(this, 'wall');
      awardBadge(this, 'historian');
    });
  }

  private polaroid(
    frame: HistoryFrame,
    index: number,
    x: number,
    y: number,
  ): Phaser.GameObjects.Container {
    const w = WALL.thumbW + WALL.frame * 2;
    const h = WALL.thumbH + WALL.frame + WALL.frameBottom;
    const c = this.make.container({ x, y }, false);
    this.layer.add(c);
    c.add(rect(this, 3, 4, w, h, HEX.bg, 0.5));
    c.add(rect(this, 0, 0, w, h, HEX.paper));
    const img = this.make
      .image({ x: WALL.frame, y: WALL.frame, key: KEY(frame) }, false)
      .setOrigin(0);
    img.setDisplaySize(WALL.thumbW, WALL.thumbH);
    c.add(img);
    c.add(
      makeText(this, WALL.frame, WALL.frame + WALL.thumbH + 2, `${frame.version}  ${frame.title}`, {
        size: FONT.size.tiny,
        color: 'shadow',
      }),
    );
    c.add(
      makeText(this, w - WALL.frame, WALL.frame + WALL.thumbH + 2, frame.date.slice(5), {
        size: FONT.size.tiny,
        color: 'paperShadow',
      }).setOrigin(1, 0),
    );
    c.add(this.make.image({ x: w / 2 - 4, y: -6, key: TEX.pin }, false).setOrigin(0));
    if (index === this.frames.length - 1) {
      const tag = rect(this, w - 30, -5, 28, 10, HEX.stampRed);
      c.add([
        tag,
        makeText(this, w - 16, -4, 'NOW', { size: FONT.size.tiny, color: 'paper' }).setOrigin(
          0.5,
          0,
        ),
      ]);
    }
    c.setAngle(((index * 37) % 7) - 3);
    const zone = this.add.zone(0, 0, w, h).setOrigin(0);
    zone.setInteractive({ useHandCursor: false });
    zone.on('pointerover', () => {
      audio.play('hover');
      c.setScale(1.04);
    });
    zone.on('pointerout', () => c.setScale(1));
    // Taps open the photo; drags scroll the wall.
    zone.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.getDistance() < 8) this.lookCloser(frame);
    });
    c.add(zone);
    return c;
  }

  private drawString(): void {
    const g = this.string;
    g.clear();
    const total = this.points.length - 1;
    if (total < 1) return;
    const done = this.progress * total;
    g.lineStyle(1.5, HEX.stampRed, 0.95);
    for (let i = 0; i < total; i++) {
      const a = this.points[i];
      const b = this.points[i + 1];
      const t = Phaser.Math.Clamp(done - i, 0, 1);
      if (t <= 0) break;
      // Slight sag in the middle, like real string.
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 12 };
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(a.x, a.y),
        new Phaser.Math.Vector2(mid.x, mid.y),
        new Phaser.Math.Vector2(b.x, b.y),
      );
      const pts = curve.getPoints(24);
      const n = Math.max(2, Math.ceil(pts.length * t));
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let k = 1; k < n; k++) g.lineTo(pts[k].x, pts[k].y);
      g.strokePath();
    }
  }

  private lookCloser(frame: HistoryFrame): void {
    this.big?.destroy();
    audio.play('paper');
    const w = WALL.bigW + 16;
    // Tonight's photo gets a button row under the caption.
    const h = WALL.bigH + 16 + 40 + (frame.file === 'live' ? 24 : 0);
    const x = (GAME_WIDTH - w) / 2;
    const y = (GAME_HEIGHT - h) / 2 - 4;
    const c = this.add.container(0, 0).setDepth(DEPTH.overlay);
    const dim = rect(this, 0, 0, GAME_WIDTH, GAME_HEIGHT, HEX.bg, 0.6);
    dim.setInteractive({ useHandCursor: false });
    dim.on('pointerdown', () => this.closeBig());
    c.add(dim);
    c.add(rect(this, x + 4, y + 5, w, h, HEX.bg, 0.6));
    c.add(rect(this, x, y, w, h, HEX.paper));
    const img = this.make.image({ x: x + 8, y: y + 8, key: KEY(frame) }, false).setOrigin(0);
    img.setDisplaySize(WALL.bigW, WALL.bigH);
    c.add(img);
    c.add(
      makeText(
        this,
        x + 8,
        y + 8 + WALL.bigH + 4,
        `${frame.version}  ·  ${frame.date}  ·  ${frame.title}`,
        { size: FONT.size.small, color: 'woodDark' },
      ),
    );
    const cw = charWidth(this, 'body', FONT.size.body);
    wrapMono(frame.caption, Math.floor((w - 16) / cw)).forEach((l, i) =>
      c.add(
        makeText(this, x + 8, y + 8 + WALL.bigH + 16 + i * 12, l, {
          font: 'body',
          size: FONT.size.body,
          color: 'shadow',
        }),
      ),
    );
    c.add(
      makeText(this, x + w - 8, y + h - 10, 'click to close', {
        size: FONT.size.tiny,
        color: 'paperShadow',
      }).setOrigin(1, 1),
    );
    // Tonight's photo is the player's own: it can leave the office as a PNG.
    if (frame.file === 'live') {
      const save = new PixelButton(this, x + 8, y + h - 28, 'Save this photo', () => {
        const src = this.textures.get(LIVE_PHOTO_KEY).getSourceImage() as HTMLImageElement;
        const canvas = document.createElement('canvas');
        canvas.width = src.width;
        canvas.height = src.height;
        canvas.getContext('2d')?.drawImage(src, 0, 0);
        void shareOrDownloadCanvas(
          canvas,
          `rug-or-not-desk-${frame.date}.png`,
          'My desk tonight. Rug or Not?',
        ).then((res) => {
          if (res === 'cancelled' || !this.scene.isActive()) return;
          const ok = res !== 'failed';
          audio.play(ok ? 'stamp' : 'wrong');
          toast(
            this,
            res === 'shared' ? 'PHOTO SHARED' : ok ? 'PHOTO SAVED' : 'NO LUCK',
            ok ? 'your desk, tonight' : 'this browser blocks downloads',
          );
        });
      });
      save.on(
        'pointerdown',
        (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) =>
          ev.stopPropagation(),
      );
      this.children.remove(save);
      c.add(save);
    }
    c.setAngle(-1);
    if (!saveStore.get().settings.reducedMotion) {
      c.setScale(0.92).setAlpha(0);
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 160, ease: 'Back.easeOut' });
    }
    this.big = c;
  }

  private closeBig(): void {
    this.big?.destroy();
    this.big = undefined;
    audio.play('paper');
  }

  private close(): void {
    if (this.big) {
      this.closeBig();
      return;
    }
    this.scene.stop();
    this.scene.resume(this.returnTo);
  }

  override update(): void {
    if (this.progress < 1) this.drawString();
  }
}
