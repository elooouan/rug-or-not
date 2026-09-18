import { validateCase, type CaseData } from '@/data/schema';

/**
 * Custom files written in the editor (editor.html) live in this browser's
 * localStorage. They are validated on the way in and out, never trusted.
 */
export const CUSTOM_KEY = 'rug-or-not:custom-cases:v1';

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function readCustomCases(): CaseData[] {
  try {
    const raw = storage()?.getItem(CUSTOM_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown[]) : [];
    if (!Array.isArray(arr)) return [];
    const out: CaseData[] = [];
    for (const item of arr) {
      const res = validateCase(item);
      if (res.ok && !out.some((c) => c.id === res.case.id)) out.push(res.case);
    }
    return out;
  } catch {
    return [];
  }
}

/** Add or replace (by id). Returns the stored list. */
export function saveCustomCase(raw: unknown): CaseData[] {
  const res = validateCase(raw);
  if (!res.ok) throw new Error(res.errors.join('\n'));
  const list = readCustomCases().filter((c) => c.id !== res.case.id);
  list.push(res.case);
  storage()?.setItem(CUSTOM_KEY, JSON.stringify(list));
  return list;
}

export function removeCustomCase(id: string): CaseData[] {
  const list = readCustomCases().filter((c) => c.id !== id);
  storage()?.setItem(CUSTOM_KEY, JSON.stringify(list));
  return list;
}
