/**
 * Renders assets/marketing/QUEUE.md from queue.json and checks the queue: every media file
 * exists, no tweet runs past 280 characters (links count as 23).
 *
 *   node scripts/queue.mjs            # write QUEUE.md, print problems
 *   node scripts/queue.mjs --check    # problems only (exit 1 if any)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DIR = resolve('assets/marketing');
const queue = JSON.parse(readFileSync(resolve(DIR, 'queue.json'), 'utf8'));
const checkOnly = process.argv.includes('--check');
const problems = [];

/** X counts every URL as 23 characters. */
const tweetLength = (text) => text.replace(/\{PLAY_URL\}|https?:\/\/\S+/g, 'x'.repeat(23)).length;

const fmt = (d) =>
  new Date(d).toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const lines = [
  '# Tweet queue',
  '',
  'Rendered from `queue.json` (edit that, then `node scripts/queue.mjs`). Times are Paris.',
  '`{PLAY_URL}` becomes the game link; media lives in this folder.',
  '',
];

function render(item, when) {
  lines.push(`## ${when}  ·  \`${item.id}\`${item.pin ? '  ·  pin' : ''}`);
  if (item.note) lines.push('', `_${item.note}_`);
  item.tweets.forEach((t, i) => {
    const n = tweetLength(t.text);
    if (n > 280) problems.push(`${item.id}[${i}]: ${n} characters`);
    const media = Array.isArray(t.media) ? t.media : t.media ? [t.media] : [];
    for (const m of media)
      if (!existsSync(resolve(DIR, m))) problems.push(`${item.id}: missing media ${m}`);
    if (media.length && !t.alt) problems.push(`${item.id}[${i}]: media without alt text`);
    lines.push(
      '',
      item.tweets.length > 1 ? `**${i + 1}/${item.tweets.length}** (${n})` : `(${n})`,
      '',
    );
    lines.push(...t.text.split('\n').map((l) => `> ${l}`));
    if (media.length) lines.push('', `media: ${media.join(', ')}`);
  });
  lines.push('');
}

const items = [...queue.items].sort((a, b) => a.when.localeCompare(b.when));
for (const item of items) render(item, fmt(item.when));
lines.push('# Drafts (unscheduled)', '');
for (const d of queue.drafts) render(d, 'when you say so');

if (!checkOnly) writeFileSync(resolve(DIR, 'QUEUE.md'), lines.join('\n'));
for (const p of problems) console.log('problem:', p);
console.log(
  `${items.length} scheduled, ${queue.drafts.length} drafts${problems.length ? '' : ', all clean'}`,
);
if (checkOnly && problems.length) process.exit(1);
