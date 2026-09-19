/**
 * Overlays (dialogue box, browser, notes) own the Esc key while they're up.
 * Key handlers registered earlier would otherwise fire first and close the
 * scene behind the overlay on the same press, so scene-level Esc handlers and
 * Back hotkeys ask here before acting.
 */
let consumedAt = 0;
/** What an overlay claim is held by: a game object, whose scene may be paused. */
interface Owner {
  active: boolean;
  scene?: { scene: { isActive(): boolean } };
}

/**
 * The overlays that are up. Each is the game object that owns the claim, so one that gets
 * destroyed without releasing (a scene torn down mid-tween, say) stops counting on its own
 * instead of eating every Esc from then on. A claim in a paused scene (a lesson box under
 * the notebook overlay) doesn't count either: the scene on top owns Esc while it's up.
 */
const overlays = new Set<Owner>();

export function markEscConsumed(): void {
  consumedAt = performance.now();
}

export function escConsumedRecently(windowMs = 80): boolean {
  return performance.now() - consumedAt < windowMs;
}

/** Call when an Esc-closable overlay opens; pair with popOverlay(owner). */
export function pushOverlay(owner: Owner): void {
  overlays.add(owner);
}

export function popOverlay(owner: Owner): void {
  overlays.delete(owner);
}

function liveOverlays(): number {
  let n = 0;
  for (const o of overlays) {
    if (!o.active) overlays.delete(o);
    else if (!o.scene || o.scene.scene.isActive()) n++;
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

/** Dev peek: who holds a claim right now (class name, scene key, whether it's alive). */
export function overlayOwners(): { type: string; scene: string; active: boolean }[] {
  return [...overlays].map((o) => {
    const go = o as { constructor: { name: string }; scene?: { scene?: { key: string } } };
    return { type: go.constructor.name, scene: go.scene?.scene?.key ?? '-', active: o.active };
  });
}
