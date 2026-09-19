import type { Grade } from '@/config/gameConfig';
import { TOKEN } from '@/config/token';
import { holderClips } from './clips';
import { currentBalance } from './entitlements';
import { rankForScore } from './ranks';
import { saveStore } from './save';
import { holderPerks, timeoutSignal, wallet } from './wallet';

export interface ScoreEntry {
  name: string;
  score: number;
  caseId: string;
  grade: Grade;
  /** ISO date. */
  date: string;
  wallet?: string;
  /** Detective's honour run. */
  hard?: boolean;
  /** Which board the run belongs on; missing means a case run. */
  mode?: BoardMode;
  /** Held the coin when the run was posted. */
  holder?: boolean;
}

export type BoardMode = 'case' | 'rush' | 'cold';

/**
 * One row per desk on the detectives board: the career, not a run. Posted again after
 * every file (an upsert by id), so the row follows the save rather than piling up.
 */
export interface DeskEntry {
  /** A random handle made once per save (see `deskId`). */
  id: string;
  name: string;
  /** Career score: the sum of best runs per case. */
  total: number;
  rank: string;
  /** Paper clips earned over the whole career, holder allowance included. */
  clips: number;
  /** Coin balance the wallet reported, when there is one. */
  token?: number;
  solved: number;
  badges: number;
  wallet?: string;
  holder?: boolean;
  /** ISO date of the last post. */
  date: string;
}

export type DeskSort = 'total' | 'clips';

export interface LeaderboardProvider {
  readonly kind: 'local' | 'remote';
  /** Top entries of a board; `caseId` narrows it to one file (the weekly, a case). */
  list(limit?: number, mode?: BoardMode, caseId?: string): Promise<ScoreEntry[]>;
  submit(entry: ScoreEntry): Promise<void>;
  /** The detectives board, richest career first (by score, or by clips). */
  desks(limit?: number, sort?: DeskSort): Promise<DeskEntry[]>;
  upsertDesk(entry: DeskEntry): Promise<void>;
}

export function modeOf(e: ScoreEntry): BoardMode {
  return e.mode === 'rush' || e.mode === 'cold' ? e.mode : 'case';
}

const BOARD_KEY = 'rug-or-not:board:v1';
const MAX_ENTRIES = 50;

export function sanitizeEntries(raw: unknown): ScoreEntry[] {
  if (!Array.isArray(raw)) return [];
  const grades = new Set(['S', 'A', 'B', 'C', 'D']);
  return raw
    .filter((e): e is ScoreEntry => {
      if (!e || typeof e !== 'object') return false;
      const r = e as Record<string, unknown>;
      return (
        typeof r.name === 'string' &&
        typeof r.score === 'number' &&
        Number.isFinite(r.score) &&
        typeof r.caseId === 'string' &&
        grades.has(String(r.grade)) &&
        typeof r.date === 'string'
      );
    })
    .map((e) => ({
      ...e,
      name: e.name.slice(0, 12),
      mode: e.mode === 'rush' || e.mode === 'cold' ? e.mode : undefined,
      holder: e.holder === true ? true : undefined,
    }));
}

const DESKS_KEY = 'rug-or-not:desks:v1';
const MAX_DESKS = 200;

const num = (v: unknown, max: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.min(max, Math.round(v)) : null;

export function sanitizeDesks(raw: unknown): DeskEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: DeskEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== 'object') continue;
    const r = e as Record<string, unknown>;
    const total = num(r.total, 1_000_000);
    const clips = num(r.clips, 1_000_000);
    if (
      typeof r.id !== 'string' ||
      !/^[a-f0-9]{16}$/.test(r.id) ||
      typeof r.name !== 'string' ||
      total === null ||
      clips === null ||
      typeof r.date !== 'string'
    )
      continue;
    const token = num(r.token, 1e12);
    out.push({
      id: r.id,
      name: r.name.slice(0, 12),
      total,
      rank: typeof r.rank === 'string' ? r.rank.slice(0, 16) : '',
      clips,
      ...(token ? { token } : {}),
      solved: num(r.solved, 999) ?? 0,
      badges: num(r.badges, 999) ?? 0,
      ...(typeof r.wallet === 'string' ? { wallet: r.wallet.slice(0, 44) } : {}),
      ...(r.holder === true ? { holder: true } : {}),
      date: r.date,
    });
  }
  return out;
}

/** Richest desk first by the chosen column, then by the other, then most recent. */
export function rankDesks(entries: DeskEntry[], limit = 10, sort: DeskSort = 'total'): DeskEntry[] {
  const other: DeskSort = sort === 'total' ? 'clips' : 'total';
  return [...entries]
    .sort((a, b) => b[sort] - a[sort] || b[other] - a[other] || b.date.localeCompare(a.date))
    .slice(0, limit);
}

/** One row per id: the newest post wins. */
export function upsertDesks(entries: DeskEntry[], entry: DeskEntry, keep = MAX_DESKS): DeskEntry[] {
  const merged = [...entries.filter((e) => e.id !== entry.id), entry];
  return rankDesks(merged, keep, 'total');
}

/** Highest score first, then most recent. `mode` keeps the boards apart. */
export function rankEntries(entries: ScoreEntry[], limit = 10, mode?: BoardMode): ScoreEntry[] {
  return [...entries]
    .filter((e) => !mode || modeOf(e) === mode)
    .sort((a, b) => b.score - a.score || b.date.localeCompare(a.date))
    .slice(0, limit);
}

