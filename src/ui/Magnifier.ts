import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH, LENS, RENDER_SCALE } from '@/config/layout';
import { CursorScene } from '@/scenes/CursorScene';
import { saveStore } from '@/systems/save';
import { lensLift } from './lensLift';

/**
 * The signature mechanic: a second camera zoomed 2x, masked to a circle that
 * follows the pointer. Fine-print objects are hidden from the main camera and
 * only this camera renders them.
 */
export class Magnifier {
  readonly cam: Phaser.Cameras.Scene2D.Camera;
  private maskGfx: Phaser.GameObjects.Graphics;
  private cursorScene: CursorScene;
  private active = false;
  private glow = false;
  /** False in the "no magnifier" accessibility mode. */
  readonly enabled: boolean;

  constructor(
    private scene: Phaser.Scene,
    private hitTest: (x: number, y: number) => boolean,
  ) {
    this.enabled = !saveStore.get().settings.noMagnifier;
    this.cursorScene = scene.scene.get(CursorScene.KEY) as CursorScene;
    this.cam = scene.cameras.add(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, false, 'lens');
    this.cam.setZoom(LENS.zoom * RENDER_SCALE);
    this.cam.setRoundPixels(true);
    // The lens is display-only. If it took part in hit-testing, its scroll (updated
    // after input runs) would be a frame stale and clicks would land off-target.
    this.cam.inputEnabled = false;
    this.maskGfx = scene.make.graphics({ x: 0, y: 0 }, false);
    this.maskGfx.fillStyle(0xffffff, 1);
    // The mask is in screen space (default camera), hence the render scale.
    this.maskGfx.fillCircle(0, 0, LENS.radius * RENDER_SCALE);
    this.cam.setMask(new Phaser.Display.Masks.GeometryMask(scene, this.maskGfx), true);
    this.cam.setVisible(false);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** Objects (HUD, screen-space overlays) the lens must not draw. */
  ignore(objs: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]): void {
    this.cam.ignore(objs);
  }

  /** Register a fine-print object: invisible to the main camera, visible in the lens. */
  registerFinePrint(obj: Phaser.GameObjects.GameObject): void {
    if (!this.enabled) return;
    this.scene.cameras.main.ignore(obj);
  }

  setGlow(on: boolean): void {
    if (this.glow === on) return;
    this.glow = on;
    this.cursorScene.setGlow(on);
  }

  /** Temporarily hide the lens (e.g. during the stamp animation / pause). */
  suspend(): void {
    this.setActive(false);
    this.cursorScene.setMode('pointer');
  }

  update(): void {
    if (!this.enabled) return;
    const p = this.scene.input.activePointer;
    // Fingers only get a lens while they're down; mice get one whenever they hover.
    const over =
      this.scene.input.manager.isOver &&
      (!p.wasTouch || p.isDown) &&
      this.hitTest(p.worldX, p.worldY);
    this.setActive(over);
    if (!over) return;
    // Mask lives in screen space; the camera centre is worked out so the world
    // point under the pointer lands exactly at the lens centre (which floats
    // above a finger, see lensLift).
    const sy = p.y - lensLift(p) * RENDER_SCALE;
    this.maskGfx.setPosition(Math.round(p.x), Math.round(sy));
    const zoom = LENS.zoom * RENDER_SCALE;
    this.cam.centerOn(
      p.worldX - (p.x - CANVAS_WIDTH / 2) / zoom,
      p.worldY - (sy - CANVAS_HEIGHT / 2) / zoom,
    );
  }

  private setActive(on: boolean): void {
    if (this.active === on) return;
    this.active = on;
    this.cam.setVisible(on);
    this.cursorScene.setMode(on ? 'lens' : 'pointer');
  }

  destroy(): void {
    this.cursorScene.setMode('pointer');
    this.cursorScene.setGlow(false);
    this.maskGfx.destroy();
    if (this.scene.cameras.cameras.includes(this.cam)) this.scene.cameras.remove(this.cam);
  }
}
