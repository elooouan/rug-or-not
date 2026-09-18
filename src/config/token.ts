/**
 * The game's own coin and the optional services around it. Everything is
 * configured through Vite env vars so the repo never hard-codes a live mint.
 * Nothing here moves funds: the game only reads public balances.
 */
export const TOKEN = {
  name: import.meta.env.VITE_TOKEN_NAME ?? 'Detective Coin',
  symbol: import.meta.env.VITE_TOKEN_SYMBOL ?? '$LUCIEN',
  /** SPL token mint address. Empty = not launched yet (the coin page says so). */
  mint: import.meta.env.VITE_TOKEN_MINT ?? '',
  rpcUrl: import.meta.env.VITE_SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com',
  /** Minimum balance (in whole tokens) for the holder cosmetics. */
  holderMin: Number(import.meta.env.VITE_TOKEN_HOLDER_MIN ?? 1000),
  /** Where "Get $TOKEN" sends people (opens in a new tab). Empty = button hidden. */
  buyUrl: import.meta.env.VITE_TOKEN_BUY_URL ?? '',
  /** Optional remote leaderboard endpoint (see src/systems/leaderboard.ts). */
  leaderboardUrl: import.meta.env.VITE_LEADERBOARD_URL ?? '',
  /** Optional price feed for the coin page (see src/systems/price.ts). */
  priceUrl: import.meta.env.VITE_TOKEN_PRICE_URL ?? '',
} as const;

export function shortAddress(addr: string): string {
  return addr.length > 10 ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : addr;
}
