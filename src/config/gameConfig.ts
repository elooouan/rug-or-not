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
  /** Detective's honour: no nudges, no examined counter, no hover highlights; everything scores more. */
  hardModeMultiplier: 1.25,
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

/** Red Flag Rush: one page at a time against the clock. */
export const RUSH = {
  timeSec: 60,
  flagPoints: 100,
  /** Each consecutive hit adds this to the multiplier... */
  streakStep: 0.25,
  /** ...up to here. */
  maxMultiplier: 3,
  /** Seconds bought by a hit / lost to a herring / lost to blank paper. */
  flagTimeBonus: 3,
  herringPenaltySec: 5,
  strayPenaltySec: 2,
  /** The radio runs this much faster during a rush. */
  musicBpmBoost: 18,
  /** Drills: this many pages, all carrying one flag, on a gentler clock. */
  drillPages: 5,
  drillTimeSec: 90,
  /** Score thresholds for the grade on the results card and the board. */
  grades: [
    { grade: 'S', min: 3000 },
    { grade: 'A', min: 2000 },
    { grade: 'B', min: 1200 },
    { grade: 'C', min: 600 },
    { grade: 'D', min: 0 },
  ],
} as const;

/** Shown on the title and the About page; bump with CHANGELOG.md. */
export const GAME_VERSION = 'v0.7';

export const SAVE_KEY = 'rug-or-not:save:v1';
export const SAVE_VERSION = 1;

export const DEFAULT_TIME_LIMIT_SEC = 180;
