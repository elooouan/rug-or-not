import { RANKS, type Rank } from '@/config/gameConfig';

export function rankForScore(total: number): Rank {
  let current: Rank = RANKS[0].rank;
  for (const r of RANKS) if (total >= r.minScore) current = r.rank;
  return current;
}

/** Points until the next rank, or null at the top. */
export function nextRankInfo(total: number): { rank: Rank; remaining: number } | null {
  for (const r of RANKS)
    if (total < r.minScore) return { rank: r.rank, remaining: r.minScore - total };
  return null;
}

export function rankIndex(rank: Rank): number {
  return RANKS.findIndex((r) => r.rank === rank);
}
