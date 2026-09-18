import type { CaseData } from '@/data/schema';

export type PlayMode = 'campaign' | 'daily' | 'cold';

/** Volatile cross-scene state (not persisted). */
export const gameState: {
  cases: CaseData[];
  mode: PlayMode;
  currentCase: CaseData | null;
  /** Index into `cases` for campaign progression. */
  currentIndex: number;
  /** Seed of the generated file when mode is 'cold'. */
  coldSeed: string | null;
} = {
  cases: [],
  mode: 'campaign',
  currentCase: null,
  currentIndex: 0,
  coldSeed: null,
};

/** A fresh, shareable seed for a cold case. */
export function newColdSeed(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function caseById(id: string): CaseData | undefined {
  return gameState.cases.find((c) => c.id === id);
}
