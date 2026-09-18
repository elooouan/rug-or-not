import { RUSH, type Grade } from '@/config/gameConfig';
import { isFlagClue, type CaseData, type CaseDocument } from '@/data/schema';

/** Everything the Rush HUD shows; pure so it can be unit-tested. */
export interface RushState {
  score: number;
  streak: number;
  bestStreak: number;
  /** Pages cleared. */
  rounds: number;
  /** Seconds to add to (or take from) the clock since the last event. */
  timeDelta: number;
}

export function freshRush(): RushState {
  return { score: 0, streak: 0, bestStreak: 0, rounds: 0, timeDelta: 0 };
}

/** 1x for the first hit, then +streakStep per consecutive hit, capped. */
export function rushMultiplier(streak: number): number {
  return Math.min(RUSH.maxMultiplier, 1 + Math.max(0, streak) * RUSH.streakStep);
}

/** A red flag clicked: points scaled by the streak *before* this hit, then the streak grows. */
export function applyFlag(s: RushState): RushState & { gained: number } {
  const gained = Math.round(RUSH.flagPoints * rushMultiplier(s.streak));
  const streak = s.streak + 1;
  return {
    score: s.score + gained,
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    rounds: s.rounds + 1,
    timeDelta: RUSH.flagTimeBonus,
    gained,
  };
}

export function applyHerring(s: RushState): RushState {
  return { ...s, streak: 0, timeDelta: -RUSH.herringPenaltySec };
}

export function applyStray(s: RushState): RushState {
  return { ...s, streak: 0, timeDelta: -RUSH.strayPenaltySec };
}

export function rushGrade(score: number): Grade {
  return (RUSH.grades.find((g) => score >= g.min) ?? RUSH.grades[RUSH.grades.length - 1]).grade;
}

export interface RushPage {
  caseId: string;
  doc: CaseDocument;
}

/** Every document that has at least one red flag to find. */
export function rushPages(cases: CaseData[]): RushPage[] {
  return cases.flatMap((c) =>
    c.documents.filter((d) => d.clues.some(isFlagClue)).map((doc) => ({ caseId: c.id, doc })),
  );
}

/** Fisher–Yates with an injectable random source. */
export function shuffle<T>(arr: readonly T[], random: () => number = Math.random): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
