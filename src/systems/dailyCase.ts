import { hashString, mulberry32 } from './rng';

/** YYYY-MM-DD in the player's local timezone. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Deterministically pick one case id for a given date. Everyone with the same
 * case list gets the same case on the same day. Case ids are sorted first so
 * file order doesn't matter.
 */
export function pickDailyCaseId(dateKey: string, caseIds: readonly string[]): string {
  if (caseIds.length === 0) throw new Error('pickDailyCaseId: no cases');
  const sorted = [...caseIds].sort();
  const rnd = mulberry32(hashString(`daily:${dateKey}`));
  return sorted[Math.floor(rnd() * sorted.length)];
}

export interface DailyState {
  lastPlayed: string | null;
  streak: number;
  bestStreak: number;
}

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return localDateKey(dt);
}

/** Apply a completed daily case for `today` to the streak state. Pure. */
export function recordDailyPlay(state: DailyState, today: string): DailyState {
  if (state.lastPlayed === today) return { ...state };
  const continues = state.lastPlayed !== null && addDays(state.lastPlayed, 1) === today;
  const streak = continues ? state.streak + 1 : 1;
  return { lastPlayed: today, streak, bestStreak: Math.max(state.bestStreak, streak) };
}

/** The streak the player currently "holds" (0 if it lapsed). */
export function currentStreak(state: DailyState, today: string): number {
  if (state.lastPlayed === null) return 0;
  if (state.lastPlayed === today || addDays(state.lastPlayed, 1) === today) return state.streak;
  return 0;
}