/** Runs live in localStorage, separate from the save so a reset keeps the board. */
export class LocalLeaderboard implements LeaderboardProvider {
  readonly kind = 'local' as const;
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeStorage()) {}

  private read(): ScoreEntry[] {
    try {
      const raw = this.storage?.getItem(BOARD_KEY);
      return raw ? sanitizeEntries(JSON.parse(raw)) : [];
    } catch {
      return [];
    }
  }

  async list(limit = 10, mode: BoardMode = 'case', caseId?: string): Promise<ScoreEntry[]> {
    const pool = caseId ? this.read().filter((e) => e.caseId === caseId) : this.read();
    return rankEntries(pool, limit, mode);
  }

  /** The last runs on this device, newest first, every mode together. */
  recent(limit = 8): ScoreEntry[] {
    return [...this.read()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  }

  async submit(entry: ScoreEntry): Promise<void> {
    // Each board keeps its own top MAX_ENTRIES so rush scores can't crowd out case runs.
    const merged = [...this.read(), entry];
    const all = [
      ...rankEntries(merged, MAX_ENTRIES, 'case'),
      ...rankEntries(merged, MAX_ENTRIES, 'rush'),
      ...rankEntries(merged, MAX_ENTRIES, 'cold'),
    ];
    try {
      this.storage?.setItem(BOARD_KEY, JSON.stringify(all));
    } catch {
      /* quota / private mode */
    }
  }

  private readDesks(): DeskEntry[] {
    try {
      const raw = this.storage?.getItem(DESKS_KEY);
      return raw ? sanitizeDesks(JSON.parse(raw)) : [];
    } catch {
      return [];
    }
  }

  /** On one device this is a board of one, unless a save was imported from elsewhere. */
  async desks(limit = 10, sort: DeskSort = 'total'): Promise<DeskEntry[]> {
    return rankDesks(this.readDesks(), limit, sort);
  }

  async upsertDesk(entry: DeskEntry): Promise<void> {
    try {
      this.storage?.setItem(DESKS_KEY, JSON.stringify(upsertDesks(this.readDesks(), entry)));
    } catch {
      /* quota / private mode */
    }
  }
}

/** Thin JSON client: GET `${url}?limit=N` -> ScoreEntry[], POST `${url}` with one entry. */
export class RemoteLeaderboard implements LeaderboardProvider {
  readonly kind = 'remote' as const;
  private fallback = new LocalLeaderboard();
  constructor(private url: string) {}

  async list(limit = 10, mode: BoardMode = 'case', caseId?: string): Promise<ScoreEntry[]> {
    try {
      const q = `?limit=${limit}&mode=${mode}${caseId ? `&caseId=${encodeURIComponent(caseId)}` : ''}`;
      const res = await fetch(`${this.url}${q}`, { signal: timeoutSignal(8_000) });
      if (!res.ok) throw new Error(String(res.status));
      const entries = sanitizeEntries(await res.json());
      // Older servers ignore the filter; apply it here too.
      return rankEntries(
        caseId ? entries.filter((e) => e.caseId === caseId) : entries,
        limit,
        mode,
      );
    } catch {
      return this.fallback.list(limit, mode, caseId);
    }
  }

  async submit(entry: ScoreEntry): Promise<void> {
    await this.fallback.submit(entry);
    try {
      await fetch(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(entry),
        signal: timeoutSignal(8_000),
      });
    } catch {
      /* offline: the local copy keeps it */
    }
  }

  async desks(limit = 10, sort: DeskSort = 'total'): Promise<DeskEntry[]> {
    try {
      const res = await fetch(`${this.url}?board=desks&limit=${limit}&sort=${sort}`, {
        signal: timeoutSignal(8_000),
      });
      if (!res.ok) throw new Error(String(res.status));
      return rankDesks(sanitizeDesks(await res.json()), limit, sort);
    } catch {
      return this.fallback.desks(limit, sort);
    }
  }

  async upsertDesk(entry: DeskEntry): Promise<void> {
    await this.fallback.upsertDesk(entry);
    try {
      await fetch(`${this.url}?board=desks`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(entry),
        signal: timeoutSignal(8_000),
      });
    } catch {
      /* offline: the local copy keeps it */
    }
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export const leaderboard: LeaderboardProvider = TOKEN.leaderboardUrl
  ? new RemoteLeaderboard(TOKEN.leaderboardUrl)
  : new LocalLeaderboard();

/** This device's own log of recent runs, whatever the board is. */
export function recentRuns(limit = 8): ScoreEntry[] {
  return new LocalLeaderboard().recent(limit);
}

/** The save's handle on the detectives board, minted on first use. */
export function deskId(): string {
  let id = saveStore.get().id;
  if (!id) {
    const bytes = new Uint8Array(8);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    id = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
    saveStore.update((d) => (d.id = id));
  }
  return id;
}

/** This desk as the board should see it right now. */
export function currentDesk(): DeskEntry {
  const s = saveStore.get();
  const token = Math.round(currentBalance());
  return {
    id: deskId(),
    name: s.detectiveName,
    total: s.totalScore,
    rank: rankForScore(s.totalScore),
    clips: s.clips.earned + holderClips(),
    ...(token > 0 ? { token } : {}),
    solved: Object.values(s.caseResults).filter((r) => r.solved).length,
    badges: s.badges.length,
    ...(wallet.state.address ? { wallet: wallet.state.address } : {}),
    ...(holderPerks() ? { holder: true } : {}),
    date: new Date().toISOString(),
  };
}

let lastPost = 0;

/** Put this desk's row on the board; `throttleMs` skips a repeat within that window. */
export function postDesk(throttleMs = 0): Promise<void> {
  const now = Date.now();
  if (throttleMs && now - lastPost < throttleMs) return Promise.resolve();
  lastPost = now;
  return leaderboard.upsertDesk(currentDesk());
}
