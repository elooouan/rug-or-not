import { describe, expect, it } from 'vitest';
import {
  LocalLeaderboard,
  rankEntries,
  sanitizeEntries,
  type ScoreEntry,
} from '@/systems/leaderboard';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
}

const e = (name: string, score: number, date = '2026-01-01'): ScoreEntry => ({
  name,
  score,
  caseId: 'moonpup',
  grade: 'A',
  date,
});

describe('leaderboard', () => {
  it('ranks by score then recency and limits', () => {
    const ranked = rankEntries(
      [e('a', 10, '2026-01-01'), e('b', 30), e('c', 10, '2026-02-01'), e('d', 20)],
      3,
    );
    expect(ranked.map((x) => x.name)).toEqual(['b', 'd', 'c']);
  });
  it('drops malformed entries and trims names', () => {
    const ok = sanitizeEntries([
      e('averyveryverylongname', 5),
      { name: 'x' },
      null,
      { name: 'y', score: 'no', caseId: 'a', grade: 'A', date: 'd' },
    ]);
    expect(ok).toHaveLength(1);
    expect(ok[0].name).toBe('averyveryver');
  });
  it('persists submissions locally', async () => {
    const storage = new MemoryStorage();
    const board = new LocalLeaderboard(storage);
    await board.submit(e('ace', 120));
    await board.submit(e('bob', 90));
    const again = new LocalLeaderboard(storage);
    expect((await again.list()).map((x) => x.name)).toEqual(['ace', 'bob']);
  });
  it('survives corrupt storage', async () => {
    const storage = new MemoryStorage();
    storage.setItem('rug-or-not:board:v1', '{oops');
    expect(await new LocalLeaderboard(storage).list()).toEqual([]);
  });

  it('keeps the boards apart and caps each one on its own', async () => {
    const board = new LocalLeaderboard(new MemoryStorage());
    for (let i = 0; i < 60; i++) await board.submit({ ...e(`r${i}`, 1000 + i), mode: 'rush' });
    await board.submit(e('case-run', 5));
    await board.submit({ ...e('cold-run', 7), mode: 'cold' });
    expect((await board.list(10, 'case')).map((x) => x.name)).toEqual(['case-run']);
    expect((await board.list(10, 'cold')).map((x) => x.name)).toEqual(['cold-run']);
    const rush = await board.list(50, 'rush');
    expect(rush).toHaveLength(50);
    expect(rush[0].name).toBe('r59');
    // The default listing is the case board, untouched by 60 rush entries.
    expect(await board.list()).toHaveLength(1);
  });

  it('narrows a board to one file', async () => {
    const board = new LocalLeaderboard(new MemoryStorage());
    await board.submit({ ...e('w1', 50), mode: 'cold', caseId: 'cold-week-2026-w38' });
    await board.submit({ ...e('other', 99), mode: 'cold', caseId: 'cold-zzz' });
    expect((await board.list(5, 'cold', 'cold-week-2026-w38')).map((x) => x.name)).toEqual(['w1']);
  });

  it('sanitises mode and holder flags', () => {
    const [a, b] = sanitizeEntries([
      { ...e('a', 1), mode: 'rush', holder: true },
      { ...e('b', 1), mode: 'bogus', holder: 'yes' },
    ]);
    expect(a.mode).toBe('rush');
    expect(a.holder).toBe(true);
    expect(b.mode).toBeUndefined();
    expect(b.holder).toBeUndefined();
  });
});
