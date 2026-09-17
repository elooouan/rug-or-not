import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DESK, FONT } from '@/config/layout';
import { HEX } from '@/config/palette';
import { makeText } from './text';

/** A small desk clock that doubles as the case timer. */
export class DeskClock extends Phaser.GameObjects.Container {
  private hands: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private total = 0;
  private left = 0;
  private running = false;
  private flashTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    super(scene, DESK.clock.x, DESK.clock.y);
    this.add(scene.make.image({ x: 0, y: 0, key: TEX.clock }, false).setOrigin(0));
    this.hands = scene.make.graphics({ x: 15, y: 15 }, false);
    this.add(this.hands);
    this.label = makeText(scene, 15, 36, '', { size: FONT.size.small, color: 'paper' }).setOrigin(
      0.5,
      0,
    );
    this.add(this.label);
    scene.add.existing(this);
    this.setRelaxed();
  }

  setRelaxed(): void {
    this.running = false;
    this.label.setText('no timer');
    this.drawHands(0.75);
  }

  start(totalSec: number): void {
    this.total = totalSec;
    this.left = totalSec;
    this.running = true;
    this.refresh();
  }

  pause(p: boolean): void {
    this.running = !p && this.total > 0;
  }

  get timeLeft(): number {
    return Math.max(0, Math.ceil(this.left));
  }

  get isRunning(): boolean {
    return this.running;
  }

  tick(deltaMs: number): void {
    if (!this.running) return;
    this.left = Math.max(0, this.left - deltaMs / 1000);
    this.refresh();
    if (this.left <= 0) {
      this.running = false;
      this.label.setText("time's up");
      this.flash();
    }
  }

  private refresh(): void {
    const s = this.timeLeft;
    this.label.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
    this.label.setColor(s <= 15 ? '#e0b566' : '#d8c9a8');
    this.drawHands(this.total > 0 ? 1 - this.left / this.total : 0);
  }

  private drawHands(frac: number): void {
    const g = this.hands;
    g.clear();
    const a = -Math.PI / 2 + frac * Math.PI * 2;
    g.lineStyle(1, HEX.shadow, 1);
    g.lineBetween(0, 0, Math.round(Math.cos(a) * 8), Math.round(Math.sin(a) * 8));
    g.lineStyle(1, HEX.stampRed, 1);
    g.lineBetween(0, 0, Math.round(Math.cos(a * 12) * 6), Math.round(Math.sin(a * 12) * 6));
    g.fillStyle(HEX.shadow, 1);
    g.fillRect(-1, -1, 2, 2);
  }

  private flash(): void {
    this.flashTimer?.remove(false);
    let n = 0;
    this.flashTimer = this.scene.time.addEvent({
      delay: 250,
      repeat: 5,
      callback: () => this.label.setVisible(n++ % 2 === 0),
    });
  }
}
