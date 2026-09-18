import type { Grade } from '@/config/gameConfig';
import {
  UNLOCKABLES,
  type Unlockable,
  type UnlockCategory,
  type UnlockSource,
} from '@/data/unlockables';
import { TOKEN } from '@/config/token';
import { rankIndex } from './ranks';
import { rankForScore } from './ranks';
import type { CosmeticSelection, SaveData } from './save';

/** Everything an unlock source may look at. Derived from save data. */
export interface UnlockContext {
  totalScore: number;
  casesCompleted: number;
  gradeCounts: Record<Grade, number>;
  bestStreak: number;
  flagsLearned: number;
  /** Last known balance of the game's coin, whole tokens. */
  tokenBalance: number;
}

export function contextFromSave(save: SaveData): UnlockContext {
  const gradeCounts: Record<Grade, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  let casesCompleted = 0;
  for (const r of Object.values(save.caseResults)) {
    casesCompleted++;
    gradeCounts[r.bestGrade]++;
  }
  return {
    totalScore: save.totalScore,
    casesCompleted,
    gradeCounts,
    bestStreak: save.daily.bestStreak,
    flagsLearned: save.unlockedFlags.length,
    tokenBalance: Math.max(save.wallet?.token ?? 0, TOKEN.mockBalance),
  };
}

type Resolver<T extends UnlockSource['type']> = (
  source: Extract<UnlockSource, { type: T }>,
  ctx: UnlockContext,
) => boolean;

/** Pluggable: add a new source type to UnlockSource and register its resolver here. */
export const sourceResolvers: { [K in UnlockSource['type']]: Resolver<K> } = {
  always: () => true,
  rank: (s, ctx) => rankIndex(rankForScore(ctx.totalScore)) >= rankIndex(s.value),
  casesCompleted: (s, ctx) => ctx.casesCompleted >= s.value,
  grade: (s, ctx) => {
    // Count the requested grade and every better grade.
    const order: Grade[] = ['S', 'A', 'B', 'C', 'D'];
    const idx = order.indexOf(s.value.grade);
    const n = order.slice(0, idx + 1).reduce((acc, g) => acc + ctx.gradeCounts[g], 0);
    return n >= s.value.count;
  },
  streak: (s, ctx) => ctx.bestStreak >= s.value,
  flagsLearned: (s, ctx) => ctx.flagsLearned >= s.value,
  holder: (s, ctx) => ctx.tokenBalance >= s.value,
};

export function isUnlocked(u: Unlockable, ctx: UnlockContext): boolean {
  const resolve = sourceResolvers[u.source.type] as (s: UnlockSource, c: UnlockContext) => boolean;
  return resolve(u.source, ctx);
}

export function unlockedIds(save: SaveData): string[] {
  const ctx = contextFromSave(save);
  return UNLOCKABLES.filter((u) => isUnlocked(u, ctx)).map((u) => u.id);
}

/** Unlocked items the player hasn't been told about yet. */
export function newlyUnlocked(save: SaveData): Unlockable[] {
  const seen = new Set(save.seenUnlocks);
  const ctx = contextFromSave(save);
  return UNLOCKABLES.filter(
    (u) => u.source.type !== 'always' && !seen.has(u.id) && isUnlocked(u, ctx),
  );
}

export function byCategory(category: UnlockCategory): Unlockable[] {
  return UNLOCKABLES.filter((u) => u.category === category);
}

export function describeSource(s: UnlockSource): string {
  switch (s.type) {
    case 'always':
      return 'Default';
    case 'rank':
      return `Reach ${s.value}`;
    case 'casesCompleted':
      return `Complete ${s.value} cases`;
    case 'grade':
      return `${s.value.count} cases graded ${s.value.grade}`;
    case 'streak':
      return `${s.value}-day daily streak`;
    case 'flagsLearned':
      return `Learn ${s.value} red flags`;
    case 'holder':
      return `Hold ${s.value}+ ${TOKEN.symbol}`;
  }
}

export function findUnlockable<C extends UnlockCategory>(
  category: C,
  id: string,
): Extract<Unlockable, { category: C }> {
  const list = UNLOCKABLES.filter(
    (u): u is Extract<Unlockable, { category: C }> => u.category === category,
  );
  return list.find((u) => u.id === id) ?? list[0];
}

/** Palette keys for the currently selected stamp ink (used by the impression). */
export function stampInk(sel: CosmeticSelection): { rug: string; legit: string } {
  const ink = findUnlockable('ink', sel.ink).style;
  return { rug: ink.rug, legit: ink.legit };
}
