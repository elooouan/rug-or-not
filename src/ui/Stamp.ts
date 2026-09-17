import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { FONT, PAPER, STAMP } from '@/config/layout';
import { HEX, type PaletteKey } from '@/config/palette';
import { audio } from '@/systems/audio';
import { saveStore } from '@/systems/save';
import type { Verdict } from '@/systems/scoring';
import { makeText } from './text';
import { rect } from '@/ui/shapes';

export interface StampOpts {
  verdict: Verdict;
  ink: PaletteKey;
  /** Called when the stamp is clicked or dropped on the paper. */
  onStamp: (verdict: Verdict) => void;
  /** World-space test: is this point over the case paper? */
  overPaper: (x: number, y: number) => boolean;
}

/** A rubber stamp on the desk: click it or drag it onto the case to stamp. */
export class Stamp extends Phaser.GameObjects.Container {
  readonly verdict: Verdict;
  private sprite: Phaser.GameObjects.Image;
  private home: { x: number; y: number };
  private dragging = false;
  private locked = false;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: StampOpts) {
    super(scene, x, y);
    this.verdict = opts.verdict;
    this.home = { x, y };
    this.sprite = scene.make
      .image({ x: 0, y: 0, key: opts.verdict === 'rug' ? TEX.stampRug : TEX.stampLegit }, false)
      .setOrigin(0.5, 1);
    const label = makeText(scene, 0, 3, opts.verdict === 'rug' ? 'RUG  [R]' : 'LEGIT  [L]', {
      size: FONT.size.tiny,
      color: 'paper',
    }).setOrigin(0.5, 0);
    const icon = scene.make
      .image({ x: 0, y: -21, key: opts.verdict === 'rug' ? TEX.iconCross : TEX.iconCheck }, false)
      .setOrigin(0.5)
      .setScale(0.9);
    this.add([this.sprite, icon, label]);
    this.setSize(50, 34);
    this.setInteractive(new Phaser.Geom.Rectangle(0, -15, 50, 34), Phaser.Geom.Rectangle.Contains);
    scene.input.setDraggable(this);

    let moved = 0;
    this.on('dragstart', () => {
      if (this.locked) return;
      this.dragging = true;
      moved = 0;
      this.setDepth(DEPTH.stampAnim);
      audio.play('tick');
    });
    this.on('drag', (_p: Phaser.Input.Pointer, dx: number, dy: number) => {
      if (this.locked) return;
      moved++;
      this.setPosition(Math.round(dx), Math.round(dy));
    });
    this.on('dragend', (p: Phaser.Input.Pointer) => {
      if (this.locked) return;
      this.dragging = false;
      this.setDepth(DEPTH.stamps);
      if (moved < 3) {
        // Treat as a click.
        this.setPosition(this.home.x, this.home.y);
        this.slam(opts.onStamp);
        return;
      }
      if (opts.overPaper(p.worldX, p.worldY)) {
        this.slam(opts.onStamp);
      } else {
        scene.tweens.add({
          targets: this,
          x: this.home.x,
          y: this.home.y,
          duration: 220,
          ease: 'Cubic.easeOut',
        });
      }
    });
    this.on('pointerover', () => !this.dragging && !this.locked && this.sprite.setY(-2));
    this.on('pointerout', () => !this.dragging && this.sprite.setY(0));
    scene.add.existing(this);
  }

  /** Programmatic stamp (keyboard). */
  trigger(onStamp: (v: Verdict) => void): void {
    if (this.locked) return;
    this.slam(onStamp);
  }

  setLocked(l: boolean): void {
    this.locked = l;
    if (l) this.disableInteractive();
    else this.setInteractive();
  }

  private slam(onStamp: (v: Verdict) => void): void {
    this.locked = true;
    this.disableInteractive();
    const reduced = saveStore.get().settings.reducedMotion;
    const target = { x: STAMP.impression.x, y: STAMP.impression.y + 18 };
    this.setDepth(DEPTH.stampAnim);
    if (reduced) {
      this.setPosition(target.x, target.y);
      audio.play('stamp');
      onStamp(this.verdict);
      return;
    }
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { x: target.x, y: target.y - 24, scale: 1.25, duration: 260, ease: 'Cubic.easeOut' },
        {
          y: target.y,
          scale: 1,
          duration: 90,
          ease: 'Quad.easeIn',
          onComplete: () => {
            audio.play('stamp');
            onStamp(this.verdict);
          },
        },
        { y: target.y - 6, duration: 120, delay: 80, ease: 'Sine.easeOut' },
      ],
    });
  }
}

/** The ink impression left on the paper. Text + icon + box, never colour alone. */
export class StampMark extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, verdict: Verdict, ink: PaletteKey) {
    super(scene, STAMP.impression.x, STAMP.impression.y);
    const w = verdict === 'rug' ? 96 : 120;
    const h = 34;
    const box = rect(scene, 0, 0, w, h).setStrokeStyle(3, HEX[ink]).setOrigin(0.5);
    const inner = rect(scene, 0, 0, w - 8, h - 8)
      .setStrokeStyle(1, HEX[ink])
      .setOrigin(0.5);
    const icon = scene.make
      .image(
        { x: -w / 2 + 14, y: 0, key: verdict === 'rug' ? TEX.iconCross : TEX.iconCheck },
        false,
      )
      .setOrigin(0.5)
      .setScale(1.6)
      .setTint(HEX[ink]);
    const text = makeText(scene, 8, 0, verdict === 'rug' ? 'RUG' : 'LEGIT', {
      size: FONT.size.heading,
      color: ink,
    }).setOrigin(0.5);
    this.add([box, inner, icon, text]);
    this.setAngle(Phaser.Math.Between(-9, 9));
    this.setAlpha(0.88);
    this.setDepth(DEPTH.pins);
    // Ink texture: a few missing speckles.
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(HEX.paper, 0.35);
    for (let i = 0; i < 24; i++)
      g.fillRect(Phaser.Math.Between(-w / 2, w / 2), Phaser.Math.Between(-h / 2, h / 2), 2, 1);
    this.add(g);
    scene.add.existing(this);
  }

  static within(x: number, y: number): boolean {
    return x >= PAPER.x && x <= PAPER.x + PAPER.w && y >= PAPER.y && y <= PAPER.y + PAPER.h;
  }
}
