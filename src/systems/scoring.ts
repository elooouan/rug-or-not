import { GRADES, SCORING, type Grade } from '@/config/gameConfig';
import type { CaseData, Clue } from '@/data/schema';
import { isFlagClue } from '@/data/schema';

export type Verdict = 'rug' | 'legit';

export interface PinState {
  /** Clue ids the player pinned. */
  clueIds: string[];
  /** Number of pins placed on empty paper (no clue underneath). */
  strayPins: number;
}

export interface ScoreInput {
  caseData: CaseData;
  verdict: Verdict;
  pins: PinState;
  /** Seconds remaining, or null in relaxed mode. */
  timeLeftSec: number | null;
}

export interface ClueOutcome {
  clue: Clue;
  documentTitle: string;
  pinned: boolean;
}

export interface ScoreBreakdown {
  verdictCorrect: boolean;
  verdictPoints: number;
  flagsFound: ClueOutcome[];
  flagsMissed: ClueOutcome[];
  falseAccusations: ClueOutcome[];
  strayPins: number;
  flagPoints: number;
  penaltyPoints: number;
  timeBonus: number;
  total: number;
  maxPossible: number;
  grade: Grade;
}

export function allClues(caseData: CaseData): ClueOutcome[] {
  const out: ClueOutcome[] = [];
  for (const doc of caseData.documents) {
    for (const clue of doc.clues) out.push({ clue, documentTitle: doc.title, pinned: false });
  }
  return out;
}

export function maxPossibleScore(caseData: CaseData, timed: boolean): number {
  let max = SCORING.correctVerdict;
  for (const { clue } of allClues(caseData)) {
    if (isFlagClue(clue))
      max += SCORING.realFlagPinned + (clue.finePrint ? SCORING.finePrintBonus : 0);
  }
  if (timed) max += SCORING.timeBonusMax;
  return max;
}

export function timeBonus(timeLeftSec: number | null, timeLimitSec: number): number {
  if (timeLeftSec === null || timeLimitSec <= 0) return 0;
  const frac = Math.max(0, Math.min(1, timeLeftSec / timeLimitSec));
  return Math.floor(frac * SCORING.timeBonusMax);
}

export function gradeFor(total: number, maxPossible: number): Grade {
  const pct = maxPossible > 0 ? total / maxPossible : 0;
  for (const g of GRADES) if (pct >= g.minPct) return g.grade;
  return 'D';
}

/** Pure scoring. Never negative in total (a case can't cost you progress). */
export function scoreCase(input: ScoreInput): ScoreBreakdown {
  const { caseData, verdict, pins, timeLeftSec } = input;
  const pinned = new Set(pins.clueIds);
  const verdictCorrect = verdict === caseData.verdict;
  const verdictPoints = verdictCorrect ? SCORING.correctVerdict : SCORING.wrongVerdict;

  const flagsFound: ClueOutcome[] = [];
  const flagsMissed: ClueOutcome[] = [];
  const falseAccusations: ClueOutcome[] = [];
  let flagPoints = 0;
  for (const outcome of allClues(caseData)) {
    const isPinned = pinned.has(outcome.clue.id);
    outcome.pinned = isPinned;
    if (isFlagClue(outcome.clue)) {
      if (isPinned) {
        flagsFound.push(outcome);
        flagPoints +=
          SCORING.realFlagPinned + (outcome.clue.finePrint ? SCORING.finePrintBonus : 0);
      } else flagsMissed.push(outcome);
    } else if (isPinned) {
      falseAccusations.push(outcome);
    }
  }
  const strayPins = Math.max(0, Math.floor(pins.strayPins));
  const penaltyPoints = (falseAccusations.length + strayPins) * SCORING.falseAccusation || 0;
  const bonus = timeBonus(timeLeftSec, caseData.timeLimitSec);
  const raw = verdictPoints + flagPoints + penaltyPoints + bonus;
  const total = Math.max(0, raw);
  const maxPossible = maxPossibleScore(caseData, timeLeftSec !== null);
  return {
    verdictCorrect,
    verdictPoints,
    flagsFound,
    flagsMissed,
    falseAccusations,
    strayPins,
    flagPoints,
    penaltyPoints,
    timeBonus: bonus,
    total,
    maxPossible,
    grade: gradeFor(total, maxPossible),
  };
}
