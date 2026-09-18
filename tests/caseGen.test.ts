import { describe, expect, it } from 'vitest';
import { generateCase } from '@/systems/caseGen';
import { isFlagClue, validateCase } from '@/data/schema';

describe('cold case generator', () => {
  it('is deterministic for a seed', () => {
    expect(JSON.stringify(generateCase('abc'))).toBe(JSON.stringify(generateCase('abc')));
    expect(generateCase('abc').ticker).not.toBe(generateCase('xyz').ticker);
  });

  it('produces valid cases for hundreds of seeds', () => {
    const bad: string[] = [];
    for (let i = 0; i < 400; i++) {
      const c = generateCase(`seed-${i}`);
      const res = validateCase(c);
      if (!res.ok) bad.push(`${i}: ${res.errors.join(' | ')}`);
      const clues = c.documents.flatMap((d) => d.clues);
      if (c.verdict === 'rug' && !clues.some(isFlagClue)) bad.push(`${i}: rug without flags`);
      if (c.verdict === 'legit' && clues.some(isFlagClue)) bad.push(`${i}: legit with flags`);
      const ids = clues.map((cl) => cl.id);
      if (new Set(ids).size !== ids.length) bad.push(`${i}: duplicate clue ids`);
    }
    expect(bad).toEqual([]);
  });

  it('honours requested verdict and difficulty', () => {
    const legit = generateCase('x', { verdict: 'legit', difficulty: 2 });
    expect(legit.verdict).toBe('legit');
    expect(legit.difficulty).toBe(2);
    const rug = generateCase('y', { verdict: 'rug', difficulty: 5 });
    expect(rug.verdict).toBe('rug');
    expect(rug.documents.flatMap((d) => d.clues).some(isFlagClue)).toBe(true);
  });
});
