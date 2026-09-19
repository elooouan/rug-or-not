import { LENS } from '@/config/layout';

/** How far (world px) the lens sits above the pointer: zero for a mouse, LENS.touchLift for a finger. */
export function lensLift(p: { wasTouch: boolean }): number {
  return p.wasTouch ? LENS.touchLift : 0;
}

/** Is the main pointer a finger? (Hover, wheel and typing hints don't apply then.) */
export function touchScreen(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}
