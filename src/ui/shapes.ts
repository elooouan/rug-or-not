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

/** Five little pips showing case difficulty (filled = harder). Not colour-only: filled pips are taller. */
export function difficultyPips(
  scene: Phaser.Scene,
  x: number,
  y: number,
  level: number,
): Phaser.GameObjects.Container {
  const c = new Phaser.GameObjects.Container(scene, x, y);
  for (let i = 0; i < 5; i++) {
    const on = i < level;
    c.add(rect(scene, i * 7, on ? 0 : 2, 5, on ? 5 : 3, on ? 0xe0b566 : 0xb8a88a));
  }
  return c;
}
