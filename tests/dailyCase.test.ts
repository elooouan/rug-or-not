import { describe, expect, it } from 'vitest';
import {
  currentStreak,
  localDateKey,
  pickDailyCaseId,
  recordDailyPlay,
  type DailyState,
} from '@/systems/dailyCase';
import { hashString, mulberry32 } from '@/systems/rng';

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('hashes strings stably', () => {
    expect(hashString('daily:2026-01-01')).toBe(hashString('daily:2026-01-01'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});

describe('pickDailyCaseId', () => {
  const ids = ['moonpup', 'bean', 'safeyield', 'x', 'y'];
  it('is the same for everyone on the same day regardless of list order', () => {
    const shuffled = [...ids].reverse();
    expect(pickDailyCaseId('2026-09-17', ids)).toBe(pickDailyCaseId('2026-09-17', shuffled));
  });
  it('picks from the list and varies across days', () => {
    const picks = new Set<string>();
    for (let d = 1; d <= 28; d++) {
      const id = pickDailyCaseId(`2026-02-${String(d).padStart(2, '0')}`, ids);
      expect(ids).toContain(id);
      picks.add(id);
    }
    expect(picks.size).toBeGreaterThan(1);
  });
  it('throws with no cases', () => {
    expect(() => pickDailyCaseId('2026-01-01', [])).toThrow();
  });
});

describe('streaks', () => {
  it('starts, continues and resets', () => {
    let s: DailyState = { lastPlayed: null, streak: 0, bestStreak: 0 };
    s = recordDailyPlay(s, '2026-03-01');
    expect(s).toEqual({ lastPlayed: '2026-03-01', streak: 1, bestStreak: 1 });
    s = recordDailyPlay(s, '2026-03-02');
    expect(s.streak).toBe(2);
    // Same day again doesn't double count.
    s = recordDailyPlay(s, '2026-03-02');
    expect(s.streak).toBe(2);
    // Skipping a day resets but keeps the best.
    s = recordDailyPlay(s, '2026-03-05');
    expect(s).toEqual({ lastPlayed: '2026-03-05', streak: 1, bestStreak: 2 });
  });
  it('crosses month boundaries', () => {
    let s = recordDailyPlay({ lastPlayed: null, streak: 0, bestStreak: 0 }, '2026-01-31');
    s = recordDailyPlay(s, '2026-02-01');
    expect(s.streak).toBe(2);
  });
  it('reports the held streak', () => {
    const s = { lastPlayed: '2026-03-02', streak: 3, bestStreak: 3 };
    expect(currentStreak(s, '2026-03-02')).toBe(3);
    expect(currentStreak(s, '2026-03-03')).toBe(3);
    expect(currentStreak(s, '2026-03-04')).toBe(0);
    expect(currentStreak({ lastPlayed: null, streak: 0, bestStreak: 0 }, '2026-03-04')).toBe(0);
  });
  it('formats local date keys', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
