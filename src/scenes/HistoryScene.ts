import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { FONT, GAME_HEIGHT, GAME_WIDTH, WALL } from '@/config/layout';
import { HEX } from '@/config/palette';
import { HISTORY, type HistoryFrame } from '@/data/history';
import { audio } from '@/systems/audio';
import { saveStore } from '@/systems/save';
import { lucienSaysNow } from '@/ui/DialogueBox';
import { awardBadge } from '@/systems/badges';
import { PixelButton } from '@/ui/PixelButton';
import { rect } from '@/ui/shapes';
import { addText, charWidth, makeText, wrapMono } from '@/ui/text';
import { setupScene } from './sceneUtil';

const KEY = (f: HistoryFrame): string => `history-${f.file}`;

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
    const reduced = saveStore.get().settings.reducedMotion;
    this.add.image(0, 0, TEX.cork).setOrigin(0).setDepth(DEPTH.wood);
    addText(this, GAME_WIDTH / 2, 8, 'CASE FILE: RUG OR NOT?  -  how the office came together', {
      size: FONT.size.small,
      color: 'paper',
    })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud);

    // Photos, staggered rows so the string zig-zags.
    this.points = [];
    HISTORY.forEach((frame, i) => {
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
    this.string = this.add.graphics().setDepth(DEPTH.pins + 1);
    this.progress = reduced ? 1 : 0;
    if (!reduced) {
      this.tweens.add({
        targets: this,
        progress: 1,
        duration: 200 + HISTORY.length * 130,
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
    addText(this, 8, GAME_HEIGHT - 12, `${HISTORY.length} photos  ·  click one to look closer`, {
      size: FONT.size.tiny,
      color: 'paper',
    }).setDepth(DEPTH.hud);

    this.time.delayedCall(reduced ? 0 : 1200 + HISTORY.length * 130, () => {
      if (!this.big && this.scene.isActive()) lucienSaysNow(this, 'wall');
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
    const c = this.add.container(x, y).setDepth(DEPTH.pins);
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
    if (index === HISTORY.length - 1) {
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
    zone.on('pointerdown', () => this.lookCloser(frame));
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
    const h = WALL.bigH + 16 + 40;
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
