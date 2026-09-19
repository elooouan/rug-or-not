import { beforeEach, describe, expect, it } from 'vitest';
import { claimHint, hintSeen, resetHints, unclaimHint } from '@/systems/hints';
import { saveStore } from '@/systems/save';

describe('hints', () => {
  beforeEach(() => saveStore.reset());

  it('claims each script once', () => {
    expect(claimHint('title-intro')).toBe(true);
    expect(hintSeen('title-intro')).toBe(true);
    expect(claimHint('title-intro')).toBe(false);
    expect(claimHint('notebook')).toBe(true);
  });

  it('gives a claim back', () => {
    expect(claimHint('coffee')).toBe(true);
    unclaimHint('coffee');
    expect(hintSeen('coffee')).toBe(false);
    expect(claimHint('coffee')).toBe(true);
  });

  it('respects the hints setting and can be replayed', () => {
    saveStore.update((d) => (d.settings.hints = false));
    expect(claimHint('cat')).toBe(false);
    saveStore.update((d) => (d.settings.hints = true));
    expect(claimHint('cat')).toBe(true);
    resetHints();
    expect(hintSeen('cat')).toBe(false);
    expect(claimHint('cat')).toBe(true);
  });
});

describe('story beats', () => {
  it('point at scripts that exist, in campaign order', async () => {
    const { LUCIEN, STORY_BEATS } = await import('@/data/dialogue');
    const indexes = Object.keys(STORY_BEATS).map(Number);
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
    for (const id of Object.values(STORY_BEATS)) {
      expect(LUCIEN[id].length).toBeGreaterThan(0);
      for (const line of LUCIEN[id]) expect(line.text.length).toBeLessThan(160);
    }
    // Every script has lines short enough for the box (four rows at most).
    for (const [id, lines] of Object.entries(LUCIEN))
      for (const line of lines) expect(line.text.length, id).toBeLessThan(200);
  });
});
