import Phaser from 'phaser';

/** A Rectangle not yet added to the display list (for containers). Origin top-left. */
export function rect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fillColor?: number,
  fillAlpha = 1,
): Phaser.GameObjects.Rectangle {
  const r = new Phaser.GameObjects.Rectangle(
    scene,
    x,
    y,
    width,
    height,
    fillColor,
    fillColor === undefined ? 0 : fillAlpha,
  );
  r.setOrigin(0);
  return r;
}

/** A Zone not yet added to the display list. Origin top-left. */
export function zone(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Zone {
  const z = new Phaser.GameObjects.Zone(scene, x, y, width, height);
  z.setOrigin(0);
  return z;
}
