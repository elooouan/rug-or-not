import { describe, expect, it } from 'vitest';
import { SaveStore, defaultSave, sanitizeSave } from '@/systems/save';
import { sanitizeSettings } from '@/systems/settings';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

describe('sanitizeSave', () => {
  it('returns defaults for garbage', () => {
    expect(sanitizeSave(null)).toEqual(defaultSave());
    expect(sanitizeSave('x')).toEqual(defaultSave());
    expect(sanitizeSave({ totalScore: 'lots' })).toEqual(defaultSave());
  });
  it('keeps valid fields and drops malformed case results', () => {
    const s = sanitizeSave({
      totalScore: 120,
      caseResults: {
        a: { bestScore: 100, bestGrade: 'A' },
        b: { bestScore: 'no' },
        c: { bestScore: 1, bestGrade: 'Z' },
      },
      unlockedFlags: ['mint-unlimited', 5],
      settings: { volume: 9, relaxed: true },
    });
    expect(s.totalScore).toBe(120);
    expect(Object.keys(s.caseResults)).toEqual(['a']);
    expect(s.caseResults.a.completions).toBe(1);
    expect(s.unlockedFlags).toEqual(['mint-unlimited']);
    expect(s.settings.volume).toBe(1);
    expect(s.settings.relaxed).toBe(true);
  });
  it('clamps campaign progress', () => {
    expect(sanitizeSave({ campaignUnlocked: 0 }).campaignUnlocked).toBe(1);
    expect(sanitizeSave({ campaignUnlocked: 4.7 }).campaignUnlocked).toBe(4);
    expect(sanitizeSave({ campaignUnlocked: 'x' }).campaignUnlocked).toBe(1);
  });
});

describe('sanitizeSettings', () => {
  it('clamps and defaults', () => {
    expect(sanitizeSettings(undefined).volume).toBe(0.6);
    expect(sanitizeSettings({ volume: -1 }).volume).toBe(0);
    expect(sanitizeSettings({ reducedMotion: 'yes' }).reducedMotion).toBe(false);
  });
});

describe('SaveStore', () => {
  it('round-trips through storage', () => {
    const storage = new MemoryStorage();
    const a = new SaveStore(storage);
    a.update((d) => {
      d.totalScore = 42;
      d.unlockedFlags.push('honeypot');
    });
    const b = new SaveStore(storage);
    expect(b.get().totalScore).toBe(42);
    expect(b.get().unlockedFlags).toEqual(['honeypot']);
    b.reset();
    expect(new SaveStore(storage).get().totalScore).toBe(0);
  });
  it('works without any storage', () => {
    const s = new SaveStore(null);
    s.update((d) => (d.totalScore = 5));
    expect(s.get().totalScore).toBe(5);
  });
  it('survives corrupt JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem('rug-or-not:save:v1', '{not json');
    expect(new SaveStore(storage).get()).toEqual(defaultSave());
  });
});
