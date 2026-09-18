import { TOKEN } from '@/config/token';
import { timeoutSignal } from './wallet';

/**
 * Read-only price lookup for the coin page. Understands a plain `{ price }`,
 * Jupiter's `{ data: { <mint>: { price } } }` and DexScreener's
 * `{ pairs: [{ priceUsd }] }`. Never throws; null means "no price".
 */
export function pickPrice(json: unknown, mint: string): number | null {
  if (!json || typeof json !== 'object') return null;
  const j = json as Record<string, unknown>;
  const num = (v: unknown): number | null => {
    const n = typeof v === 'string' ? Number(v) : v;
    return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
  };
  if (j.price !== undefined) return num(j.price);
  const data = j.data as Record<string, { price?: unknown }> | undefined;
  if (data && mint && data[mint]) return num(data[mint].price);
  const pairs = j.pairs as { priceUsd?: unknown }[] | undefined;
  if (Array.isArray(pairs) && pairs[0]) return num(pairs[0].priceUsd);
  return null;
}

/** "$0.0042" style, with enough decimals for small coins. */
export function formatPrice(p: number): string {
  if (p >= 1) return `$${p.toFixed(2)}`;
  if (p >= 0.01) return `$${p.toFixed(4)}`;
  return `$${p.toPrecision(3)}`;
}

let cached: { at: number; price: number | null } | null = null;

export async function fetchPrice(): Promise<number | null> {
  if (!TOKEN.priceUrl) return null;
  if (cached && Date.now() - cached.at < 60_000) return cached.price;
  try {
    const res = await fetch(TOKEN.priceUrl, { signal: timeoutSignal(8_000) });
    if (!res.ok) throw new Error(String(res.status));
    const price = pickPrice(await res.json(), TOKEN.mint);
    cached = { at: Date.now(), price };
    return price;
  } catch {
    cached = { at: Date.now(), price: null };
    return null;
  }
}
