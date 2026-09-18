/**
 * The case editor (editor.html): a JSON editor with the game's own schema,
 * templates for each document type, and a bridge into this browser's game
 * through localStorage (custom files show up in NetScope > RugScan).
 */
import { FLAGS, HERRINGS } from '@/data/flags';
import { validateCase } from '@/data/schema';
import { generateCase } from '@/systems/caseGen';
import { readCustomCases, removeCustomCase, saveCustomCase } from '@/systems/customCases';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`editor: missing #${id}`);
  return el as T;
};
const editor = $<HTMLTextAreaElement>('json');
const status = $<HTMLDivElement>('status');

const DOC_TEMPLATES: Record<string, unknown> = {
  contract: {
    type: 'contract',
    title: 'Token.sol',
    content: {
      fileName: 'contracts/Token.sol',
      verified: true,
      lines: [
        '// SPDX-License-Identifier: MIT',
        'pragma solidity 0.8.24;',
        'contract Token is ERC20, Ownable {',
        '  uint256 public constant MAX_SUPPLY = 100_000_000e18;',
        '',
        '  function mint(address to, uint256 amount)',
        '    external onlyOwner {',
        '    _mint(to, amount);',
        '  }',
        '}',
      ],
    },
    clues: [
      {
        id: 'x-mint',
        label: 'Mint with no cap',
        flagId: 'mint-unlimited',
        anchor: { kind: 'line', line: 5 },
      },
    ],
  },
  tokenomics: {
    type: 'tokenomics',
    title: 'Tokenomics',
    content: {
      totalSupply: '100,000,000 TKN',
      allocations: [
        { label: 'Liquidity', pct: 30, vesting: 'locked 2y' },
        { label: 'Community', pct: 50, vesting: 'by vote' },
        { label: 'Team', pct: 15, vesting: '1y cliff+2y' },
        { label: 'Marketing', pct: 5, vesting: '24 months, multisig' },
      ],
      notes: ['Roadmap: ship the app. Nothing else.'],
    },
    clues: [
      {
        id: 'x-marketing',
        label: '5% marketing, vested',
        herring: true,
        herringId: 'small-vested-marketing',
        anchor: { kind: 'row', row: 3 },
      },
    ],
  },
  team: {
    type: 'team',
    title: 'Team',
    content: {
      members: [
        {
          name: 'Ines Okafor',
          role: 'Treasurer',
          bio: 'Runs the books. Publishes monthly minutes.',
          portraitSeed: 'ines-1',
          style: 'normal',
        },
      ],
    },
    clues: [],
  },
  chat: {
    type: 'chat',
    title: 'Telegram: Token Army',
    content: {
      channel: 'token-army',
      messages: [
        { user: 'Admin', role: 'admin', time: '19:02', text: 'presale closes in 10 minutes!!' },
        { user: 'quill', time: '19:05', text: 'where is the lock?' },
      ],
    },
    clues: [
      {
        id: 'x-urgency',
        label: 'Countdown pressure',
        flagId: 'urgency-pressure',
        anchor: { kind: 'message', index: 0 },
      },
    ],
  },
  liquidity: {
    type: 'liquidity',
    title: 'Liquidity & Holders',
    content: {
      pool: 'TKN / USDC',
      liquidityUsd: '$120,000',
      lock: { locked: true, provider: 'LockBox', expires: 'Sep 2028 (2y)', pct: 100 },
      holders: [
        { label: 'Liquidity pool', pct: 30, tag: 'pool' },
        { label: 'Everyone else', pct: 70 },
      ],
      transfers: [],
    },
    clues: [
      {
        id: 'x-lock',
        label: 'Locked two years',
        herring: true,
        herringId: 'liquidity-locked-long',
        anchor: { kind: 'row', row: 0, table: 'lock' },
      },
    ],
  },
  audit: {
    type: 'audit',
    title: 'Audit Report',
    content: {
      auditor: 'Kestrel Security',
      contractName: 'Token.sol (0x123...abc)',
      date: '3 Jun',
      score: 'Pass - 1 medium, 2 low',
      summary: 'Manual review. One medium finding fixed before deployment.',
      findings: ['Fee rounding on dust transfers (medium) - fixed.'],
    },
    clues: [],
  },
};

function fresh(verdict: 'rug' | 'legit'): unknown {
  return {
    id: verdict === 'rug' ? 'my-rug' : 'my-legit',
    title: verdict === 'rug' ? 'The New File' : 'Nothing Happens',
    ticker: '$TKN',
    pitch: 'One line the founders would put on the website.',
    intro: 'What Lucien says when the folder lands on the desk.',
    difficulty: 2,
    verdict,
    timeLimitSec: 240,
    debrief:
      'What the report says after the stamp: what the tells were, or why the scary bits were fine.',
    documents:
      verdict === 'rug'
        ? [DOC_TEMPLATES.contract, DOC_TEMPLATES.liquidity]
        : [DOC_TEMPLATES.tokenomics, DOC_TEMPLATES.liquidity],
  };
}

