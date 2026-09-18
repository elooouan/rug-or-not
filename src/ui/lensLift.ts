import { LENS } from '@/config/layout';

/** How far (world px) the lens sits above the pointer: zero for a mouse, LENS.touchLift for a finger. */
export function lensLift(p: { wasTouch: boolean }): number {
  return p.wasTouch ? LENS.touchLift : 0;
}
