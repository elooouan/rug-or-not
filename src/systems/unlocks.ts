import type Phaser from 'phaser';
import { makeLamp, makeMagnifier, makeStamps, makeWood, TEX } from '@/art';
import type { Grade } from '@/config/gameConfig';
import {
  UNLOCKABLES,
  type Unlockable,
  type UnlockCategory,
  type UnlockSource,
} from '@/data/unlockables';
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
  }
}

function find<C extends UnlockCategory>(
  category: C,
  id: string,
): Extract<Unlockable, { category: C }> {
  const list = UNLOCKABLES.filter(
    (u): u is Extract<Unlockable, { category: C }> => u.category === category,
  );
  return list.find((u) => u.id === id) ?? list[0];
}

/** Regenerate the cosmetic textures for the chosen selection. Purely visual. */
export function applyCosmetics(scene: Phaser.Scene, sel: CosmeticSelection): void {
  const wood = find('desk', sel.desk).style;
  const lamp = find('lamp', sel.lamp).style;
  const rim = find('rim', sel.rim).style;
  const ink = find('ink', sel.ink).style;
  const drop = (keys: string[]) =>
    keys.forEach((k) => scene.textures.exists(k) && scene.textures.remove(k));
  drop([
    TEX.wood,
    TEX.lamp,
    TEX.cursor,
    TEX.lensRim,
    TEX.lensRimGlow,
    TEX.lensVignette,
    TEX.lensGlint,
    TEX.stampRug,
    TEX.stampLegit,
    TEX.inkPad,
  ]);
  makeWood(scene, TEX.wood, wood);
  makeLamp(scene, lamp.shade);
  makeMagnifier(scene, rim);
  makeStamps(scene, ink.rug, ink.legit);
}

/** Palette keys for the currently selected stamp ink (used by the impression). */
export function stampInk(sel: CosmeticSelection): { rug: string; legit: string } {
  const ink = find('ink', sel.ink).style;
  return { rug: ink.rug, legit: ink.legit };
}
