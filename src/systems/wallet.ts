import { GENESIS_HASH, TOKEN } from '@/config/token';
import { saveStore } from './save';

/**
 * Wallet connection, read-only. Connecting shares the public key; balances come
 * from public RPC calls against the configured cluster. The game never requests
 * signatures or transactions, and never sees a seed phrase or private key.
 *
 * Phantom's injected provider (`window.phantom.solana`) is the documented
 * integration surface; other injected Solana wallets with the same shape
 * (Solflare, Backpack) work identically. Reconnection uses Phantom's
 * `connect({ onlyIfTrusted: true })`, which is silent when the site has been
 * approved before and rejects without a popup otherwise.
 */
export interface WalletState {
  available: boolean;
  connected: boolean;
  address: string | null;
  sol: number | null;
  token: number | null;
  busy: boolean;
  /** A short, human message: rejected connection, RPC trouble, wrong network. */
  error: string | null;
  /** Set when the RPC's genesis hash doesn't match TOKEN.cluster. */
  networkWarning: string | null;
}

interface SolanaProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  publicKey?: { toString(): string } | null;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  off?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

type Listener = (s: WalletState) => void;

function getProvider(): SolanaProvider | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    phantom?: { solana?: SolanaProvider };
    solflare?: SolanaProvider;
    backpack?: SolanaProvider;
    solana?: SolanaProvider;
  };
  const p = w.phantom?.solana ?? w.solflare ?? w.backpack ?? w.solana;
  return p && typeof p.connect === 'function' ? p : null;
}

/** What to call the injected wallet in the UI. */
export function walletName(): string {
  const p = getProvider();
  if (!p) return 'Phantom';
  if (p.isPhantom) return 'Phantom';
  if (p.isSolflare) return 'Solflare';
  if (p.isBackpack) return 'Backpack';
  return 'wallet';
}

/** Where to get a wallet when none is installed. */
export const PHANTOM_URL = 'https://phantom.app/download';

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(TOKEN.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`rpc ${res.status}`);
  const json = (await res.json()) as { result?: T; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result as T;
}

/** Wallet errors as a player would read them. */
export function describeWalletError(e: unknown): string {
  const err = e as { code?: number; message?: string } | undefined;
  const msg = (err?.message ?? '').toLowerCase();
  if (err?.code === 4001 || msg.includes('user rejected') || msg.includes('rejected the request'))
    return 'Connection cancelled in the wallet. Nothing was shared.';
  if (err?.code === -32002 || msg.includes('already pending'))
    return 'The wallet is already asking. Check its window.';
  if (msg.includes('locked')) return 'The wallet is locked. Unlock it and try again.';
  return err?.message ? `Wallet said: ${err.message}` : 'The wallet did not answer.';
}

export class WalletService {
  state: WalletState = {
    available: false,
    connected: false,
    address: null,
    sol: null,
    token: null,
    busy: false,
    error: null,
    networkWarning: null,
  };
  private listeners = new Set<Listener>();
  private bound: SolanaProvider | null = null;
  private genesisChecked = false;

