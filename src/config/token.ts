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
  /** Which Solana network the RPC (and the token) live on; the coin page checks the RPC matches. */
  cluster: (import.meta.env.VITE_SOLANA_CLUSTER ?? 'mainnet-beta') as Cluster,
  /** Minimum balance (in whole tokens) for the first holder tier; tiers 2 and 3 are 5x and 10x. */
  holderMin: Number(import.meta.env.VITE_TOKEN_HOLDER_MIN ?? 1000),
  /**
   * Development only: pretend the player holds this many tokens so perks can be tried
   * without a wallet or a launched mint. Ignored in production builds.
   */
  mockBalance: import.meta.env.DEV ? Number(import.meta.env.VITE_TOKEN_MOCK_BALANCE ?? 0) : 0,
  /** Where "Get $TOKEN" sends people (opens in a new tab). Empty = button hidden. */
  buyUrl: import.meta.env.VITE_TOKEN_BUY_URL ?? '',
  /** Optional remote leaderboard endpoint (see src/systems/leaderboard.ts). */
  leaderboardUrl: import.meta.env.VITE_LEADERBOARD_URL ?? '',
  /** Optional price feed for the coin page (see src/systems/price.ts). */
  priceUrl: import.meta.env.VITE_TOKEN_PRICE_URL ?? '',
} as const;

export type Cluster = 'mainnet-beta' | 'devnet' | 'testnet';

/** Genesis hashes, so a misconfigured RPC (devnet vs mainnet) is reported instead of guessed at. */
export const GENESIS_HASH: Record<Cluster, string> = {
  'mainnet-beta': '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
  devnet: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
  testnet: '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY',
};

export function shortAddress(addr: string): string {
  return addr.length > 10 ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : addr;
}
