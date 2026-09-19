import { describe, expect, it } from 'vitest';
import { generateCase } from '@/systems/caseGen';
import { isFlagClue, validateCase } from '@/data/schema';

describe('cold case generator', () => {
  it('is deterministic for a seed', () => {
    expect(JSON.stringify(generateCase('abc'))).toBe(JSON.stringify(generateCase('abc')));
    expect(generateCase('abc').ticker).not.toBe(generateCase('xyz').ticker);
  });

  it('prints a valid file for every daily and weekly seed of the coming year', async () => {
    const { dailySeed, dailyIsGenerated, localDateKey, weekKey } =
      await import('@/systems/dailyCase');
    const bad: string[] = [];
    const start = new Date('2026-09-19T12:00:00Z');
    for (let i = 0; i < 366; i++) {
      const date = new Date(start.getTime() + i * 86400000);
      const key = localDateKey(date);
      const seeds = dailyIsGenerated(key) ? [dailySeed(key)] : [];
      if (date.getDay() === 1) seeds.push(`week-${weekKey(date)}`, `holders-${weekKey(date)}`);
      for (const seed of seeds) {
        const res = validateCase(generateCase(seed));
        if (!res.ok) bad.push(`${seed}: ${res.errors.join(' | ')}`);
      }
    }
    expect(bad).toEqual([]);
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

  it('forces requested flags into the file (drills)', () => {
    const pool = [
      'mint-unlimited',
      'sell-tax-adjustable',
      'honeypot',
      'blacklist',
      'fake-renounce',
      'unverified-contract',
      'team-allocation-unvested',
      'copied-whitepaper',
      'anon-team-stock-photos',
      'bot-chat',
      'urgency-pressure',
      'guaranteed-returns',
      'liquidity-unlocked',
      'whale-concentration',
      'fake-audit',
      'proxy-admin',
      'wash-trading',
    ];
    for (const flag of pool)
      for (let i = 0; i < 20; i++) {
        const c = generateCase(`drill-${flag}-${i}`, { forceFlags: [flag] });
        const res = validateCase(c);
        if (!res.ok) throw new Error(res.errors.join('\n'));
        const ids = c.documents
          .flatMap((d) => d.clues)
          .filter(isFlagClue)
          .map((cl) => cl.flagId);
        expect(ids, `${flag} #${i}`).toContain(flag);
      }
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

describe('forced herrings (hunts)', () => {
  it('plants the requested herring and keeps the file consistent', async () => {
    const { HERRINGS } = await import('@/data/flags');
    for (const id of Object.keys(HERRINGS)) {
      let found = 0;
      for (let i = 0; i < 6; i++) {
        const c = generateCase(`hunt-${id}-${i}`, { forceHerrings: [id] });
        const res = validateCase(c);
        expect(res.ok ? [] : res.errors).toEqual([]);
        const clues = c.documents.flatMap((d) => d.clues);
        if (c.verdict === 'legit') expect(clues.some(isFlagClue)).toBe(false);
        if (c.documents.some((d) => d.clues.some((cl) => !('flagId' in cl) && cl.herringId === id)))
          found++;
      }
      expect(found, id).toBeGreaterThan(0);
    }
  });
});
