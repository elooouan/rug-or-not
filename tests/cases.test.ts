import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateCase, isFlagClue } from '@/data/schema';

const dir = join(__dirname, '..', 'src', 'data', 'cases');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

describe('case files', () => {
  it('has the MVP set of cases', () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  for (const file of files) {
    it(`${file} validates`, () => {
      const raw = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      const res = validateCase(raw);
      if (!res.ok) throw new Error(res.errors.join('\n'));
      const c = res.case;
      // Every rug has at least one flag; every case has something to pin.
      const clues = c.documents.flatMap((d) => d.clues);
      expect(clues.length).toBeGreaterThan(0);
      if (c.verdict === 'rug') expect(clues.some(isFlagClue)).toBe(true);
      else expect(clues.some(isFlagClue)).toBe(false);
    });
  }

  it('case ids are unique', () => {
    const ids = files.map(
      (f) => (JSON.parse(readFileSync(join(dir, f), 'utf8')) as { id: string }).id,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('validateCase', () => {
  const base = JSON.parse(readFileSync(join(dir, files[0]), 'utf8'));

  it('rejects unknown flag ids with a readable path', () => {
    const bad = structuredClone(base);
    bad.documents[0].clues[0].flagId = 'not-a-flag';
    const res = validateCase(bad);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.join('\n')).toMatch(/documents\.0\.clues\.0/);
  });

  it('rejects out-of-range anchors', () => {
    const bad = structuredClone(base);
    bad.documents[0].clues[0].anchor = { kind: 'line', line: 999 };
    const res = validateCase(bad);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.join('\n')).toMatch(/out of range/);
  });

  it('rejects legit cases that contain red flags', () => {
    const bad = structuredClone(base);
    bad.verdict = 'legit';
    const res = validateCase(bad);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.join('\n')).toMatch(/legit cases must not/);
  });

  it('requires text on fine print clues', () => {
    const bad = structuredClone(base);
    bad.documents[0].clues[0].finePrint = true;
    delete bad.documents[0].clues[0].text;
    const res = validateCase(bad);
    expect(res.ok).toBe(false);
  });

  it('never throws on garbage', () => {
    expect(validateCase(null).ok).toBe(false);
    expect(validateCase('nope').ok).toBe(false);
    expect(validateCase({}).ok).toBe(false);
  });
});
