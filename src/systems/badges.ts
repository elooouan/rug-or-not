import type Phaser from 'phaser';
import { BADGE_BY_ID, BADGES } from '@/data/badges';
import { saveStore, type SaveData } from './save';

type Toaster = (scene: Phaser.Scene, title: string, body: string) => void;
let toaster: Toaster | null = null;

/** The UI layer registers how to show a badge toast (keeps this module Phaser-free). */
export function setBadgeToaster(fn: Toaster): void {
  toaster = fn;
}

export function hasBadge(id: string): boolean {
  return saveStore.get().badges.includes(id);
}

/** Award once; returns true when newly earned. */
export function awardBadge(scene: Phaser.Scene | null, id: string): boolean {
  if (!BADGE_BY_ID[id] || hasBadge(id)) return false;
  saveStore.update((d) => d.badges.push(id));
  if (scene && toaster) toaster(scene, 'BADGE EARNED', BADGE_BY_ID[id].name);
  return true;
}

export function badgeCount(): { earned: number; total: number } {
  return {
    earned: saveStore.get().badges.filter((b) => BADGE_BY_ID[b]).length,
    total: BADGES.length,
  };
}

/** Bump a counter in save.stats and return the new value. */
export function bumpStat(key: keyof SaveData['stats'], by = 1): number {
  let v = 0;
  saveStore.update((d) => {
    const cur = d.stats[key];
    if (typeof cur === 'number') {
      d.stats[key] = (cur + by) as never;
      v = cur + by;
    }
  });
  return v;
}

export function noteSeen(key: 'weathersSeen' | 'pagesSeen', value: string): string[] {
  let out: string[] = [];
  saveStore.update((d) => {
    if (!d.stats[key].includes(value)) d.stats[key].push(value);
    out = d.stats[key];
  });
  return out;
}

/**
 * Progress towards counter-style badges, for the badges page ("7/10"). Returns null
 * for badges that are a single moment rather than a count. `totals` carries the
 * numbers the save doesn't know (case count, page count...).
 */
export function badgeProgress(
  id: string,
  totals: { cases: number; rugs: number; pages: number; flags: number; weathers: number },
): { n: number; of: number } | null {
  const d = saveStore.get();
  const st = d.stats;
  const results = Object.values(d.caseResults);
  const clamp = (n: number, of: number) => ({ n: Math.min(n, of), of });
  switch (id) {
    case 'wired':
      return clamp(st.sips, 10);
    case 'cat-person':
      return clamp(st.pets, 10);
    case 'electrician':
      return clamp(st.lampClicks, 10);
    case 'fair-judge':
      return clamp(st.legitCorrect, 3);
    case 'steady-hand':
      return clamp(st.cleanStreak, 5);
    case 'streak-3':
      return clamp(d.daily.bestStreak, 3);
    case 'streak-7':
      return clamp(d.daily.bestStreak, 7);
    case 'five-s':
      return clamp(results.filter((r) => r.bestGrade === 'S').length, 5);
    case 'all-cases':
      return clamp(results.length, totals.cases);
    case 'all-flags':
      return clamp(d.unlockedFlags.length, totals.flags);
    case 'most-wanted':
      return clamp(results.filter((r) => r.solved).length, totals.rugs);
    case 'weather-watcher':
      return clamp(st.weathersSeen.length, totals.weathers);
    case 'power-user':
      return clamp(st.pagesSeen.length, totals.pages);
    case 'speed-reader':
      return clamp(st.rushBest, 2000);
    case 'hot-streak':
      return clamp(st.rushBestStreak, 10);
    case 'cold-ten':
      return clamp(st.coldCorrect, 10);
    case 'drill-sergeant':
      return clamp(st.drilled.length, totals.flags);
    default:
      return null;
  }
}

/** Badges that depend on aggregate save state; call after anything that changes it. */
export function checkAggregateBadges(scene: Phaser.Scene | null): void {
  const d = saveStore.get();
  const sGrades = Object.values(d.caseResults).filter((r) => r.bestGrade === 'S').length;
  if (sGrades >= 1) awardBadge(scene, 's-grade');
  if (sGrades >= 5) awardBadge(scene, 'five-s');
  if (d.daily.bestStreak >= 3) awardBadge(scene, 'streak-3');
  if (d.daily.bestStreak >= 7) awardBadge(scene, 'streak-7');
  const hour = new Date().getHours();
  if (hour >= 1 && hour < 4) awardBadge(scene, 'night-owl');
}
