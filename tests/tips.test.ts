import { describe, expect, it } from 'vitest';
import { FLAG_IDS } from '@/data/flags';
import { TIPS } from '@/data/tips';

describe('corkboard tips', () => {
  it('name real red flags and cover most of the library', () => {
    for (const t of TIPS) {
      expect(t.text.length).toBeGreaterThan(20);
      expect(t.text.length).toBeLessThan(140);
      if (t.flag) expect(FLAG_IDS).toContain(t.flag);
    }
    const covered = new Set(TIPS.map((t) => t.flag).filter(Boolean));
    expect(covered.size).toBeGreaterThanOrEqual(FLAG_IDS.length - 1);
  });
});
