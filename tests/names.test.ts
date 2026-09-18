import { describe, expect, it } from 'vitest';
import { isNameAllowed } from '@/systems/names';

describe('board handles', () => {
  it('lets ordinary handles through and stops the obvious ones', () => {
    for (const ok of ['ANON', 'LUCIEN', 'RUGHNT', 'B1SCUT', 'MARA', 'KELP_9'])
      expect(isNameAllowed(ok)).toBe(true);
    for (const bad of ['FUCKER', 'SH1T', 'N4ZI', 'xxCUNTxx'])
      expect(isNameAllowed(bad)).toBe(false);
  });
});
