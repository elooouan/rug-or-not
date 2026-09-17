import { validateCase, type CaseData } from '@/data/schema';

/** All case JSON files, eagerly bundled by Vite. */
const rawCases = import.meta.glob('../data/cases/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

export interface LoadedCases {
  cases: CaseData[];
  errors: { file: string; errors: string[] }[];
}

/** Validate every bundled case (in file-name order). Invalid ones are reported and skipped, never thrown. */
export function loadCases(): LoadedCases {
  const cases: CaseData[] = [];
  const errors: LoadedCases['errors'] = [];
  const entries = Object.entries(rawCases).sort(([a], [b]) => a.localeCompare(b));
  for (const [file, raw] of entries) {
    const res = validateCase(raw);
    if (res.ok) cases.push(res.case);
    else errors.push({ file, errors: res.errors });
  }
  return { cases, errors };
}

export function reportCaseErrors(loaded: LoadedCases): void {
  for (const e of loaded.errors) {
    console.error(`[rug-or-not] Invalid case file ${e.file}:\n  - ${e.errors.join('\n  - ')}`);
  }
}
