import type { CaseData } from '@/data/schema';

export type PlayMode = 'campaign' | 'daily';

/** Volatile cross-scene state (not persisted). */
export const gameState: {
  cases: CaseData[];
  mode: PlayMode;
  currentCase: CaseData | null;
  /** Index into `cases` for campaign progression. */
  currentIndex: number;
} = {
  cases: [],
  mode: 'campaign',
  currentCase: null,
  currentIndex: 0,
};

export function caseById(id: string): CaseData | undefined {
  return gameState.cases.find((c) => c.id === id);
}
