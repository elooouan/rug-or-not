import type { ScriptId } from '@/data/dialogue';
import { saveStore } from './save';

/** Short once-only bubbles keyed like scripts (e.g. `tip-doc-audit`). */
export type TipId = `tip-${string}`;

/** Once-only guidance, tracked in the save. */
export function hintsEnabled(): boolean {
  return saveStore.get().settings.hints;
}

export function hintSeen(id: ScriptId | TipId): boolean {
  return saveStore.get().seenHints.includes(id);
}

/** True (and marks it seen) the first time a hint is requested; false afterwards or when hints are off. */
export function claimHint(id: ScriptId | TipId): boolean {
  if (!hintsEnabled() || hintSeen(id)) return false;
  saveStore.update((d) => d.seenHints.push(id));
  return true;
}

/** Give a claim back (the box it was for never opened). */
export function unclaimHint(id: ScriptId | TipId): void {
  saveStore.update((d) => (d.seenHints = d.seenHints.filter((h) => h !== id)));
}

export function resetHints(): void {
  saveStore.update((d) => (d.seenHints = []));
}
