import type { CaseData } from '@/data/schema';
import type { SaveData } from './save';

/** The hidden file opens once every ordinary case has been stamped correctly at least once. */
export function secretUnlocked(save: SaveData, cases: CaseData[]): boolean {
  const regular = cases.filter((c) => !c.secret);
  return regular.length > 0 && regular.every((c) => save.caseResults[c.id]?.solved === true);
}

/** Cases the player can open right now (secret ones only once unlocked). */
export function playableCases(save: SaveData, cases: CaseData[]): CaseData[] {
  const open = secretUnlocked(save, cases);
  return cases.filter((c) => !c.secret || open);
}

/** The daily never deals the secret file. */
export function dailyPool(cases: CaseData[]): string[] {
  return cases.filter((c) => !c.secret).map((c) => c.id);
}
