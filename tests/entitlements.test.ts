import { beforeEach, describe, expect, it } from 'vitest';
import { TOKEN } from '@/config/token';
import {
  entitlementsFor,
  tierFor,
  TIERS,
  currentBalance,
  hasEntitlement,
} from '@/systems/entitlements';
import { describeWalletError } from '@/systems/wallet';
import { saveStore } from '@/systems/save';

describe('token entitlements', () => {
  beforeEach(() => saveStore.reset());

  it('tiers stack and start at the configured minimum', () => {
    const min = TOKEN.holderMin;
    expect(tierFor(0)).toBeNull();
    expect(tierFor(min - 1)).toBeNull();
    expect(tierFor(min)?.level).toBe(1);
    expect(tierFor(min * 5)?.level).toBe(2);
    expect(tierFor(min * 10)?.level).toBe(3);
    expect(entitlementsFor(null).size).toBe(0);
    expect([...entitlementsFor(min)]).toEqual(TIERS[0].grants);
    const all = entitlementsFor(min * 10);
    for (const t of TIERS) for (const g of t.grants) expect(all.has(g)).toBe(true);
  });

  it('reads the saved snapshot when no wallet is connected', () => {
    expect(hasEntitlement('holders-file')).toBe(false);
    saveStore.update((d) => (d.wallet.token = TOKEN.holderMin));
    expect(currentBalance()).toBe(TOKEN.holderMin);
    expect(hasEntitlement('holders-file')).toBe(true);
    expect(hasEntitlement('board-title')).toBe(false);
  });
});

describe('wallet errors', () => {
  it('turns wallet errors into plain sentences', () => {
    expect(describeWalletError({ code: 4001, message: 'User rejected the request.' })).toMatch(
      /cancelled/i,
    );
    expect(describeWalletError(new Error('Wallet is locked'))).toMatch(/locked/i);
    expect(describeWalletError(undefined)).toMatch(/did not answer/i);
  });
});
