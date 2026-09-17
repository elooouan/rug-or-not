import { describe, expect, it } from 'vitest';
import { UNLOCKABLES } from '@/data/unlockables';
import { rankForScore, nextRankInfo } from '@/systems/ranks';
import { defaultSave } from '@/systems/save';
import { contextFromSave, isUnlocked, newlyUnlocked, unlockedIds } from '@/systems/unlocks';

describe('ranks', () => {
  it('maps total score to ranks', () => {
    expect(rankForScore(0)).toBe('Rookie');
    expect(rankForScore(499)).toBe('Rookie');
    expect(rankForScore(500)).toBe('Gumshoe');
    expect(rankForScore(1500)).toBe('Inspector');
    expect(rankForScore(9999)).toBe('Chief Inspector');
    expect(nextRankInfo(0)).toEqual({ rank: 'Gumshoe', remaining: 500 });
    expect(nextRankInfo(9999)).toBeNull();
  });
});

describe('unlocks', () => {
  it('defaults are always unlocked and nothing else on a fresh save', () => {
    const ids = unlockedIds(defaultSave());
    expect(ids).toEqual(UNLOCKABLES.filter((u) => u.source.type === 'always').map((u) => u.id));
  });
  it('resolves each source type', () => {
    const save = defaultSave();
    save.totalScore = 1500;
    save.caseResults = {
      a: { bestScore: 1, bestGrade: 'S', completions: 1, lastVerdictCorrect: true },
    };
    save.daily.bestStreak = 3;
    save.unlockedFlags = Array.from({ length: 8 }, (_, i) => `f${i}`);
    const ctx = contextFromSave(save);
    expect(ctx.casesCompleted).toBe(1);
    expect(ctx.gradeCounts.S).toBe(1);
    const by = (id: string) => UNLOCKABLES.find((u) => u.id === id)!;
    expect(isUnlocked(by('lamp-blue'), ctx)).toBe(true); // rank Gumshoe
    expect(isUnlocked(by('wood-maple'), ctx)).toBe(true); // rank Inspector
    expect(isUnlocked(by('wood-ebony'), ctx)).toBe(false); // needs 3 cases
    expect(isUnlocked(by('lamp-red'), ctx)).toBe(false); // needs 5 S grades
    expect(isUnlocked(by('rim-ink'), ctx)).toBe(true); // streak 3
    expect(isUnlocked(by('rim-silver'), ctx)).toBe(true); // 8 flags
    expect(isUnlocked(by('ink-noir'), ctx)).toBe(false); // Chief Inspector
  });
  it('reports new unlocks once', () => {
    const save = defaultSave();
    save.totalScore = 600;
    expect(newlyUnlocked(save).map((u) => u.id)).toEqual(['lamp-blue']);
    save.seenUnlocks.push('lamp-blue');
    expect(newlyUnlocked(save)).toEqual([]);
  });
  it('has unique ids and a default per category', () => {
    const ids = UNLOCKABLES.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const cat of ['desk', 'lamp', 'rim', 'ink']) {
      expect(UNLOCKABLES.some((u) => u.category === cat && u.source.type === 'always')).toBe(true);
    }
  });
});
