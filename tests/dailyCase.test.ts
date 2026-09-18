import { describe, expect, it } from 'vitest';
import {
  currentStreak,
  localDateKey,
  pickDailyCaseId,
  playedStrip,
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
    expect(s).toEqual({
      lastPlayed: '2026-03-01',
      streak: 1,
      bestStreak: 1,
      played: ['2026-03-01'],
    });
    s = recordDailyPlay(s, '2026-03-02');
    expect(s.streak).toBe(2);
    // Same day again doesn't double count.
    s = recordDailyPlay(s, '2026-03-02');
    expect(s.streak).toBe(2);
    // Skipping a day resets but keeps the best.
    s = recordDailyPlay(s, '2026-03-05');
    expect(s).toMatchObject({ lastPlayed: '2026-03-05', streak: 1, bestStreak: 2 });
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
  it('keeps a played-dates history and renders a strip', () => {
    let s: DailyState = { lastPlayed: null, streak: 0, bestStreak: 0 };
    s = recordDailyPlay(s, '2026-03-01');
    s = recordDailyPlay(s, '2026-03-02');
    s = recordDailyPlay(s, '2026-03-04');
    expect(s.played).toEqual(['2026-03-01', '2026-03-02', '2026-03-04']);
    expect(playedStrip(s, '2026-03-04', 5)).toEqual([false, true, true, false, true]);
  });

  it('formats local date keys', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('weekKey', () => {
  it('is stable within a week and changes across weeks', async () => {
    const { weekKey } = await import('@/systems/dailyCase');
    expect(weekKey(new Date(2026, 8, 14))).toBe(weekKey(new Date(2026, 8, 20))); // Mon..Sun
    expect(weekKey(new Date(2026, 8, 20))).not.toBe(weekKey(new Date(2026, 8, 21)));
    expect(weekKey(new Date(2026, 8, 18))).toMatch(/^2026-w\d\d$/);
  });
});

describe('generated dailies', () => {
  it('alternate day by day and are the same file for the same date', async () => {
    const { dailyIsGenerated, dailyCaseFor } = await import('@/systems/dailyCase');
    expect(dailyIsGenerated('2026-09-18')).not.toBe(dailyIsGenerated('2026-09-19'));
    expect(dailyIsGenerated('2026-09-18')).toBe(dailyIsGenerated('2026-09-20'));
    const genDay = dailyIsGenerated('2026-09-18') ? '2026-09-18' : '2026-09-19';
    const craftDay = genDay === '2026-09-18' ? '2026-09-19' : '2026-09-18';
    const pool = [
      { id: 'a', ticker: '$A' },
      { id: 'b', ticker: '$B' },
    ] as never[];
    const g1 = dailyCaseFor(genDay, pool, ['a', 'b']);
    const g2 = dailyCaseFor(genDay, pool, ['a', 'b']);
    expect(g1?.id.startsWith('cold-day-')).toBe(true);
    expect(JSON.stringify(g1)).toBe(JSON.stringify(g2));
    const c = dailyCaseFor(craftDay, pool, ['a', 'b']);
    expect(['a', 'b']).toContain(c?.id);
  });
});
