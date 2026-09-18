import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GENESIS_HASH, TOKEN } from '@/config/token';
import { WalletService } from '@/systems/wallet';
import { saveStore } from '@/systems/save';

/** A stand-in for Phantom's injected provider: connect resolves or rejects, events are recorded. */
function fakeProvider(opts: { reject?: unknown } = {}) {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  const provider = {
    isPhantom: true,
    publicKey: null as { toString(): string } | null,
    connect: vi.fn(async (o?: { onlyIfTrusted?: boolean }) => {
      if (opts.reject) throw opts.reject;
      const key = {
        toString: () => (o?.onlyIfTrusted ? 'TRUSTEDKEY000000000000' : 'FRESHKEY00000000000000'),
      };
      provider.publicKey = key;
      return { publicKey: key };
    }),
    disconnect: vi.fn(async () => {
      provider.publicKey = null;
    }),
    on: (ev: string, fn: (...args: unknown[]) => void) => (handlers[ev] ??= []).push(fn),
    emit: (ev: string, ...args: unknown[]) => handlers[ev]?.forEach((h) => h(...args)),
  };
  return provider;
}

function rpcStub(genesis = GENESIS_HASH[TOKEN.cluster], lamports = 2_500_000_000) {
  return vi.fn(async (_url: string, init?: RequestInit) => {
    const { method } = JSON.parse(String(init?.body)) as { method: string };
    const result =
      method === 'getBalance'
        ? { value: lamports }
        : method === 'getGenesisHash'
          ? genesis
          : { value: [] };
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }));
  });
}

describe('wallet service', () => {
  beforeEach(() => {
    saveStore.reset();
    vi.stubGlobal('fetch', rpcStub());
  });
  afterEach(() => vi.unstubAllGlobals());

  function install(provider: ReturnType<typeof fakeProvider> | null) {
    vi.stubGlobal('window', {
      phantom: provider ? { solana: provider } : undefined,
      addEventListener: () => undefined,
    });
    return new WalletService();
  }

  it('connects, reads the balance and remembers the link', async () => {
    const p = fakeProvider();
    const w = install(p);
    expect(w.state.available).toBe(true);
    await w.connect();
    expect(p.connect).toHaveBeenCalledWith(undefined);
    expect(w.state).toMatchObject({
      connected: true,
      address: 'FRESHKEY00000000000000',
      sol: 2.5,
      error: null,
    });
    expect(w.state.token).toBeNull(); // no mint configured
    const saved = saveStore.get().wallet;
    expect(saved.linked).toBe(true);
    expect(saved.address).toBe('FRESHKEY00000000000000');
  });

  it('says so plainly when the player cancels in the wallet', async () => {
    const w = install(
      fakeProvider({ reject: { code: 4001, message: 'User rejected the request.' } }),
    );
    await w.connect();
    expect(w.state.connected).toBe(false);
    expect(w.state.error).toMatch(/cancelled/i);
    expect(saveStore.get().wallet.linked).toBe(false);
  });

  it('explains when no wallet is installed', async () => {
    const w = install(null);
    expect(w.state.available).toBe(false);
    await w.connect();
    expect(w.state.error).toMatch(/Phantom/);
  });

  it('only reconnects silently for a wallet linked before', async () => {
    const p = fakeProvider();
    const w = install(p);
    await w.reconnect();
    expect(p.connect).not.toHaveBeenCalled();

    saveStore.update((d) => (d.wallet.linked = true));
    await w.reconnect();
    expect(p.connect).toHaveBeenCalledWith({ onlyIfTrusted: true });
    expect(w.state.address).toBe('TRUSTEDKEY000000000000');
  });

  it('forgets the link when a silent reconnect is refused, without an error', async () => {
    saveStore.update((d) => (d.wallet.linked = true));
    const w = install(fakeProvider({ reject: { code: 4001 } }));
    await w.reconnect();
    expect(w.state.connected).toBe(false);
    expect(w.state.error).toBeNull();
    expect(saveStore.get().wallet.linked).toBe(false);
  });

  it('follows the wallet: account switches re-read, disconnects clear', async () => {
    const p = fakeProvider();
    const w = install(p);
    await w.connect();
    p.emit('accountChanged', { toString: () => 'OTHERKEY00000000000000' });
    await vi.waitFor(() => expect(w.state.sol).toBe(2.5));
    expect(w.state.address).toBe('OTHERKEY00000000000000');

    p.emit('disconnect');
    expect(w.state.connected).toBe(false);
    // The wallet dropped us, but the site is still approved: next boot may reconnect.
    expect(saveStore.get().wallet.linked).toBe(true);

    await w.connect();
    await w.disconnect();
    expect(p.disconnect).toHaveBeenCalled();
    expect(saveStore.get().wallet.linked).toBe(false);
  });

  it('throttles the refresh button but not account switches', async () => {
    const stub = rpcStub();
    vi.stubGlobal('fetch', stub);
    const p = fakeProvider();
    const w = install(p);
    await w.connect();
    const afterConnect = stub.mock.calls.length;
    await w.refresh(true);
    expect(stub.mock.calls.length).toBe(afterConnect); // too soon after the connect's read
    p.emit('accountChanged', { toString: () => 'OTHERKEY00000000000000' });
    await vi.waitFor(() => expect(stub.mock.calls.length).toBeGreaterThan(afterConnect));
  });

  it('warns when the RPC is on another network', async () => {
    vi.stubGlobal('fetch', rpcStub(GENESIS_HASH.devnet));
    const w = install(fakeProvider());
    await w.connect();
    expect(w.state.networkWarning).toMatch(new RegExp(TOKEN.cluster));
    expect(w.state.sol).toBe(2.5); // balances still read; the warning is advisory
  });

  it('reports RPC trouble instead of pretending', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 429 })),
    );
    const w = install(fakeProvider());
    await w.connect();
    expect(w.state.connected).toBe(true);
    expect(w.state.error).toMatch(/Balance lookup failed/);
  });
});
