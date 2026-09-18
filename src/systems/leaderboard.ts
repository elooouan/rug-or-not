import type { Grade } from '@/config/gameConfig';
import { TOKEN } from '@/config/token';

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
}

export type BoardMode = 'case' | 'rush';

export interface LeaderboardProvider {
  readonly kind: 'local' | 'remote';
  list(limit?: number, mode?: BoardMode): Promise<ScoreEntry[]>;
  submit(entry: ScoreEntry): Promise<void>;
}

export function modeOf(e: ScoreEntry): BoardMode {
  return e.mode === 'rush' ? 'rush' : 'case';
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
      mode: e.mode === 'rush' ? ('rush' as const) : undefined,
    }));
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

  async list(limit = 10, mode: BoardMode = 'case'): Promise<ScoreEntry[]> {
    return rankEntries(this.read(), limit, mode);
  }

  async submit(entry: ScoreEntry): Promise<void> {
    // Each board keeps its own top MAX_ENTRIES so rush scores can't crowd out case runs.
    const merged = [...this.read(), entry];
    const all = [
      ...rankEntries(merged, MAX_ENTRIES, 'case'),
      ...rankEntries(merged, MAX_ENTRIES, 'rush'),
    ];
    try {
      this.storage?.setItem(BOARD_KEY, JSON.stringify(all));
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

  async list(limit = 10, mode: BoardMode = 'case'): Promise<ScoreEntry[]> {
    try {
      const res = await fetch(`${this.url}?limit=${limit}&mode=${mode}`);
      if (!res.ok) throw new Error(String(res.status));
      return rankEntries(sanitizeEntries(await res.json()), limit, mode);
    } catch {
      return this.fallback.list(limit, mode);
    }
  }

  async submit(entry: ScoreEntry): Promise<void> {
    await this.fallback.submit(entry);
    try {
      await fetch(this.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(entry),
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
