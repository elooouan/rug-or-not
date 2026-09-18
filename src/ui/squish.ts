import type Phaser from 'phaser';

/**
 * A quick squash-and-stretch on a sprite that always returns to its resting
 * scale, however fast it is triggered. Each call stops the previous one, so
 * rapid clicks through a dialogue can't leave the mascot deformed.
 */
export function squish(
  scene: Phaser.Scene,
  obj: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite,
  sx = 1.06,
  sy = 0.94,
  duration = 220,
): void {
  const base = (obj.getData('squishBase') as { x: number; y: number } | undefined) ?? {
    x: obj.scaleX,
    y: obj.scaleY,
  };
  obj.setData('squishBase', base);
  const prev = obj.getData('squishTween') as Phaser.Tweens.Tween | undefined;
  if (prev && prev.isPlaying()) prev.stop();
  obj.setScale(base.x * sx, base.y * sy);
  const tween = scene.tweens.add({
    targets: obj,
    scaleX: base.x,
    scaleY: base.y,
    duration,
    ease: 'Back.easeOut',
    onComplete: () => obj.setScale(base.x, base.y),
  });
  obj.setData('squishTween', tween);
}
