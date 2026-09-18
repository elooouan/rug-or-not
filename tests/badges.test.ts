import { beforeEach, describe, expect, it } from 'vitest';
import { BADGES } from '@/data/badges';
import {
  awardBadge,
  badgeCount,
  badgeProgress,
  bumpStat,
  checkAggregateBadges,
  hasBadge,
  noteSeen,
} from '@/systems/badges';
import { saveStore } from '@/systems/save';
import { shortAddress } from '@/config/token';

describe('badges', () => {
  beforeEach(() => saveStore.reset());

  it('awards once and counts', () => {
    expect(awardBadge(null, 'first-case')).toBe(true);
    expect(awardBadge(null, 'first-case')).toBe(false);
    expect(hasBadge('first-case')).toBe(true);
    expect(awardBadge(null, 'not-a-badge')).toBe(false);
    expect(badgeCount()).toEqual({ earned: 1, total: BADGES.length });
  });

  it('bumps counters and records seen values without duplicates', () => {
    expect(bumpStat('sips')).toBe(1);
    expect(bumpStat('sips', 4)).toBe(5);
    expect(noteSeen('weathersSeen', 'rain')).toEqual(['rain']);
    expect(noteSeen('weathersSeen', 'rain')).toEqual(['rain']);
    expect(noteSeen('weathersSeen', 'snow')).toEqual(['rain', 'snow']);
  });

  it('derives aggregate badges from save state', () => {
    saveStore.update((d) => {
      d.caseResults.a = { bestScore: 1, bestGrade: 'S', completions: 1, lastVerdictCorrect: true };
      d.daily.bestStreak = 3;
    });
    checkAggregateBadges(null);
    expect(hasBadge('s-grade')).toBe(true);
    expect(hasBadge('five-s')).toBe(false);
    expect(hasBadge('streak-3')).toBe(true);
    expect(hasBadge('streak-7')).toBe(false);
  });

  it('has unique badge ids', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });
});

describe('shortAddress', () => {
  it('truncates long addresses only', () => {
    expect(shortAddress('abc')).toBe('abc');
    expect(shortAddress('1234567890abcdef')).toBe('1234...cdef');
  });

  it('reports progress towards counter badges', () => {
    const totals = { cases: 15, rugs: 8, pages: 9, flags: 15, weathers: 5 };
    expect(badgeProgress('wired', totals)).toEqual({ n: 0, of: 10 });
    bumpStat('sips', 4);
    expect(badgeProgress('wired', totals)).toEqual({ n: 4, of: 10 });
    saveStore.update((d) => {
      d.stats.drilled = ['a', 'b'];
      d.stats.coldCorrect = 30;
    });
    expect(badgeProgress('drill-sergeant', totals)).toEqual({ n: 2, of: 15 });
    // Never over the target, and null for one-off badges.
    expect(badgeProgress('cold-ten', totals)).toEqual({ n: 10, of: 10 });
    expect(badgeProgress('historian', totals)).toBeNull();
  });
});
