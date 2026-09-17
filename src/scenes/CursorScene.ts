import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { GAME_HEIGHT, GAME_WIDTH, LENS, RENDER_SCALE } from '@/config/layout';
import { saveStore } from '@/systems/save';

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
      .setOrigin(LENS.cursorHotspot.x / 20, LENS.cursorHotspot.y / 20);
    this.input.setDefaultCursor('none');
    this.input.on(Phaser.Input.Events.GAME_OUT, () => (this.inside = false));
    this.input.on(Phaser.Input.Events.GAME_OVER, () => (this.inside = true));
    this.scene.bringToTop();
  }

  setMode(mode: CursorMode): void {
    this.mode = mode;
  }

  setGlow(glow: boolean): void {
    if (this.glow === glow) return;
    this.glow = glow;
    this.rim.setTexture(glow ? TEX.lensRimGlow : TEX.lensRim);
  }

  override update(_time: number, delta: number): void {
    const p = this.input.activePointer;
    const x = Math.round(p.worldX);
    const y = Math.round(p.worldY);
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
    this.cursor.setVisible(this.inside && this.mode !== 'hidden' && !showLens).setPosition(x, y);
  }
}
