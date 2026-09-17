import { TOKEN } from '@/config/token';

/**
 * Phantom wallet integration, read-only. Connecting shares the public key;
 * balances come from public RPC calls. The game never requests signatures
 * or transactions.
 */
export interface WalletState {
  available: boolean;
  connected: boolean;
  address: string | null;
  sol: number | null;
  token: number | null;
  busy: boolean;
  error: string | null;
}

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toString(): string } | null;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
}

type Listener = (s: WalletState) => void;

function getProvider(): PhantomProvider | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    phantom?: { solana?: PhantomProvider };
    solana?: PhantomProvider;
  };
  const p = w.phantom?.solana ?? w.solana;
  return p?.isPhantom ? p : null;
}

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

export class WalletService {
  state: WalletState = {
    available: false,
    connected: false,
    address: null,
    sol: null,
    token: null,
    busy: false,
    error: null,
  };
  private listeners = new Set<Listener>();

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

  async connect(): Promise<void> {
    const p = getProvider();
    if (!p) {
      this.set({ available: false, error: 'Phantom not found. Install the extension and reload.' });
      return;
    }
    this.set({ busy: true, error: null });
    try {
      const res = await p.connect();
      const address = res.publicKey.toString();
      this.set({ connected: true, address, busy: false });
      p.on?.('disconnect', () =>
        this.set({ connected: false, address: null, sol: null, token: null }),
      );
      await this.refresh();
    } catch (e) {
      this.set({ busy: false, error: (e as Error).message || 'Connection rejected.' });
    }
  }

  async disconnect(): Promise<void> {
    try {
      await getProvider()?.disconnect();
    } catch {
      /* already gone */
    }
    this.set({ connected: false, address: null, sol: null, token: null, error: null });
  }

  /** Read SOL and (if a mint is configured) token balance. Public data only. */
  async refresh(): Promise<void> {
    const address = this.state.address;
    if (!address) return;
    this.set({ busy: true, error: null });
    try {
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
    } catch (e) {
      this.set({ busy: false, error: `Balance lookup failed: ${(e as Error).message}` });
    }
  }

  get isHolder(): boolean {
    return (this.state.token ?? 0) >= TOKEN.holderMin;
  }
}

export const wallet = new WalletService();
