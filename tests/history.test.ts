import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HISTORY } from '@/data/history';

describe('the wall', () => {
  it('has a photo on disk for every frame, in date order, with captions that fit', () => {
    const missing = HISTORY.filter(
      (f) => !existsSync(resolve(__dirname, '../public/img/history', `${f.file}.jpg`)),
    ).map((f) => f.file);
    expect(missing).toEqual([]);
    const dates = HISTORY.map((f) => f.date);
    expect(dates).toEqual([...dates].sort());
    for (const f of HISTORY) {
      expect(f.caption.length, f.file).toBeLessThan(260);
      expect(f.title.length, f.file).toBeLessThan(24);
    }
    expect(new Set(HISTORY.map((f) => f.file)).size).toBe(HISTORY.length);
  });
});
