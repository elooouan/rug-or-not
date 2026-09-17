/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TOKEN_NAME?: string;
  readonly VITE_TOKEN_SYMBOL?: string;
  readonly VITE_TOKEN_MINT?: string;
  readonly VITE_SOLANA_RPC?: string;
  readonly VITE_TOKEN_HOLDER_MIN?: string;
  readonly VITE_TOKEN_BUY_URL?: string;
  readonly VITE_LEADERBOARD_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
