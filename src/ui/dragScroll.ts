import type Phaser from 'phaser';

export interface ScrollOpts {
  /** World px per wheel notch. */
  step: number;
  /** Positive = content moves up (reading further down). */
  onScroll(delta: number): void;
  /** Skip input while a modal is up, etc. */
  enabled?: () => boolean;
}

/**
 * Wheel + drag scrolling for a vertical list. Fingers drag, mice wheel (a mouse
 * can drag too). Returns a function that removes the listeners.
 */
export function attachScroll(scene: Phaser.Scene, opts: ScrollOpts): () => void {
  const ok = () => opts.enabled?.() !== false;
  const wheel = (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
    if (ok()) opts.onScroll(dy > 0 ? opts.step : -opts.step);
  };
  let dragY: number | null = null;
  const down = (p: Phaser.Input.Pointer) => {
    dragY = p.worldY;
  };
  const move = (p: Phaser.Input.Pointer) => {
    if (dragY === null || !p.isDown || !ok()) return;
    const d = dragY - p.worldY;
    if (d !== 0) opts.onScroll(d);
    dragY = p.worldY;
  };
  const up = () => {
    dragY = null;
  };
  scene.input.on('wheel', wheel);
  scene.input.on('pointerdown', down);
  scene.input.on('pointermove', move);
  scene.input.on('pointerup', up);
  return () => {
    scene.input.off('wheel', wheel);
    scene.input.off('pointerdown', down);
    scene.input.off('pointermove', move);
    scene.input.off('pointerup', up);
  };
}
