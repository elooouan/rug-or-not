import { describe, expect, it } from 'vitest';
import { defaultSave } from '@/systems/save';
import { dailyPool, playableCases, secretUnlocked } from '@/systems/secretCase';
import type { CaseData } from '@/data/schema';

const mk = (id: string, secret = false): CaseData =>
  ({ id, secret, verdict: 'rug', documents: [] }) as unknown as CaseData;
const cases = [mk('a'), mk('b'), mk('z', true)];

describe('secret case', () => {
  it('stays locked until every regular case is solved', () => {
    const save = defaultSave();
    expect(secretUnlocked(save, cases)).toBe(false);
    save.caseResults.a = {
      bestScore: 1,
      bestGrade: 'C',
      completions: 1,
      lastVerdictCorrect: true,
      solved: true,
    };
    save.caseResults.b = {
      bestScore: 1,
      bestGrade: 'C',
      completions: 2,
      lastVerdictCorrect: false,
      solved: false,
    };
    expect(secretUnlocked(save, cases)).toBe(false);
    save.caseResults.b.solved = true;
    expect(secretUnlocked(save, cases)).toBe(true);
  });

  it('hides the secret file from the playable list and the daily pool', () => {
    const save = defaultSave();
    expect(playableCases(save, cases).map((c) => c.id)).toEqual(['a', 'b']);
    expect(dailyPool(cases)).toEqual(['a', 'b']);
  });
});