function setJson(value: unknown): void {
  editor.value = JSON.stringify(value, null, 2);
}

function parse(): unknown | null {
  try {
    return JSON.parse(editor.value);
  } catch (e) {
    report(false, `Not valid JSON: ${(e as Error).message}`);
    return null;
  }
}

function report(ok: boolean, text: string): void {
  status.className = ok ? 'ok' : 'bad';
  status.textContent = text;
}

function validate(): unknown | null {
  const raw = parse();
  if (raw === null) return null;
  const res = validateCase(raw);
  if (!res.ok) {
    report(
      false,
      `${res.errors.length} problem${res.errors.length === 1 ? '' : 's'}:\n- ${res.errors.join('\n- ')}`,
    );
    return null;
  }
  const c = res.case;
  const clues = c.documents.flatMap((d) => d.clues);
  const flags = clues.filter((cl) => 'flagId' in cl).length;
  report(
    true,
    `Valid. ${c.ticker} "${c.title}" · ${c.verdict} · difficulty ${c.difficulty} · ${c.documents.length} docs, ${flags} red flags, ${clues.length - flags} herrings, ${clues.filter((cl) => cl.finePrint).length} fine print.`,
  );
  return raw;
}

function renderSaved(): void {
  const ul = $<HTMLUListElement>('saved');
  ul.innerHTML = '';
  const list = readCustomCases();
  if (list.length === 0) {
    ul.innerHTML = '<li>none yet. Save one and it shows up in NetScope > RugScan.</li>';
    return;
  }
  for (const c of list) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${c.ticker} "${c.title}" · ${c.verdict} · d${c.difficulty}</span>`;
    const load = document.createElement('button');
    load.className = 'paper';
    load.textContent = 'edit';
    load.onclick = () => setJson(c);
    const play = document.createElement('a');
    play.href = `./#custom=${encodeURIComponent(c.id)}`;
    play.textContent = 'play';
    play.style.color = 'var(--ink)';
    const del = document.createElement('button');
    del.className = 'paper';
    del.textContent = 'remove';
    del.onclick = () => {
      removeCustomCase(c.id);
      renderSaved();
    };
    li.append(load, play, del);
    ul.appendChild(li);
  }
}

function renderIds(): void {
  const table = $<HTMLTableElement>('ids');
  const rows: string[] = ['<tr><th>id</th><th>kind</th><th>title</th></tr>'];
  for (const f of Object.values(FLAGS))
    rows.push(
      `<tr><td><code>${f.id}</code></td><td>flag · ${f.severity}</td><td>${f.title}</td></tr>`,
    );
  for (const h of Object.values(HERRINGS))
    rows.push(`<tr><td><code>${h.id}</code></td><td>herring</td><td>${h.title}</td></tr>`);
  table.innerHTML = rows.join('');
}

$('new-rug').onclick = () => setJson(fresh('rug'));
$('new-legit').onclick = () => setJson(fresh('legit'));
$('gen').onclick = () => setJson(generateCase(Math.random().toString(36).slice(2, 8)));
$('add-doc').onclick = () => {
  const raw = parse() as { documents?: unknown[] } | null;
  if (!raw || typeof raw !== 'object') return;
  const type = $<HTMLSelectElement>('doc-type').value;
  raw.documents = [...(raw.documents ?? []), DOC_TEMPLATES[type]];
  setJson(raw);
};
$('format').onclick = () => {
  const raw = parse();
  if (raw !== null) setJson(raw);
};
$('validate').onclick = () => validate();
$('save').onclick = () => {
  const raw = validate();
  if (raw === null) return;
  try {
    saveCustomCase(raw);
    renderSaved();
    report(
      true,
      `${status.textContent}\nSaved. Open the desk, phone > RugScan, and it is in "Your files".`,
    );
  } catch (e) {
    report(false, (e as Error).message);
  }
};
$('download').onclick = () => {
  const raw = validate() as { id?: string } | null;
  if (raw === null) return;
  const blob = new Blob([JSON.stringify(raw, null, 2) + '\n'], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${raw.id ?? 'case'}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};
$<HTMLInputElement>('load').onchange = (ev) => {
  const file = (ev.target as HTMLInputElement).files?.[0];
  if (!file) return;
  void file.text().then((text) => {
    editor.value = text;
    validate();
  });
};

setJson(fresh('rug'));
renderIds();
renderSaved();
