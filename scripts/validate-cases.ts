/**
 * Validate every case file in src/data/cases. Exits non-zero on any error.
 * Usage: npm run validate-cases
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateCase, isFlagClue } from '../src/data/schema';

const dir = join(process.cwd(), 'src', 'data', 'cases');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort();
let failed = 0;

for (const file of files) {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  } catch (e) {
    console.error(`✗ ${file}: invalid JSON (${(e as Error).message})`);
    failed++;
    continue;
  }
  const res = validateCase(raw);
  if (!res.ok) {
    console.error(`✗ ${file}`);
    for (const err of res.errors) console.error(`    ${err}`);
    failed++;
    continue;
  }
  const c = res.case;
  const clues = c.documents.flatMap((d) => d.clues);
  const flags = clues.filter(isFlagClue).length;
  const fine = clues.filter((cl) => cl.finePrint).length;
  console.log(
    `✓ ${file.padEnd(22)} ${c.ticker.padEnd(9)} d${c.difficulty} ${c.verdict.padEnd(5)} ${c.documents.length} docs, ${flags} flags, ${clues.length - flags} herrings, ${fine} fine print`,
  );
}

console.log(failed ? `\n${failed} invalid case file(s).` : `\nAll ${files.length} cases valid.`);
process.exit(failed ? 1 : 0);
