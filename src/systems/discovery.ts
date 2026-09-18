import { saveStore, type SaveData } from './save';

/**
 * The desk opens up a piece at a time. A fresh save sees the folder, the daily,
 * the notebook and settings; the drawer, the rush, the pile and the weekly turn
 * up after a few closed files, each with a word from Lucien the first time. Deep
 * links (a shared rush or cold case) skip the gate: someone sent you that.
 */
export type Feature = 'drawer' | 'rush' | 'cold' | 'weekly';

export interface FeatureInfo {
  id: Feature;
  /** Distinct closed files (cold cases count) before it shows up. */
  after: number;
  /** Toast title and Lucien's line when it does. */
  title: string;
  blurb: string;
}

export const FEATURES: FeatureInfo[] = [
  {
    id: 'drawer',
    after: 1,
    title: 'CASE FILES',
    blurb: "The drawer's open. Every closed file can be reopened for a better grade.",
  },
  {
    id: 'rush',
    after: 2,
    title: 'RED FLAG RUSH',
    blurb:
      'New on the desk: Red Flag Rush. Sixty seconds, one page at a time. Click the red flag, skip the herrings.',
  },
  {
    id: 'cold',
    after: 3,
    title: 'COLD CASES',
    blurb:
      "The printer's warmed up. Cold cases: files it makes up on the spot, and they never run out.",
  },
  {
    id: 'weekly',
    after: 4,
    title: 'THE WEEKLY',
    blurb:
      'A WEEKLY folder is in the drawer: one cold case, the same for everyone this week, with its own top five.',
  },
];

/** Distinct files closed (campaign, daily, custom) plus cold cases run. */
export function closedFiles(save: SaveData = saveStore.get()): number {
  return Object.keys(save.caseResults).length + save.stats.coldRuns;
}

export function unlocked(f: Feature, save: SaveData = saveStore.get()): boolean {
  const info = FEATURES.find((x) => x.id === f);
  return !info || closedFiles(save) >= info.after;
}

/** The next unlocked feature Lucien hasn't mentioned yet, in desk order. */
export function pendingDiscovery(save: SaveData = saveStore.get()): FeatureInfo | null {
  return FEATURES.find((f) => unlocked(f.id, save) && !save.discovered.includes(f.id)) ?? null;
}

export function markDiscovered(f: Feature): void {
  saveStore.update((d) => {
    if (!d.discovered.includes(f)) d.discovered.push(f);
  });
}

/**
 * Saves from before the desk opened gradually already know everything that's
 * unlocked; don't walk a veteran through the drawer.
 */
export function syncDiscovery(): void {
  const save = saveStore.get();
  if (save.discovered.length > 0) return;
  const last = FEATURES[FEATURES.length - 1];
  if (closedFiles(save) >= last.after)
    saveStore.update((d) => (d.discovered = FEATURES.map((f) => f.id)));
}
