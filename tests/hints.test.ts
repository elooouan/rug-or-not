import { beforeEach, describe, expect, it } from 'vitest';
import { claimHint, hintSeen, resetHints } from '@/systems/hints';
import { saveStore } from '@/systems/save';

describe('hints', () => {
  beforeEach(() => saveStore.reset());

  it('claims each script once', () => {
    expect(claimHint('title-intro')).toBe(true);
    expect(hintSeen('title-intro')).toBe(true);
    expect(claimHint('title-intro')).toBe(false);
    expect(claimHint('notebook')).toBe(true);
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
