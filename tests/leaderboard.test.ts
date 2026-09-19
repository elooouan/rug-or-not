import { describe, expect, it } from 'vitest';
import {
  currentDesk,
  deskId,
  LocalLeaderboard,
  rankDesks,
  rankEntries,
  sanitizeDesks,
  sanitizeEntries,
  upsertDesks,
  type DeskEntry,
  type ScoreEntry,
} from '@/systems/leaderboard';
import { saveStore } from '@/systems/save';

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

describe('recent runs', () => {
  it('lists this device runs newest first across modes', async () => {
    const { LocalLeaderboard } = await import('@/systems/leaderboard');
    const store = new Map<string, string>();
    const board = new LocalLeaderboard({
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => void store.set(k, v),
    });
    const entry = (caseId: string, date: string, mode?: 'rush' | 'cold') => ({
      name: 'A',
      score: 100,
      caseId,
      grade: 'B' as const,
      date,
      mode,
    });
    await board.submit(entry('moonpup', '2026-09-17T10:00:00Z'));
    await board.submit(entry('rush', '2026-09-18T10:00:00Z', 'rush'));
    await board.submit(entry('cold-x', '2026-09-19T10:00:00Z', 'cold'));
    expect(board.recent(2).map((e) => e.caseId)).toEqual(['cold-x', 'rush']);
  });

  it('keeps one row per desk, sorted by score or by clips', () => {
    const d = (id: string, total: number, clips: number, date = '2026-09-19'): DeskEntry => ({
      id,
      name: id.slice(0, 4).toUpperCase(),
      total,
      rank: 'Rookie',
      clips,
      solved: 1,
      badges: 0,
      date,
    });
    const a = d('aaaaaaaaaaaaaaaa', 100, 500);
    const b = d('bbbbbbbbbbbbbbbb', 300, 20);
    let board = upsertDesks([], a);
    board = upsertDesks(board, b);
    board = upsertDesks(board, { ...a, total: 350 }); // the same desk, later
    expect(board.map((x) => x.id)).toEqual([a.id, b.id]);
    expect(board).toHaveLength(2);
    expect(rankDesks(board, 10, 'clips').map((x) => x.id)).toEqual([a.id, b.id]);
    expect(rankDesks(board, 1, 'total')).toHaveLength(1);
    // Junk is dropped, numbers are clamped, extras are trimmed.
    const clean = sanitizeDesks([
      { ...a, total: 1e9, hacker: true },
      { ...b, id: 'short' },
      'nope',
      { ...b, clips: -1 },
    ]);
    expect(clean).toHaveLength(1);
    expect(clean[0].total).toBe(1_000_000);
    expect(clean[0]).not.toHaveProperty('hacker');
  });

  it('mints a desk id once and describes the save', () => {
    saveStore.reset();
    const id = deskId();
    expect(id).toMatch(/^[a-f0-9]{16}$/);
    expect(deskId()).toBe(id);
    expect(saveStore.get().id).toBe(id);
    saveStore.update((s) => {
      s.totalScore = 420;
      s.clips.earned = 12;
      s.badges.push('first-case');
    });
    const desk = currentDesk();
    expect(desk).toMatchObject({ id, name: 'ANON', total: 420, clips: 12, badges: 1, solved: 0 });
    expect(desk.token).toBeUndefined();
    const local = new LocalLeaderboard(new MemoryStorage());
    return local
      .upsertDesk(desk)
      .then(() => local.desks())
      .then((rows) => expect(rows.map((r) => r.id)).toEqual([id]));
  });
});
