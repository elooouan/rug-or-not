import { SAVE_KEY, SAVE_VERSION, type Grade } from '@/config/gameConfig';
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from './settings';
import { isNameAllowed } from './names';

/** What the last run of a file did, enough to print its report (and second look) again. */
export interface LastRun {
  verdict: 'rug' | 'legit';
  clueIds: string[];
  strayPins: number;
  hintsUsed: number;
  /** Seconds left at the stamp, or null when the file ran without a clock. */
  timeLeftSec: number | null;
  hard: boolean;
}

export interface CaseResult {
  bestScore: number;
  bestGrade: Grade;
  completions: number;
  lastVerdictCorrect: boolean;
  /** Ever stamped the right verdict on this case (rogues gallery, badges). */
  solved?: boolean;
  /** Fastest correct verdict in seconds (timed runs only). */
  bestTimeSec?: number;
  lastRun?: LastRun;
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
  /** Yellow herrings met in closed cases. */
  unlockedHerrings: string[];
  /** How many campaign folders are open (daily plays don't count). */
  campaignUnlocked: number;
  daily: {
    lastPlayed: string | null;
    streak: number;
    bestStreak: number;
    played: string[];
    freezes: number;
  };
  settings: Settings;
  cosmetics: CosmeticSelection;
  /** Unlockable ids the player has been shown a "new unlock" toast for. */
  seenUnlocks: string[];
  /** Lucien dialogue scripts already shown. */
  seenHints: string[];
  /** Desk features (see src/systems/discovery.ts) the player has been told about. */
  discovered: string[];
  /** Arcade-style handle shown on the leaderboard. */
  detectiveName: string;
  /** Last GAME_VERSION this save was opened with (drives the "new tonight" note). */
  lastSeenVersion: string;
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
    /** Office colours tried (see the Decorator badge). */
    themesSeen: string[];
    pagesSeen: string[];
    runs: number;
    correct: number;
    /** How often each red flag was missed / found, for the record and the notebook. */
    flagMisses: Record<string, number>;
    flagHits: Record<string, number>;
    /** Red Flag Rush. */
    rushRuns: number;
    rushBest: number;
    rushBestStreak: number;
    /** Cold cases (generated files). */
    coldRuns: number;
    coldCorrect: number;
    coldBest: number;
    /** Red flags whose drill (five pages in a row) has been completed. */
    drilled: string[];
    /** Yellow herrings hunted to the end (five pages each) in the notebook's hunts. */
    hunted: string[];
    /** Week keys whose weekly cold case has been closed. */
    weeklyDone: string[];
    /** Second looks taken from a report (the Hindsight badge). */
    secondLooks: number;
  };
  /** Last known wallet snapshot (public address + token balance) for holder perks; `linked` asks for a silent reconnect on boot. */
  wallet: {
    address: string | null;
    token: number | null;
    checkedAt: string | null;
    linked: boolean;
  };
}

export const DEFAULT_COSMETICS: CosmeticSelection = {
  desk: 'wood-classic',
  lamp: 'lamp-green',
  rim: 'rim-brass',
  ink: 'ink-classic',
};

/**
 * A brand-new save honours the system's reduced-motion preference; after that it's the
 * player's setting, whatever the OS says.
 */
function firstSave(): SaveData {
  const d = defaultSave();
  try {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches)
      d.settings.reducedMotion = true;
  } catch {
    /* no media queries here */
  }
  return d;
}

export function defaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    totalScore: 0,
    caseResults: {},
    unlockedFlags: [],
    unlockedHerrings: [],
    campaignUnlocked: 1,
    daily: { lastPlayed: null, streak: 0, bestStreak: 0, played: [], freezes: 0 },
    settings: { ...DEFAULT_SETTINGS },
    cosmetics: { ...DEFAULT_COSMETICS },
    seenUnlocks: [],
    seenHints: [],
    discovered: [],
    detectiveName: 'ANON',
    lastSeenVersion: '',
    badges: [],
    stats: {
      sips: 0,
      pets: 0,
      lampClicks: 0,
      legitCorrect: 0,
      cleanStreak: 0,
      weathersSeen: [],
      themesSeen: [],
      pagesSeen: [],
      runs: 0,
      correct: 0,
      flagMisses: {},
      flagHits: {},
      rushRuns: 0,
      rushBest: 0,
      rushBestStreak: 0,
      coldRuns: 0,
      coldCorrect: 0,
      coldBest: 0,
      drilled: [],
      hunted: [],
      secondLooks: 0,
      weeklyDone: [],
    },
    wallet: { address: null, token: null, checkedAt: null, linked: false },
  };
}

const GRADES_OK = new Set(['S', 'A', 'B', 'C', 'D']);

