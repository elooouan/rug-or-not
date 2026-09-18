import { TOKEN } from '@/config/token';
import { saveStore } from './save';
import { wallet } from './wallet';

/**
 * What holding the coin unlocks, in one place. Game code asks `hasEntitlement()`
 * and never looks at balances or wallets itself, so the token can be swapped,
 * mocked in development, or switched off without touching the game.
 *
 * Everything here is optional dressing and access to extra content. Nothing
 * scores differently, nothing is required to play, nothing moves funds.
 */
export type Entitlement =
  | 'holder' // tier 1: the mark on the board, the aurora, the Shareholder badge
  | 'rim-gold' // tier 1 cosmetic
  | 'holders-file' // tier 1: the weekly holders' file
  | 'wood-mahogany' // tier 2 cosmetic
  | 'lamp-gold' // tier 3 cosmetic
  | 'board-title'; // tier 3: the tier title on the ID card

export interface Tier {
  level: 1 | 2 | 3;
  name: string;
  /** Whole tokens needed. */
  min: number;
  grants: Entitlement[];
}

export const TIERS: Tier[] = [
  {
    level: 1,
    name: 'Shareholder',
    min: TOKEN.holderMin,
    grants: ['holder', 'rim-gold', 'holders-file'],
  },
  { level: 2, name: 'Partner', min: TOKEN.holderMin * 5, grants: ['wood-mahogany'] },
  {
    level: 3,
    name: 'Board member',
    min: TOKEN.holderMin * 10,
    grants: ['lamp-gold', 'board-title'],
  },
];

/** The highest tier a balance reaches, or null. Pure. */
export function tierFor(balance: number | null | undefined): Tier | null {
  const b = balance ?? 0;
  let best: Tier | null = null;
  for (const t of TIERS) if (b >= t.min) best = t;
  return best;
}

/** Everything a balance unlocks (tiers stack). Pure. */
export function entitlementsFor(balance: number | null | undefined): Set<Entitlement> {
  const out = new Set<Entitlement>();
  const b = balance ?? 0;
  for (const t of TIERS) if (b >= t.min) t.grants.forEach((g) => out.add(g));
  return out;
}

/**
 * The balance the game acts on: the live wallet if connected, otherwise the last
 * snapshot the coin page saved (so perks survive reloads), otherwise the dev mock.
 */
export function currentBalance(): number {
  if (wallet.state.connected && wallet.state.token !== null) return wallet.state.token;
  const saved = saveStore.get().wallet.token;
  if (saved !== null && saved !== undefined) return saved;
  return TOKEN.mockBalance;
}

export function hasEntitlement(e: Entitlement): boolean {
  return entitlementsFor(currentBalance()).has(e);
}

export function currentTier(): Tier | null {
  return tierFor(currentBalance());
}
