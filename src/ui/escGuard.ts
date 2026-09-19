/**
 * Overlays (dialogue box, browser, notes) own the Esc key while they're up.
 * Key handlers registered earlier would otherwise fire first and close the
 * scene behind the overlay on the same press, so scene-level Esc handlers and
 * Back hotkeys ask here before acting.
 */
let consumedAt = 0;
/**
 * The overlays that are up. Each is the game object that owns the claim, so one that gets
 * destroyed without releasing (a scene torn down mid-tween, say) stops counting on its own
 * instead of eating every Esc from then on.
 */
const overlays = new Set<{ active: boolean }>();

export function markEscConsumed(): void {
  consumedAt = performance.now();
}

export function escConsumedRecently(windowMs = 80): boolean {
  return performance.now() - consumedAt < windowMs;
}

/** Call when an Esc-closable overlay opens; pair with popOverlay(owner). */
export function pushOverlay(owner: { active: boolean }): void {
  overlays.add(owner);
}

export function popOverlay(owner: { active: boolean }): void {
  overlays.delete(owner);
}

function liveOverlays(): number {
  let n = 0;
  for (const o of overlays) {
    if (o.active) n++;
    else overlays.delete(o);
  }
  return n;
}

let modals = 0;

/** A small dialog on top of an overlay (the name picker): the overlay's own Esc waits. */
export function pushModal(): void {
  modals++;
}

export function popModal(): void {
  modals = Math.max(0, modals - 1);
}

export function modalOpen(): boolean {
  return modals > 0;
}

/** True while any overlay is up, or right after one consumed Esc. */
export function escTaken(): boolean {
  return liveOverlays() > 0 || escConsumedRecently();
}

/** Dev peek for debugging overlay bookkeeping. */
export function overlayDepth(): number {
  return liveOverlays();
}
