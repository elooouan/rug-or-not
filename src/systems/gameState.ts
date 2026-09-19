import type { CaseData } from '@/data/schema';
import type { ReportPayload } from '@/scenes/InvestigationScene';
import { saveStore } from './save';

export type PlayMode = 'campaign' | 'daily' | 'cold';

/** A second look at a closed file: the run's pins, and the report to go back to. */
export interface ReviewState {
  pinnedIds: string[];
  report: ReportPayload;
}

/** Volatile cross-scene state (not persisted). */
export const gameState: {
  cases: CaseData[];
  mode: PlayMode;
  currentCase: CaseData | null;
  /** Index into `cases` for campaign progression. */
  currentIndex: number;
  /** Seed of the generated file when mode is 'cold'. */
  coldSeed: string | null;
  /** Set by the report for the desk to open the file read-only; consumed on the way in. */
  review: ReviewState | null;
} = {
  cases: [],
  mode: 'campaign',
  currentCase: null,
  currentIndex: 0,
  coldSeed: null,
  review: null,
};

/**
 * A fresh, shareable seed for a cold case. A `d<1-5>-` prefix pins the
 * difficulty, so the seed alone reproduces the file (see startColdCase).
 */
export function newColdSeed(difficulty?: number): string {
  const body = Math.random().toString(36).slice(2, 8);
  return difficulty ? `d${difficulty}-${body}` : body;
}

/** Cold-case difficulty that grows with the number of files the player has solved. */
export function coldDifficultyFor(solvedRegular: number): number {
  const base = 1 + Math.floor(solvedRegular / 3);
  const wobble = Math.random() < 0.35 ? 1 : 0;
  return Math.max(1, Math.min(5, base + wobble));
}

/** How many ordinary campaign files have been stamped right (drives cold difficulty). */
export function solvedRegular(): number {
  const results = saveStore.get().caseResults;
  return gameState.cases.filter((c) => !c.secret && results[c.id]?.solved).length;
}

/** Tonight's printer setting: pinned in Settings, or grown from the campaign. */
export function coldDifficulty(): number {
  const pinned = saveStore.get().settings.coldDifficulty;
  return pinned > 0 ? pinned : coldDifficultyFor(solvedRegular());
}

export function caseById(id: string): CaseData | undefined {
  return gameState.cases.find((c) => c.id === id);
}
