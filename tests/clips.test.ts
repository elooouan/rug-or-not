import { beforeEach, describe, expect, it } from 'vitest';
import { TOKEN } from '@/config/token';
import { DEFAULT_LOOK, SHOP, SHOP_BY_ID, SHOP_SLOTS, itemsFor } from '@/data/shop';
import {
  boughtCount,
  buy,
  buyBlocker,
  CLIPS,
  clipBalance,
  clipsForFile,
  clipsForRush,
  dealToday,
  earnClips,
  holderClips,
  owns,
  priceOf,
  wear,
  worn,
} from '@/systems/clips';
import { saveStore, sanitizeSave } from '@/systems/save';
import { badgeProgress } from '@/systems/badges';

const TOTALS = { cases: 16, rugs: 10, pages: 10, flags: 18, weathers: 5 };

const setBalance = (n: number | null) =>
  saveStore.update((d) => {
    d.wallet.token = n;
    d.wallet.checkedAt = n === null ? null : '2026-01-01';
  });

describe('the market catalogue', () => {
  it('has one free item per slot, and every look default is free', () => {
    for (const slot of SHOP_SLOTS) {
      const free = itemsFor(slot.id).filter((i) => i.price === 0);
      expect(free.length, slot.id).toBe(1);
      expect(SHOP_BY_ID[DEFAULT_LOOK[slot.id]].price).toBe(0);
      expect(SHOP_BY_ID[DEFAULT_LOOK[slot.id]].style.slot).toBe(slot.id);
    }
  });
  it('has unique ids and prices a determined detective can reach', () => {
    expect(new Set(SHOP.map((i) => i.id)).size).toBe(SHOP.length);
    for (const i of SHOP) expect(i.price).toBeLessThanOrEqual(CLIPS.holderCap);
  });
});

