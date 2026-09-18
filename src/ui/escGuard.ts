/**
 * Overlays (dialogue box, browser, notes) own the Esc key while they're up.
 * Key handlers registered earlier would otherwise fire first and close the
 * scene behind the overlay on the same press, so scene-level Esc handlers and
 * Back hotkeys ask here before acting.
 */
let consumedAt = 0;
let overlays = 0;

export function markEscConsumed(): void {
  consumedAt = performance.now();
}

export function escConsumedRecently(windowMs = 80): boolean {
  return performance.now() - consumedAt < windowMs;
}

/** Call when an Esc-closable overlay opens; pair with popOverlay(). */
export function pushOverlay(): void {
  overlays++;
}

export function popOverlay(): void {
  overlays = Math.max(0, overlays - 1);
}

/** True while any overlay is up, or right after one consumed Esc. */
export function escTaken(): boolean {
  return overlays > 0 || escConsumedRecently();
}

/** Dev peek for debugging overlay bookkeeping. */
export function overlayDepth(): number {
  return overlays;
}
