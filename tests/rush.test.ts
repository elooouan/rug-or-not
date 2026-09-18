import { describe, expect, it } from 'vitest';
import { RUSH } from '@/config/gameConfig';
import {
  applyFlag,
  applyHerring,
  applyStray,
  freshRush,
  rushGrade,
  rushMultiplier,
  rushPages,
  shuffle,
} from '@/systems/rush';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateCase, type CaseData } from '@/data/schema';

const dir = join(__dirname, '..', 'src', 'data', 'cases');
const cases: CaseData[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    const res = validateCase(JSON.parse(readFileSync(join(dir, f), 'utf8')));
    if (!res.ok) throw new Error(res.errors.join('\n'));
    return res.case;
  });

describe('rush scoring', () => {
  it('multiplier grows with the streak and caps', () => {
    expect(rushMultiplier(0)).toBe(1);
    expect(rushMultiplier(2)).toBe(1 + 2 * RUSH.streakStep);
    expect(rushMultiplier(100)).toBe(RUSH.maxMultiplier);
  });

  it('a hit scores with the multiplier before the streak grows', () => {
    let s = freshRush();
    const a = applyFlag(s);
    expect(a.gained).toBe(RUSH.flagPoints);
    expect(a.streak).toBe(1);
    expect(a.timeDelta).toBe(RUSH.flagTimeBonus);
    s = applyFlag(a);
    expect(s.score).toBe(RUSH.flagPoints + Math.round(RUSH.flagPoints * rushMultiplier(1)));
    expect(s.rounds).toBe(2);
    expect(s.bestStreak).toBe(2);
  });

  it('herrings and blank paper reset the streak and cost time but keep the score', () => {
    const s = applyFlag(applyFlag(freshRush()));
    const h = applyHerring(s);
    expect(h.streak).toBe(0);
    expect(h.score).toBe(s.score);
    expect(h.timeDelta).toBe(-RUSH.herringPenaltySec);
    expect(h.bestStreak).toBe(2);
    expect(applyStray(s).timeDelta).toBe(-RUSH.strayPenaltySec);
  });

  it('grades by threshold', () => {
    expect(rushGrade(0)).toBe('D');
    expect(rushGrade(RUSH.grades[0].min)).toBe('S');
    expect(rushGrade(RUSH.grades[1].min)).toBe('A');
  });

  it('only pages with a red flag are dealt', () => {
    const pages = rushPages(cases);
    expect(pages.length).toBeGreaterThan(10);
    for (const p of pages) expect(p.doc.clues.some((c) => 'flagId' in c)).toBe(true);
  });

  it('shuffle keeps every element', () => {
    let i = 0;
    const seq = [0.1, 0.9, 0.5, 0.3, 0.7];
    const out = shuffle([1, 2, 3, 4, 5], () => seq[i++ % seq.length]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
