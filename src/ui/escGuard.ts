/**
 * Overlays (browser, dialogue) close on Esc via Key objects, which fire before
 * a scene's own `keydown-ESC` handler. They mark the key as consumed so the
 * scene doesn't also open its pause menu on the same press.
 */
let consumedAt = 0;

export function markEscConsumed(): void {
  consumedAt = performance.now();
}

export function escConsumedRecently(windowMs = 80): boolean {
  return performance.now() - consumedAt < windowMs;
}