/** Merge unknown JSON onto defaults, dropping anything malformed. Pure. */
/** A stored last run, or undefined when the shape is off. */
function lastRunOf(v: unknown): LastRun | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const r = v as Record<string, unknown>;
  if (r.verdict !== 'rug' && r.verdict !== 'legit') return undefined;
  if (!Array.isArray(r.clueIds)) return undefined;
  const count = (x: unknown) =>
    typeof x === 'number' && Number.isFinite(x) ? Math.max(0, Math.floor(x)) : 0;
  return {
    verdict: r.verdict,
    clueIds: r.clueIds.filter((x): x is string => typeof x === 'string'),
    strayPins: count(r.strayPins),
    hintsUsed: count(r.hintsUsed),
    timeLeftSec:
      typeof r.timeLeftSec === 'number' && Number.isFinite(r.timeLeftSec)
        ? count(r.timeLeftSec)
        : null,
    hard: r.hard === true,
  };
}

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
        solved: cr.solved === true || cr.lastVerdictCorrect === true,
        ...(typeof cr.bestTimeSec === 'number' && Number.isFinite(cr.bestTimeSec)
          ? { bestTimeSec: Math.max(0, Math.floor(cr.bestTimeSec)) }
          : {}),
        ...(lastRunOf(cr.lastRun) ? { lastRun: lastRunOf(cr.lastRun) } : {}),
      };
    }
  }
  if (typeof r.campaignUnlocked === 'number' && Number.isFinite(r.campaignUnlocked)) {
    d.campaignUnlocked = Math.max(1, Math.floor(r.campaignUnlocked));
  }
  if (Array.isArray(r.unlockedHerrings))
    d.unlockedHerrings = r.unlockedHerrings.filter((x): x is string => typeof x === 'string');
  if (Array.isArray(r.unlockedFlags))
    d.unlockedFlags = r.unlockedFlags.filter((x): x is string => typeof x === 'string');
  if (typeof r.detectiveName === 'string' && r.detectiveName.trim())
    d.detectiveName = isNameAllowed(r.detectiveName) ? r.detectiveName.slice(0, 12) : 'ANON';
  if (typeof r.lastSeenVersion === 'string') d.lastSeenVersion = r.lastSeenVersion.slice(0, 16);
  if (Array.isArray(r.badges))
    d.badges = r.badges.filter((x): x is string => typeof x === 'string');
  if (r.stats && typeof r.stats === 'object') {
    const st = r.stats as Record<string, unknown>;
    const num = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
    const strs = (v: unknown) =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    const counts = (v: unknown): Record<string, number> =>
      Object.fromEntries(
        Object.entries((v as Record<string, unknown>) ?? {}).filter(
          (e): e is [string, number] => typeof e[1] === 'number',
        ),
      );
    d.stats = {
      sips: num(st.sips),
      pets: num(st.pets),
      lampClicks: num(st.lampClicks),
      legitCorrect: num(st.legitCorrect),
      cleanStreak: num(st.cleanStreak),
      weathersSeen: strs(st.weathersSeen),
      themesSeen: strs(st.themesSeen),
      pagesSeen: strs(st.pagesSeen),
      runs: num(st.runs),
      correct: num(st.correct),
      flagMisses: counts(st.flagMisses),
      flagHits: counts(st.flagHits),
      rushRuns: num(st.rushRuns),
      rushBest: num(st.rushBest),
      rushBestStreak: num(st.rushBestStreak),
      coldRuns: num(st.coldRuns),
      coldCorrect: num(st.coldCorrect),
      coldBest: num(st.coldBest),
      drilled: strs(st.drilled),
      hunted: strs(st.hunted),
      weeklyDone: strs(st.weeklyDone),
      secondLooks: num(st.secondLooks),
    };
  }
  if (r.wallet && typeof r.wallet === 'object') {
    const w = r.wallet as Record<string, unknown>;
    d.wallet = {
      address: typeof w.address === 'string' ? w.address : null,
      token: typeof w.token === 'number' && Number.isFinite(w.token) ? w.token : null,
      checkedAt: typeof w.checkedAt === 'string' ? w.checkedAt : null,
      linked: w.linked === true,
    };
  }
  if (Array.isArray(r.seenHints))
    d.seenHints = r.seenHints.filter((x): x is string => typeof x === 'string');
  if (Array.isArray(r.discovered))
    d.discovered = r.discovered.filter((x): x is string => typeof x === 'string');
  if (Array.isArray(r.seenUnlocks))
    d.seenUnlocks = r.seenUnlocks.filter((x): x is string => typeof x === 'string');
  if (r.daily && typeof r.daily === 'object') {
    const dd = r.daily as Record<string, unknown>;
    d.daily = {
      lastPlayed: typeof dd.lastPlayed === 'string' ? dd.lastPlayed : null,
      streak: typeof dd.streak === 'number' ? Math.max(0, Math.floor(dd.streak)) : 0,
      bestStreak: typeof dd.bestStreak === 'number' ? Math.max(0, Math.floor(dd.bestStreak)) : 0,
      played: Array.isArray(dd.played)
        ? dd.played.filter((x): x is string => typeof x === 'string').slice(-60)
        : [],
      freezes:
        typeof dd.freezes === 'number' ? Math.max(0, Math.min(2, Math.floor(dd.freezes))) : 0,
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

  /** True when nothing was stored yet: a first visit on this device. */
  fresh = false;

  private load(): SaveData {
    try {
      const raw = this.storage?.getItem(SAVE_KEY);
      if (!raw) {
        this.fresh = true;
        return firstSave();
      }
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

/** Base64 JSON blob of the current save, for moving progress between devices. */
export function exportSave(store: SaveStore): string {
  const json = JSON.stringify(store.get());
  return `RON1:${btoa(unescape(encodeURIComponent(json)))}`;
}

/** Parse an exported blob; returns null when it isn't one. Sanitised like any other save. */
export function importSave(store: SaveStore, blob: string): boolean {
  const m = /^RON1:([A-Za-z0-9+/=]+)$/.exec(blob.trim());
  if (!m) return false;
  try {
    const json = decodeURIComponent(escape(atob(m[1])));
    const data = sanitizeSave(JSON.parse(json));
    store.update((d) => Object.assign(d, data));
    return true;
  } catch {
    return false;
  }
}

/** Game-wide singleton. Scenes read settings/progress from here. */
export const saveStore = new SaveStore();
