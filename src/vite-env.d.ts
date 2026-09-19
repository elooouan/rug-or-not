/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TOKEN_NAME?: string;
  readonly VITE_TOKEN_SYMBOL?: string;
  readonly VITE_TOKEN_MINT?: string;
  readonly VITE_SOLANA_RPC?: string;
  readonly VITE_TOKEN_HOLDER_MIN?: string;
  readonly VITE_TOKEN_BUY_URL?: string;
  readonly VITE_LEADERBOARD_URL?: string;
  readonly VITE_TOKEN_PRICE_URL?: string;
  readonly VITE_SOLANA_CLUSTER?: string;
  readonly VITE_TOKEN_MOCK_BALANCE?: string;
  readonly VITE_GOATCOUNTER?: string;
  readonly VITE_X_HANDLE?: string;
  readonly VITE_COMMUNITY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
