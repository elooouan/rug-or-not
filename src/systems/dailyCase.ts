import { hashString, mulberry32 } from './rng';

import type { CaseData } from '@/data/schema';
import { generateCase } from './caseGen';

/** YYYY-MM-DD in the player's local timezone. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Every other day the daily is a generated file (seeded by the date, so it's still the
 * same for everyone); the other days it's one of the handcrafted cases.
 */
export function dailyIsGenerated(dateKey: string): boolean {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return dayNumber % 2 === 1;
}

export function dailySeed(dateKey: string): string {
  return `day-${dateKey}`;
}

/**
 * Today's file: one of the handcrafted cases in `pool`, or on generated days a
 * cold case seeded by the date. Same answer for everyone on the same day.
 */
export function dailyCaseFor(
  dateKey: string,
  cases: readonly CaseData[],
  poolIds: readonly string[],
): CaseData | undefined {
  if (dailyIsGenerated(dateKey)) return generateCase(dailySeed(dateKey));
  if (poolIds.length === 0) return undefined;
  const id = pickDailyCaseId(dateKey, poolIds);
  return cases.find((c) => c.id === id);
}

/** ISO-ish week key (Monday-based), e.g. "2026-w38": the seed for the weekly cold case. */
export function weekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-w${String(week).padStart(2, '0')}`;
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
  /** Dates played, most recent last, capped for the calendar strip. */
  played?: string[];
}

export const DAILY_HISTORY_MAX = 60;

function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return localDateKey(dt);
}

/** Apply a completed daily case for `today` to the streak state. Pure. */
export function recordDailyPlay(state: DailyState, today: string): DailyState {
  if (state.lastPlayed === today) return { ...state, played: state.played ?? [] };
  const continues = state.lastPlayed !== null && addDays(state.lastPlayed, 1) === today;
  const streak = continues ? state.streak + 1 : 1;
  const played = [...(state.played ?? []), today].slice(-DAILY_HISTORY_MAX);
  return { lastPlayed: today, streak, bestStreak: Math.max(state.bestStreak, streak), played };
}

/** For the last `days` days ending today: true where the daily was played. */
export function playedStrip(state: DailyState, today: string, days = 14): boolean[] {
  const set = new Set(state.played ?? []);
  return Array.from({ length: days }, (_, i) => set.has(addDays(today, i - (days - 1))));
}

/** The streak the player currently "holds" (0 if it lapsed). */
export function currentStreak(state: DailyState, today: string): number {
  if (state.lastPlayed === null) return 0;
  if (state.lastPlayed === today || addDays(state.lastPlayed, 1) === today) return state.streak;
  return 0;
}