describe('clips', () => {
  beforeEach(() => saveStore.reset());

  it('pay a little per file, more for firsts, S grades and the odd modes', () => {
    expect(
      clipsForFile({ grade: 'B', correct: false, firstSolve: false, mode: 'campaign' }),
    ).toEqual({ total: CLIPS.file, reasons: [`${CLIPS.file} for the file`] });
    const first = clipsForFile({ grade: 'S', correct: true, firstSolve: true, mode: 'campaign' });
    expect(first.total).toBe(CLIPS.file + CLIPS.firstSolve + CLIPS.sGrade);
    expect(first.reasons).toHaveLength(3);
    // A first solve only counts when the call was right.
    expect(
      clipsForFile({ grade: 'S', correct: false, firstSolve: true, mode: 'campaign' }).total,
    ).toBe(CLIPS.file + CLIPS.sGrade);
    expect(clipsForFile({ grade: 'C', correct: true, firstSolve: false, mode: 'cold' }).total).toBe(
      CLIPS.file + CLIPS.cold,
    );
    expect(
      clipsForFile({ grade: 'C', correct: true, firstSolve: false, mode: 'daily' }).total,
    ).toBe(CLIPS.file + CLIPS.daily);
    expect(clipsForRush(0)).toBe(0);
    expect(clipsForRush(999)).toBe(0);
    expect(clipsForRush(3450)).toBe(3 * CLIPS.rushPerThousand);
  });

  it('puts one untiered item on sale a day, the same for everyone', () => {
    const d1 = new Date(2026, 8, 19);
    const a = dealToday(d1);
    expect(a).toEqual(dealToday(new Date(2026, 8, 19, 23, 59)));
    expect(a.item.price).toBeGreaterThan(0);
    expect(a.item.tier).toBeUndefined();
    expect(a.price).toBeLessThan(a.item.price);
    expect(a.price % 5).toBe(0);
    // Over a month the deal moves around.
    const ids = new Set<string>();
    for (let day = 1; day <= 30; day++) ids.add(dealToday(new Date(2026, 9, day)).item.id);
    expect(ids.size).toBeGreaterThan(5);
    // Buying at the deal price spends the deal price.
    earnClips(a.price);
    expect(priceOf(a.item, d1)).toBe(a.price);
    expect(buyBlocker(a.item)).toBe(
      priceOf(a.item) === a.price ? null : `${a.item.price - a.price} more clips`,
    );
  });

  it('are earned, spent, and never go negative', () => {
    expect(clipBalance()).toBe(0);
    expect(earnClips(10)).toBe(10);
    expect(earnClips(-5)).toBe(10);
    expect(earnClips(2.9)).toBe(12);
    saveStore.update((d) => (d.clips.spent = 50));
    expect(clipBalance()).toBe(0);
  });

  it('holding the coin adds an allowance, capped, read from the saved balance', () => {
    expect(holderClips()).toBe(0);
    setBalance(TOKEN.holderMin);
    expect(holderClips()).toBe(25);
    expect(clipBalance()).toBe(25);
    setBalance(TOKEN.holderMin * 1000);
    expect(holderClips()).toBe(CLIPS.holderCap);
    setBalance(-3);
    expect(holderClips()).toBe(0);
  });

  it('buys, wears, and refuses what it should', () => {
    const navy = SHOP_BY_ID['coat-navy'];
    expect(owns('coat-tan')).toBe(true); // the free coat
    expect(owns('coat-navy')).toBe(false);
    expect(buyBlocker(navy)).toBe(`${navy.price} more clips`);
    expect(buy('coat-navy')).toBe(false);
    earnClips(navy.price);
    expect(buyBlocker(navy)).toBeNull();
    expect(buy('coat-navy')).toBe(true);
    expect(clipBalance()).toBe(0);
    expect(worn('coat').id).toBe('coat-navy');
    expect(buyBlocker(navy)).toBe('owned');
    expect(buy('coat-navy')).toBe(false); // not twice
    expect(boughtCount()).toBe(1);
    // Back to the free coat, then the bought one again; never something unowned.
    expect(wear('coat-tan')).toBe(true);
    expect(worn('coat').id).toBe('coat-tan');
    expect(wear('coat-navy')).toBe(true);
    expect(wear('coat-oxblood')).toBe(false);
    expect(wear('nope')).toBe(false);
    expect(worn('coat').id).toBe('coat-navy');
  });

  it('counts bought things for the Collector badge, free ones excluded', () => {
    earnClips(2000);
    expect(badgeProgress('collector', TOTALS)).toEqual({ n: 0, of: 5 });
    for (const id of ['coat-navy', 'hat-black', 'mug-ink', 'cat-soot']) expect(buy(id)).toBe(true);
    wear('coat-tan');
    expect(badgeProgress('collector', TOTALS)).toEqual({ n: 4, of: 5 });
    expect(buy('orn-plant')).toBe(true);
    expect(badgeProgress('collector', TOTALS)).toEqual({ n: 5, of: 5 });
  });

  it('keeps tiered items behind the holder tier even with the clips', () => {
    const gold = SHOP_BY_ID['hat-gold'];
    earnClips(1000);
    expect(buyBlocker(gold)).toMatch(/holder tier 1/);
    expect(buy('hat-gold')).toBe(false);
    setBalance(TOKEN.holderMin);
    expect(buyBlocker(gold)).toBeNull();
    expect(buy('hat-gold')).toBe(true);
    // The bobblehead wants tier 2.
    expect(buyBlocker(SHOP_BY_ID['orn-bobble'])).toMatch(/holder tier 2/);
    setBalance(TOKEN.holderMin * 5);
    expect(buy('orn-bobble')).toBe(true);
    expect(worn('ornament').id).toBe('orn-bobble');
  });

  it('survives the save sanitiser only when owned and of the right slot', () => {
    const s = sanitizeSave({
      clips: { earned: 40, spent: -3 },
      owned: ['coat-navy', 'made-up', 7],
      look: { coat: 'coat-navy', hat: 'coat-navy', mug: 'mug-red', cat: 'cat-biscuit', junk: 'x' },
    });
    expect(s.clips).toEqual({ earned: 40, spent: 0 });
    expect(s.owned).toEqual(['coat-navy']);
    expect(s.look.coat).toBe('coat-navy');
    expect(s.look.hat).toBe(DEFAULT_LOOK.hat); // wrong slot
    expect(s.look.mug).toBe(DEFAULT_LOOK.mug); // not owned
    expect(s.look.cat).toBe('cat-biscuit');
    expect(Object.keys(s.look).sort()).toEqual(Object.keys(DEFAULT_LOOK).sort());
  });
});
