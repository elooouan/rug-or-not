import { describe, expect, it } from 'vitest';
// The reference Cloudflare Worker for the shared board (server/leaderboard).
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore plain JS module
import worker from '../server/leaderboard/worker.js';

/** Just enough of KV for the worker: get/put with JSON and TTL ignored. */
function fakeKv() {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string, type?: string) {
      const v = store.get(key);
      if (v === undefined) return null;
      return type === 'json' ? JSON.parse(v) : v;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
  };
}

const env = () => ({ BOARD: fakeKv(), ALLOWED_ORIGIN: 'https://example.test' });
const post = (body: unknown, ip = '1.2.3.4') =>
  new Request('https://board.test/', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
    body: JSON.stringify(body),
  });
const entry = (over: Record<string, unknown> = {}) => ({
  name: 'ANON',
  score: 300,
  caseId: 'moonpup',
  grade: 'A',
  date: '2026-09-18T00:00:00.000Z',
  ...over,
});

describe('leaderboard worker', () => {
  it('accepts a sane entry and lists it highest first', async () => {
    const e = env();
    expect((await worker.fetch(post(entry()), e)).status).toBe(200);
    expect((await worker.fetch(post(entry({ name: 'BEST', score: 900 })), e)).status).toBe(200);
    const res = await worker.fetch(new Request('https://board.test/?limit=10&mode=case'), e);
    const list = (await res.json()) as { name: string; score: number }[];
    expect(list.map((x) => x.name)).toEqual(['BEST', 'ANON']);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://example.test');
  });

  it('keeps boards apart and drops junk fields', async () => {
    const e = env();
    await worker.fetch(post(entry({ mode: 'rush', score: 5000, hacker: 'yes', hard: true })), e);
    const rush = (await (
      await worker.fetch(new Request('https://board.test/?mode=rush'), e)
    ).json()) as Record<string, unknown>[];
    const cases = (await (
      await worker.fetch(new Request('https://board.test/?mode=case'), e)
    ).json()) as unknown[];
    expect(rush).toHaveLength(1);
    expect(cases).toHaveLength(0);
    expect(rush[0]).not.toHaveProperty('hacker');
    expect(rush[0]).toMatchObject({ mode: 'rush', hard: true, score: 5000 });
  });

  it('filters a board by caseId', async () => {
    const e = env();
    await worker.fetch(post(entry({ mode: 'cold', caseId: 'cold-week-2026-w38', score: 40 })), e);
    await worker.fetch(post(entry({ mode: 'cold', caseId: 'cold-abc123', score: 90 })), e);
    const res = await worker.fetch(
      new Request('https://board.test/?mode=cold&caseId=cold-week-2026-w38'),
      e,
    );
    const list = (await res.json()) as { caseId: string }[];
    expect(list.map((x) => x.caseId)).toEqual(['cold-week-2026-w38']);
  });

  it('rejects nonsense and rate-limits an address', async () => {
    const e = env();
    expect((await worker.fetch(post(entry({ score: 1e9 })), e)).status).toBe(400);
    expect((await worker.fetch(post(entry({ grade: 'Z' })), e)).status).toBe(400);
    expect((await worker.fetch(post('nope'), e)).status).toBe(400);
    let last = 200;
    for (let i = 0; i < 14; i++) last = (await worker.fetch(post(entry(), '9.9.9.9'), e)).status;
    expect(last).toBe(429);
  });

  it('keeps one row per desk on the detectives board and sorts either way', async () => {
    const e = env();
    const desk = (over: Record<string, unknown> = {}) => ({
      id: 'a1b2c3d4e5f60718',
      name: 'LUCIEN',
      total: 1063,
      rank: 'Gumshoe',
      clips: 40,
      solved: 7,
      badges: 4,
      date: '2026-09-19T00:00:00.000Z',
      ...over,
    });
    const postDesk = (body: unknown, ip = '9.9.9.9') =>
      new Request('https://board.test/?board=desks', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
        body: JSON.stringify(body),
      });
    expect((await worker.fetch(postDesk(desk()), e)).status).toBe(200);
    // The same desk again with more points replaces the row rather than adding one.
    expect((await worker.fetch(postDesk(desk({ total: 1200, hacker: 1 })), e)).status).toBe(200);
    expect(
      (
        await worker.fetch(
          postDesk(desk({ id: '0000000000000001', name: 'RICH', total: 300, clips: 900 })),
          e,
        )
      ).status,
    ).toBe(200);
    const byScore = (await (
      await worker.fetch(new Request('https://board.test/?board=desks'), e)
    ).json()) as Record<string, unknown>[];
    expect(byScore.map((d) => d.name)).toEqual(['LUCIEN', 'RICH']);
    expect(byScore[0]).toMatchObject({ total: 1200, clips: 40 });
    expect(byScore[0]).not.toHaveProperty('hacker');
    const byClips = (await (
      await worker.fetch(new Request('https://board.test/?board=desks&sort=clips'), e)
    ).json()) as { name: string }[];
    expect(byClips.map((d) => d.name)).toEqual(['RICH', 'LUCIEN']);
    // Junk ids, silly numbers and blocked names are refused; run boards stay untouched.
    expect((await worker.fetch(postDesk(desk({ id: 'nope' })), e)).status).toBe(400);
    expect((await worker.fetch(postDesk(desk({ total: -5 })), e)).status).toBe(400);
    expect((await worker.fetch(postDesk(desk({ name: 'SH1T' })), e)).status).toBe(400);
    const cases = (await (
      await worker.fetch(new Request('https://board.test/?mode=case'), e)
    ).json()) as unknown[];
    expect(cases).toHaveLength(0);
  });
});
