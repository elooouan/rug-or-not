/** Scoring, ranks and grade thresholds. Pure data, consumed by src/systems. */
export const SCORING = {
  correctVerdict: 100,
  wrongVerdict: -50,
  realFlagPinned: 25,
  finePrintBonus: 10,
  falseAccusation: -15,
  /** Max time bonus in timed mode, scaled by remaining time fraction. */
  timeBonusMax: 50,
  /** Asking Lucien for a nudge. */
  hintCost: -10,
  maxHints: 3,
} as const;

export const GRADES = [
  { grade: 'S', minPct: 0.95 },
  { grade: 'A', minPct: 0.8 },
  { grade: 'B', minPct: 0.6 },
  { grade: 'C', minPct: 0.4 },
  { grade: 'D', minPct: 0 },
] as const;

export type Grade = (typeof GRADES)[number]['grade'];

export const RANKS = [
  { rank: 'Rookie', minScore: 0 },
  { rank: 'Gumshoe', minScore: 500 },
  { rank: 'Inspector', minScore: 1500 },
  { rank: 'Chief Inspector', minScore: 3500 },
] as const;

export type Rank = (typeof RANKS)[number]['rank'];

export const SAVE_KEY = 'rug-or-not:save:v1';
export const SAVE_VERSION = 1;

export const DEFAULT_TIME_LIMIT_SEC = 180;
