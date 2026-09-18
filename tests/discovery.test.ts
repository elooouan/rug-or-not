import { beforeEach, describe, expect, it } from 'vitest';
import {
  closedFiles,
  FEATURES,
  markDiscovered,
  pendingDiscovery,
  syncDiscovery,
  unlocked,
} from '@/systems/discovery';
import { saveStore } from '@/systems/save';
import { HANDBOOK } from '@/data/handbook';

const close = (n: number) =>
  saveStore.update((d) => {
    for (let i = 0; i < n; i++)
      d.caseResults[`case-${i}`] = {
        bestScore: 100,
        bestGrade: 'B',
        completions: 1,
        lastVerdictCorrect: true,
        solved: true,
      };
  });

describe('the desk opens up gradually', () => {
  beforeEach(() => saveStore.reset());

  it('starts with the drawer, the rush, the pile and the weekly out of sight', () => {
    for (const f of FEATURES) expect(unlocked(f.id)).toBe(false);
    expect(pendingDiscovery()).toBeNull();
  });

  it('unlocks in desk order as files close, cold cases included', () => {
    close(1);
    expect(unlocked('drawer')).toBe(true);
    expect(unlocked('rush')).toBe(false);
    saveStore.update((d) => (d.stats.coldRuns = 1));
    expect(closedFiles()).toBe(2);
    expect(unlocked('rush')).toBe(true);
    expect(unlocked('cold')).toBe(false);
  });

  it('announces one new thing per visit and remembers it', () => {
    close(3);
    expect(pendingDiscovery()?.id).toBe('drawer');
    markDiscovered('drawer');
    expect(pendingDiscovery()?.id).toBe('rush');
    markDiscovered('rush');
    markDiscovered('cold');
    expect(pendingDiscovery()).toBeNull();
    close(4);
    expect(pendingDiscovery()?.id).toBe('weekly');
  });

  it('does not walk a veteran save through the drawer', () => {
    close(9);
    syncDiscovery();
    expect(pendingDiscovery()).toBeNull();
    // A mid-way save keeps its staggered announcements.
    saveStore.reset();
    close(2);
    syncDiscovery();
    expect(pendingDiscovery()?.id).toBe('drawer');
  });

  it('has a handbook page for every gated feature', () => {
    for (const f of FEATURES) expect(HANDBOOK.some((t) => t.feature === f.id)).toBe(true);
    const ids = HANDBOOK.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
