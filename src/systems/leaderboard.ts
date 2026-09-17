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
}

export interface LeaderboardProvider {
  readonly kind: 'local' | 'remote';
  list(limit?: number): Promise<ScoreEntry[]>;
  submit(entry: ScoreEntry): Promise<void>;
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
    .map((e) => ({ ...e, name: e.name.slice(0, 12) }));
}

/** Highest score first, then most recent. */
export function rankEntries(entries: ScoreEntry[], limit = 10): ScoreEntry[] {
  return [...entries]
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

  async list(limit = 10): Promise<ScoreEntry[]> {
    return rankEntries(this.read(), limit);
  }

  async submit(entry: ScoreEntry): Promise<void> {
    const all = rankEntries([...this.read(), entry], MAX_ENTRIES);
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

  async list(limit = 10): Promise<ScoreEntry[]> {
    try {
      const res = await fetch(`${this.url}?limit=${limit}`);
      if (!res.ok) throw new Error(String(res.status));
      return rankEntries(sanitizeEntries(await res.json()), limit);
    } catch {
      return this.fallback.list(limit);
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
