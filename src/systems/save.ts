import { SAVE_KEY, SAVE_VERSION, type Grade } from '@/config/gameConfig';
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from './settings';

export interface CaseResult {
  bestScore: number;
  bestGrade: Grade;
  completions: number;
  lastVerdictCorrect: boolean;
}

export interface CosmeticSelection {
  desk: string;
  lamp: string;
  rim: string;
  ink: string;
}

export interface SaveData {
  version: number;
  totalScore: number;
  caseResults: Record<string, CaseResult>;
  /** Flag ids whose notebook entry has been unlocked. */
  unlockedFlags: string[];
  /** How many campaign folders are open (daily plays don't count). */
  campaignUnlocked: number;
  daily: { lastPlayed: string | null; streak: number; bestStreak: number };
  settings: Settings;
  cosmetics: CosmeticSelection;
  /** Unlockable ids the player has been shown a "new unlock" toast for. */
  seenUnlocks: string[];
  /** Lucien dialogue scripts already shown. */
  seenHints: string[];
  /** Arcade-style handle shown on the leaderboard. */
  detectiveName: string;
  /** Earned badge ids (see src/data/badges.ts). */
  badges: string[];
  /** Counters for the sillier badges. */
  stats: {
    sips: number;
    pets: number;
    lampClicks: number;
    legitCorrect: number;
    cleanStreak: number;
    weathersSeen: string[];
    pagesSeen: string[];
  };
  /** Last known wallet snapshot (public address + token balance) for holder perks. */
  wallet: { address: string | null; token: number | null; checkedAt: string | null };
}

export const DEFAULT_COSMETICS: CosmeticSelection = {
  desk: 'wood-classic',
  lamp: 'lamp-green',
  rim: 'rim-brass',
  ink: 'ink-classic',
};

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    totalScore: 0,
    caseResults: {},
    unlockedFlags: [],
    campaignUnlocked: 1,
    daily: { lastPlayed: null, streak: 0, bestStreak: 0 },
    settings: { ...DEFAULT_SETTINGS },
    cosmetics: { ...DEFAULT_COSMETICS },
    seenUnlocks: [],
    seenHints: [],
    detectiveName: 'ANON',
    badges: [],
    stats: {
      sips: 0,
      pets: 0,
      lampClicks: 0,
      legitCorrect: 0,
      cleanStreak: 0,
      weathersSeen: [],
      pagesSeen: [],
    },
    wallet: { address: null, token: null, checkedAt: null },
  };
}

const GRADES_OK = new Set(['S', 'A', 'B', 'C', 'D']);

/** Merge unknown JSON onto defaults, dropping anything malformed. Pure. */
export function sanitizeSave(raw: unknown): SaveData {
  const d = defaultSave();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  if (typeof r.totalScore === 'number' && Number.isFinite(r.totalScore))
    d.totalScore = Math.max(0, r.totalScore);
  if (r.caseResults && typeof r.caseResults === 'object') {
    for (const [id, v] of Object.entries(r.caseResults as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue;
      const cr = v as Record<string, unknown>;
      if (
        typeof cr.bestScore !== 'number' ||
        typeof cr.bestGrade !== 'string' ||
        !GRADES_OK.has(cr.bestGrade)
      )
        continue;
      d.caseResults[id] = {
        bestScore: cr.bestScore,
        bestGrade: cr.bestGrade as Grade,
        completions: typeof cr.completions === 'number' ? cr.completions : 1,
        lastVerdictCorrect: cr.lastVerdictCorrect === true,
      };
    }
  }
  if (typeof r.campaignUnlocked === 'number' && Number.isFinite(r.campaignUnlocked)) {
    d.campaignUnlocked = Math.max(1, Math.floor(r.campaignUnlocked));
  }
  if (Array.isArray(r.unlockedFlags))
    d.unlockedFlags = r.unlockedFlags.filter((x): x is string => typeof x === 'string');
  if (typeof r.detectiveName === 'string' && r.detectiveName.trim())
    d.detectiveName = r.detectiveName.slice(0, 12);
  if (Array.isArray(r.badges))
    d.badges = r.badges.filter((x): x is string => typeof x === 'string');
  if (r.stats && typeof r.stats === 'object') {
    const st = r.stats as Record<string, unknown>;
    const num = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
    const strs = (v: unknown) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    d.stats = {
      sips: num(st.sips),
      pets: num(st.pets),
      lampClicks: num(st.lampClicks),
      legitCorrect: num(st.legitCorrect),
      cleanStreak: num(st.cleanStreak),
      weathersSeen: strs(st.weathersSeen),
      pagesSeen: strs(st.pagesSeen),
    };
  }
  if (r.wallet && typeof r.wallet === 'object') {
    const w = r.wallet as Record<string, unknown>;
    d.wallet = {
      address: typeof w.address === 'string' ? w.address : null,
      token: typeof w.token === 'number' && Number.isFinite(w.token) ? w.token : null,
      checkedAt: typeof w.checkedAt === 'string' ? w.checkedAt : null,
    };
  }
  if (Array.isArray(r.seenHints))
    d.seenHints = r.seenHints.filter((x): x is string => typeof x === 'string');
  if (Array.isArray(r.seenUnlocks))
    d.seenUnlocks = r.seenUnlocks.filter((x): x is string => typeof x === 'string');
  if (r.daily && typeof r.daily === 'object') {
    const dd = r.daily as Record<string, unknown>;
    d.daily = {
      lastPlayed: typeof dd.lastPlayed === 'string' ? dd.lastPlayed : null,
      streak: typeof dd.streak === 'number' ? Math.max(0, Math.floor(dd.streak)) : 0,
      bestStreak: typeof dd.bestStreak === 'number' ? Math.max(0, Math.floor(dd.bestStreak)) : 0,
    };
  }
  d.settings = sanitizeSettings(r.settings);
  if (r.cosmetics && typeof r.cosmetics === 'object') {
    const c = r.cosmetics as Record<string, unknown>;
    for (const k of Object.keys(d.cosmetics) as (keyof CosmeticSelection)[]) {
      if (typeof c[k] === 'string') d.cosmetics[k] = c[k] as string;
    }
  }
  return d;
}

/** Thin localStorage wrapper. Every call is guarded; failures fall back to defaults. */
export class SaveStore {
  private data: SaveData;
  private listeners = new Set<(d: SaveData) => void>();

  constructor(
    private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null = safeStorage(),
  ) {
    this.data = this.load();
  }

  get(): SaveData {
    return this.data;
  }

  update(fn: (d: SaveData) => void): SaveData {
    fn(this.data);
    this.persist();
    this.listeners.forEach((l) => l(this.data));
    return this.data;
  }

  onChange(fn: (d: SaveData) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  reset(): void {
    this.data = defaultSave();
    try {
      this.storage?.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
    this.listeners.forEach((l) => l(this.data));
  }

  private load(): SaveData {
    try {
      const raw = this.storage?.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      return sanitizeSave(JSON.parse(raw));
    } catch {
      return defaultSave();
    }
  }

  private persist(): void {
    try {
      this.storage?.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      /* quota / private mode: keep running in memory */
    }
  }
}

function safeStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const k = '__rug_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    return null;
  }
}

/** Game-wide singleton. Scenes read settings/progress from here. */
export const saveStore = new SaveStore();
