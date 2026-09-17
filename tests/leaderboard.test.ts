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
});