  constructor() {
    this.state.available = getProvider() !== null;
    // Phantom injects late on some pages; re-check once the window has loaded.
    if (typeof window !== 'undefined')
      window.addEventListener('load', () => this.set({ available: getProvider() !== null }));
  }

  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(patch: Partial<WalletState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l(this.state));
  }

  /** The wallet asked for approval; the site is now trusted, so later visits reconnect silently. */
  async connect(): Promise<void> {
    const p = getProvider();
    if (!p) {
      this.set({
        available: false,
        error: 'No Solana wallet found. Install Phantom and reload this page.',
      });
      return;
    }
    await this.link(p, false);
  }

  /**
   * Silent reconnect on boot for a wallet the player linked before. Never opens a
   * popup: `onlyIfTrusted` rejects quietly when the site is no longer approved.
   */
  async reconnect(): Promise<void> {
    if (!saveStore.get().wallet.linked) return;
    const p = getProvider();
    if (!p) return;
    await this.link(p, true);
  }

  private async link(p: SolanaProvider, onlyIfTrusted: boolean): Promise<void> {
    // A provider that injected after the load check is still a provider.
    this.set({ available: true, busy: true, error: null });
    try {
      const res = await p.connect(onlyIfTrusted ? { onlyIfTrusted: true } : undefined);
      const address = res.publicKey.toString();
      this.bind(p);
      this.set({ connected: true, address, busy: false });
      saveStore.update((d) => (d.wallet.linked = true));
      await this.refresh();
    } catch (e) {
      // A silent attempt that isn't trusted any more just means "not linked"; say nothing.
      this.set({ busy: false, error: onlyIfTrusted ? null : describeWalletError(e) });
      if (onlyIfTrusted) saveStore.update((d) => (d.wallet.linked = false));
    }
  }

  /** Follow the wallet: a switched account re-reads balances, a disconnect clears us. */
  private bind(p: SolanaProvider): void {
    if (this.bound === p) return;
    this.bound = p;
    p.on?.('disconnect', () => this.clear(false));
    p.on?.('accountChanged', (...args: unknown[]) => {
      const key = args[0] as { toString(): string } | null | undefined;
      if (key) {
        this.set({ address: key.toString(), sol: null, token: null });
        void this.refresh();
      } else {
        // Phantom switched to an account this site isn't approved for: try a silent reconnect.
        void this.link(p, true);
      }
    });
  }

  async disconnect(): Promise<void> {
    try {
      await getProvider()?.disconnect();
    } catch {
      /* already gone */
    }
    this.clear(true);
  }

  private clear(forget: boolean): void {
    this.set({ connected: false, address: null, sol: null, token: null, error: null });
    if (forget) saveStore.update((d) => (d.wallet.linked = false));
  }

  private lastRefresh = 0;

  /**
   * Read SOL and (if a mint is configured) token balance. Public data only. A `manual`
   * refresh (the button) is throttled so a nervous clicker doesn't get the public RPC to
   * rate-limit them; account switches and connects always read.
   */
  async refresh(manual = false): Promise<void> {
    const address = this.state.address;
    if (!address) return;
    if (manual && (this.state.busy || Date.now() - this.lastRefresh < 3000)) return;
    this.lastRefresh = Date.now();
    this.set({ busy: true, error: null });
    try {
      await this.checkNetwork();
      const lamports = await rpc<{ value: number }>('getBalance', [address]);
      let token: number | null = null;
      if (TOKEN.mint) {
        const accounts = await rpc<{
          value: {
            account: { data: { parsed: { info: { tokenAmount: { uiAmount: number | null } } } } };
          }[];
        }>('getTokenAccountsByOwner', [address, { mint: TOKEN.mint }, { encoding: 'jsonParsed' }]);
        token = accounts.value.reduce(
          (sum, a) => sum + (a.account.data.parsed.info.tokenAmount.uiAmount ?? 0),
          0,
        );
      }
      this.set({ sol: lamports.value / 1e9, token, busy: false });
      // Remember the snapshot so perks survive reloads without a live connection.
      saveStore.update(
        (d) => (d.wallet = { ...d.wallet, address, token, checkedAt: new Date().toISOString() }),
      );
    } catch (e) {
      this.set({ busy: false, error: `Balance lookup failed: ${(e as Error).message}` });
    }
  }

  /** Once per session: is the RPC on the cluster the token is configured for? */
  private async checkNetwork(): Promise<void> {
    if (this.genesisChecked) return;
    this.genesisChecked = true;
    try {
      const hash = await rpc<string>('getGenesisHash', []);
      const expected = GENESIS_HASH[TOKEN.cluster];
      this.set({
        networkWarning:
          hash === expected
            ? null
            : `The RPC answers for a different network than ${TOKEN.cluster}; balances here may not be the coin's.`,
      });
    } catch {
      /* the balance calls will report the RPC trouble */
    }
  }

  get isHolder(): boolean {
    return (this.state.token ?? 0) >= TOKEN.holderMin;
  }
}

export const wallet = new WalletService();

/**
 * Holder perks (aurora, the mark on the board) use the last balance the coin
 * page saw, so they survive reloads without a live wallet connection.
 * Kept as a thin alias over the entitlement layer for the existing call sites.
 */
export function holderPerks(): boolean {
  if (wallet.isHolder) return true;
  const saved = saveStore.get().wallet.token ?? 0;
  return saved >= TOKEN.holderMin || TOKEN.mockBalance >= TOKEN.holderMin;
}
