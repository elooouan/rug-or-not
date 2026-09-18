import { beforeEach, describe, expect, it } from 'vitest';
import {
  CUSTOM_KEY,
  readCustomCases,
  removeCustomCase,
  saveCustomCase,
} from '@/systems/customCases';
import { generateCase } from '@/systems/caseGen';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
  key() {
    return null;
  }
  get length() {
    return this.m.size;
  }
}

describe('custom cases', () => {
  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
  });

  it('saves valid files, replaces by id, and drops junk on read', () => {
    const a = generateCase('custom-a');
    const b = generateCase('custom-b');
    expect(saveCustomCase(a).map((c) => c.id)).toEqual([a.id]);
    expect(saveCustomCase(b).map((c) => c.id)).toEqual([a.id, b.id]);
    // Saving again with the same id replaces, never duplicates.
    expect(saveCustomCase({ ...a, title: 'Renamed' }).map((c) => c.title)).toContain('Renamed');
    expect(readCustomCases()).toHaveLength(2);
    // Junk that sneaks into storage is ignored.
    localStorage.setItem(CUSTOM_KEY, JSON.stringify([a, { id: 'nope' }, 'text', null]));
    expect(readCustomCases().map((c) => c.id)).toEqual([a.id]);
    localStorage.setItem(CUSTOM_KEY, '{not json');
    expect(readCustomCases()).toEqual([]);
  });

  it('refuses an invalid file with the schema errors', () => {
    expect(() => saveCustomCase({ id: 'x' })).toThrow();
    expect(removeCustomCase('x')).toEqual([]);
  });
});
