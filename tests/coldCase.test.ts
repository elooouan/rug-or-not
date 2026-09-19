import { afterEach, describe, expect, it } from 'vitest';
import { coldDifficulty, coldDifficultyFor, gameState, solvedRegular } from '@/systems/gameState';
import { saveStore } from '@/systems/save';
import type { CaseData } from '@/data/schema';

const mk = (id: string): CaseData =>
  ({ id, secret: false, verdict: 'rug', documents: [] }) as unknown as CaseData;

describe('the printer setting', () => {
  afterEach(() => {
    saveStore.reset();
    gameState.cases = [];
  });

  it('grows with solved files by default and never leaves 1..5', () => {
    for (let solved = 0; solved < 30; solved++) {
      for (let i = 0; i < 20; i++) {
        const d = coldDifficultyFor(solved);
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(5);
        expect(d).toBeGreaterThanOrEqual(Math.min(5, 1 + Math.floor(solved / 3)));
      }
    }
  });

  it('is pinned by the setting when one is set', () => {
    gameState.cases = [mk('a'), mk('b')];
    saveStore.update((d) => {
      d.caseResults.a = {
        bestScore: 1,
        bestGrade: 'C',
        completions: 1,
        lastVerdictCorrect: true,
        solved: true,
      };
    });
    expect(solvedRegular()).toBe(1);
    expect(coldDifficulty()).toBeGreaterThanOrEqual(1);
    saveStore.update((d) => (d.settings.coldDifficulty = 5));
    expect(coldDifficulty()).toBe(5);
    saveStore.update((d) => (d.settings.coldDifficulty = 0));
    expect(coldDifficulty()).toBeLessThanOrEqual(2);
  });
});
