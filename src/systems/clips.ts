import { TOKEN } from '@/config/token';
import { DEFAULT_LOOK, SHOP, SHOP_BY_ID, type ShopItem, type ShopSlot } from '@/data/shop';
import { localDateKey } from './dailyCase';
import { currentBalance, currentTier } from './entitlements';
import { makeRng } from './rng';
import { saveStore } from './save';

/**
 * Clips: the desk's own currency. Paper clips, because it's a desk. They come from
 * closing files (a few at a time, on purpose) and from holding the coin, which adds an
 * allowance that tracks the balance the wallet reports (read-only; nothing is bought with
 * the coin itself, nothing moves). They are spent at the market on dressing: coats, hats,
 * mugs, the cat's fur, ornaments. Nothing bought changes scoring or opens content.
 */
export const CLIPS = {
  /** Closing any file. */
  file: 3,
  /** A campaign file closed for the fourth time and beyond: enough to count, not to farm. */
  wornFile: 1,
  /** The first time a campaign file is closed right. */
  firstSolve: 2,
  /** An S grade. */
  sGrade: 2,
  /** A cold case, on top of the file. */
  cold: 1,
  /** The daily, on top of the file. */
  daily: 2,
  /** The weekly file (everyone's or the holders'), on top of the file. */
  weekly: 3,
  /** Every full thousand points in a rush. */
  rushPerThousand: 1,
  /** Holder allowance: clips per whole coin held, so tier 1 (holderMin) is worth 25. */
  perToken: 25 / Math.max(1, TOKEN.holderMin),
  /** The allowance never grows past this, however large the bag. */
  holderCap: 1000,
} as const;

/** What the wallet's balance is worth at the market right now (0 without a wallet). */
export function holderClips(): number {
  const bal = currentBalance();
  if (!bal || bal <= 0) return 0;
  return Math.min(CLIPS.holderCap, Math.floor(bal * CLIPS.perToken));
}

/** Clips to spend: earned plus the holder allowance, minus everything spent. Never below 0. */
export function clipBalance(): number {
  const { earned, spent } = saveStore.get().clips;
  return Math.max(0, earned + holderClips() - spent);
}

export function earnedClips(): number {
  return saveStore.get().clips.earned;
}

/** Add clips to the earned pile; returns the new balance. */
export function earnClips(n: number): number {
  if (n <= 0) return clipBalance();
  saveStore.update((d) => (d.clips.earned += Math.floor(n)));
  return clipBalance();
}

/** How many clips a closed file is worth, itemised so the report can say so. */
export function clipsForFile(opts: {
  grade: string;
  correct: boolean;
  firstSolve: boolean;
  mode: 'campaign' | 'daily' | 'cold' | 'weekly';
  /** Times this file was closed before tonight (campaign only). */
  completions?: number;
}): { total: number; reasons: string[] } {
  const reasons: string[] = [];
  const worn = opts.mode === 'campaign' && (opts.completions ?? 0) >= 3;
  let total = worn ? CLIPS.wornFile : CLIPS.file;
  reasons.push(worn ? `${CLIPS.wornFile} for a well-worn file` : `${CLIPS.file} for the file`);
  if (opts.correct && opts.firstSolve) {
    total += CLIPS.firstSolve;
    reasons.push(`${CLIPS.firstSolve} first solve`);
  }
  if (opts.grade === 'S') {
    total += CLIPS.sGrade;
    reasons.push(`${CLIPS.sGrade} for the S`);
  }
  if (opts.mode === 'cold') {
    total += CLIPS.cold;
    reasons.push(`${CLIPS.cold} cold`);
  }
  if (opts.mode === 'daily') {
    total += CLIPS.daily;
    reasons.push(`${CLIPS.daily} daily`);
  }
  if (opts.mode === 'weekly') {
    total += CLIPS.weekly;
    reasons.push(`${CLIPS.weekly} weekly`);
  }
  return { total, reasons };
}

export function clipsForRush(score: number): number {
  return Math.floor(Math.max(0, score) / 1000) * CLIPS.rushPerThousand;
}

/**
 * Today's deal: one priced, untiered item, the same for everyone that day. A third off,
 * half off for coin holders (any tier); rounded to fives.
 */
export function dealToday(date = new Date()): { item: ShopItem; price: number; holder: boolean } {
  const pool = SHOP.filter((i) => i.price > 0 && !i.tier);
  const item = makeRng(`deal-${localDateKey(date)}`).pick(pool);
  const holder = currentTier() !== null;
  const cut = holder ? 0.5 : 2 / 3;
  return { item, price: Math.max(5, Math.round((item.price * cut) / 5) * 5), holder };
}

/** What `item` costs right now: its price, or today's deal. */
export function priceOf(item: ShopItem, date = new Date()): number {
  const deal = dealToday(date);
  return deal.item.id === item.id ? deal.price : item.price;
}

export function owns(id: string): boolean {
  const item = SHOP_BY_ID[id];
  return !!item && (item.price === 0 || saveStore.get().owned.includes(id));
}

/** Why an item can't be bought right now, or null when it can. */
export function buyBlocker(item: ShopItem): string | null {
  if (owns(item.id)) return 'owned';
  if (item.tier && (currentTier()?.level ?? 0) < item.tier)
    return `holder tier ${item.tier} (${TOKEN.symbol})`;
  const price = priceOf(item);
  if (clipBalance() < price) return `${price - clipBalance()} more clips`;
  return null;
}

/** Buy and put on. Returns false when it couldn't. */
export function buy(id: string): boolean {
  const item = SHOP_BY_ID[id];
  if (!item || buyBlocker(item)) return false;
  const price = priceOf(item);
  saveStore.update((d) => {
    d.clips.spent += price;
    if (!d.owned.includes(id)) d.owned.push(id);
    d.look[item.style.slot] = id;
  });
  return true;
}

/** Wear or place an owned item (the free default counts as owned). */
export function wear(id: string): boolean {
  const item = SHOP_BY_ID[id];
  if (!item || !owns(id)) return false;
  saveStore.update((d) => (d.look[item.style.slot] = id));
  return true;
}

export function worn(slot: ShopSlot): ShopItem {
  const id = saveStore.get().look[slot];
  return SHOP_BY_ID[id] ?? SHOP_BY_ID[DEFAULT_LOOK[slot]];
}

/** Number of market items owned beyond the free ones (the Collector badge counts these). */
export function boughtCount(): number {
  return saveStore.get().owned.filter((id) => SHOP_BY_ID[id] && SHOP_BY_ID[id].price > 0).length;
}
