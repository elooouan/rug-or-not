import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { CURSOR_SIZE } from '@/art/magnifier';
import { GAME_HEIGHT, GAME_WIDTH, LENS, RENDER_SCALE } from '@/config/layout';
import { saveStore } from '@/systems/save';
import { lensLift } from '@/ui/lensLift';

export type CursorMode = 'pointer' | 'lens' | 'hidden';

/**
 * Always-on-top overlay scene that draws the magnifier cursor, the big lens rim,
 * glint and inner vignette above every other scene's cameras.
 */
export class CursorScene extends Phaser.Scene {
  static readonly KEY = 'CursorScene';
  private cursor!: Phaser.GameObjects.Image;
  private rim!: Phaser.GameObjects.Image;
  private glint!: Phaser.GameObjects.Image;
  private innerVignette!: Phaser.GameObjects.Image;
  private mode: CursorMode = 'pointer';
  private glow = false;
  private inside = true;
  private lensScale = 0;
  private inkTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super(CursorScene.KEY);
  }

  create(): void {
    this.cameras.main.setZoom(RENDER_SCALE).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    const size = LENS.radius * 2 + 40;
    const c = (LENS.radius + 4) / size;
    this.rim = this.add.image(0, 0, TEX.lensRim).setOrigin(c, c).setVisible(false);
    this.innerVignette = this.add.image(0, 0, TEX.lensVignette).setOrigin(0.5).setVisible(false);
    this.glint = this.add.image(0, 0, TEX.lensGlint).setOrigin(0.5).setVisible(false);
    this.cursor = this.add
      .image(0, 0, TEX.cursor)
      .setOrigin(LENS.cursorHotspot.x / CURSOR_SIZE, LENS.cursorHotspot.y / CURSOR_SIZE);
    this.input.setDefaultCursor('none');
    this.input.on(Phaser.Input.Events.GAME_OUT, () => (this.inside = false));
    this.input.on(Phaser.Input.Events.GAME_OVER, () => (this.inside = true));
    // A move over the canvas means the pointer is inside, whether or not the browser
    // sent a mouseover (it doesn't after a fullscreen toggle or a resize under the pointer).
    this.input.on(Phaser.Input.Events.POINTER_MOVE, () => (this.inside = true));
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => (this.inside = true));
    this.scene.bringToTop();
  }

  setMode(mode: CursorMode): void {
    this.mode = mode;
  }

  /** Tint the pointer for a while (ink pad easter egg). */
  setInked(ms: number): void {
    this.cursor.setTint(0x9a3b3b);
    this.inkTimer?.remove(false);
    this.inkTimer = this.time.delayedCall(ms, () => this.cursor.clearTint());
  }

  setGlow(glow: boolean): void {
    if (this.glow === glow) return;
    this.glow = glow;
    this.rim.setTexture(glow ? TEX.lensRimGlow : TEX.lensRim);
  }

  override update(_time: number, delta: number): void {
    const p = this.input.activePointer;
    const x = Math.round(p.worldX);
    // The lens rim floats above a finger, in step with the magnifier camera.
    const y = Math.round(p.worldY - lensLift(p));
    const reduced = saveStore.get().settings.reducedMotion;
    const wantLens = this.mode === 'lens' && this.inside;
    // Ease the rim in/out so the lens "grows" over a document.
    const target = wantLens ? 1 : 0;
    const step = reduced ? 1 : Math.min(1, delta / 110);
    this.lensScale += (target - this.lensScale) * step;
    if (Math.abs(target - this.lensScale) < 0.02) this.lensScale = target;

    const showLens = this.lensScale > 0.05;
    this.rim
      .setVisible(showLens)
      .setPosition(x, y)
      .setScale(0.35 + 0.65 * this.lensScale);
    this.innerVignette.setVisible(showLens && this.lensScale > 0.9).setPosition(x, y);
    this.glint
      .setVisible(showLens && this.lensScale > 0.9)
      .setPosition(x - LENS.radius * 0.45, y - LENS.radius * 0.5);
    // No arrow under a finger.
    this.cursor
      .setVisible(this.inside && this.mode !== 'hidden' && !showLens && !p.wasTouch)
      .setPosition(x, Math.round(p.worldY));
  }
}
