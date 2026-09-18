import { describe, expect, it } from 'vitest';
import { formatPrice, pickPrice } from '@/systems/price';

describe('price feed parsing', () => {
  it('understands the common shapes and rejects junk', () => {
    expect(pickPrice({ price: 0.5 }, 'm')).toBe(0.5);
    expect(pickPrice({ price: '0.25' }, 'm')).toBe(0.25);
    expect(pickPrice({ data: { m: { price: 3 } } }, 'm')).toBe(3);
    expect(pickPrice({ pairs: [{ priceUsd: '0.0042' }] }, 'm')).toBe(0.0042);
    expect(pickPrice({ price: -1 }, 'm')).toBeNull();
    expect(pickPrice({ nope: 1 }, 'm')).toBeNull();
    expect(pickPrice('text', 'm')).toBeNull();
  });
  it('formats small and large prices readably', () => {
    expect(formatPrice(12.3456)).toBe('$12.35');
    expect(formatPrice(0.05)).toBe('$0.0500');
    expect(formatPrice(0.00042)).toBe('$0.000420');
  });
});
