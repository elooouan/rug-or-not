import type { CaseData, CaseDocument, Clue } from '@/data/schema';
import { makeRng, type Rng } from './rng';

/**
 * Cold cases: procedurally generated files. Deterministic from a seed, so a
 * seed is a shareable case. Every generated case passes the same schema and
 * validation as the handcrafted ones (see tests/caseGen.test.ts).
 */

const ADJ = [
  'Quantum',
  'Golden',
  'Lunar',
  'Velvet',
  'Iron',
  'Neon',
  'Maple',
  'Turbo',
  'Silent',
  'Amber',
  'Crystal',
  'Cosmic',
  'Pocket',
  'Rocket',
  'Honey',
  'Frost',
  'Ember',
  'Copper',
  'Pixel',
  'Marble',
];
const NOUN = [
  'Otter',
  'Ledger',
  'Beacon',
  'Pepper',
  'Falcon',
  'Lantern',
  'Walrus',
  'Compass',
  'Orchard',
  'Comet',
  'Badger',
  'Anchor',
  'Meadow',
  'Signal',
  'Biscuit',
  'Kettle',
  'Nomad',
  'Cactus',
  'Prism',
  'Harvest',
];
const PROMISES = [
  'real yield from real receipts',
  'the community-owned rewards layer',
  'a token for people who read',
  'settlement for the night market',
  'points that pay the stall fund',
  'the coin with a roadmap and a spreadsheet',
  'cross-chain, cross-town, cross-your-heart',
  'rewards for showing up',
];
const TRAITS = [
  'Audited.',
  'Renounced.',
  'Doxxed team.',
  'Locked liquidity.',
  'No presale.',
  'Fair launch.',
  'Fixed supply.',
  'Community first.',
];
const FIRST = [
  'Mara',
  'Tobias',
  'Ines',
  'Kofi',
  'Lena',
  'Ravi',
  'Sofia',
  'Jonah',
  'Priya',
  'Elias',
  'Nadia',
  'Yusuf',
  'Greta',
  'Mateo',
  'Hana',
  'Olu',
];
const LAST = [
  'Okafor',
  'Lindqvist',
  'Tanaka',
  'Duarte',
  'Berg',
  'Adeyemi',
  'Novak',
  'Costa',
  'Brecht',
  'Iqbal',
  'Reyes',
  'Halvorsen',
  'Mensah',
  'Vidal',
  'Sato',
  'Kowalski',
];
const HANDLES = [
  'salty_pete',
  'ledger_lucy',
  'cold_read',
  'quill',
  'ferryman',
  'dumpling_dan',
  'forkbender',
  'grumpy_ghost',
  'dockworker_9',
  'pin_cushion',
  'moonboi_77',
  'nightshift',
  'teapot',
  'graph_paper',
];
const MEME_HANDLES = ['Captain Noodle', 'Sir Pancake', 'Duchess Waffle', 'Admiral Toast'];
const JOKES = [
  'if this token is a harbour, I am the harbourmaster of my bathtub',
  'I only hold this so I can say I am invested in {noun}s',
  'my dog just sneezed on my keyboard, that is a buy signal',
  'put my whole lunch budget in. living on crackers now',
];
const QUESTIONS = [
  'who can change the fee and what is the cap?',
  'is the lock held by the team wallet or a contract?',
  'renounced is a word. what does the operator do?',
  'why did three wallets get the same amount in the same block?',
];
const AUDITORS_REAL = ['Kestrel Security', 'Ashgrove Audits', 'Lantern & Vale'];
const AUDITORS_FAKE = ['ChainSure Labs', 'SafuScan', 'BlockCert 24/7'];

export type GenVerdict = 'rug' | 'legit';

interface Names {
  name: string;
  noun: string;
  ticker: string;
  other: string;
  otherTicker: string;
}

function ticker(adj: string, noun: string): string {
  const raw = (adj.slice(0, 2) + noun.slice(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `$${raw.padEnd(3, 'X').slice(0, 8)}`;
}

function names(rng: Rng): Names {
  const adj = rng.pick(ADJ);
  const noun = rng.pick(NOUN);
  let adj2 = rng.pick(ADJ);
  let noun2 = rng.pick(NOUN);
  while (adj2 === adj) adj2 = rng.pick(ADJ);
  while (noun2 === noun) noun2 = rng.pick(NOUN);
  return {
    name: `${adj} ${noun}`,
    noun: noun.toLowerCase(),
    ticker: ticker(adj, noun),
    other: `${adj2} ${noun2}`,
    otherTicker: ticker(adj2, noun2),
  };
}

/** Clue-bearing choices the generator can make, by document. */
type ContractFlag =
  | 'mint-unlimited'
  | 'sell-tax-adjustable'
  | 'honeypot'
  | 'blacklist'
  | 'fake-renounce'
  | 'unverified-contract';
type ContractHerring =
  'small-fixed-tax' | 'renounced-cleanly' | 'immutable-supply-note' | 'timelocked-admin';
const CONTRACT_FLAGS: ContractFlag[] = [
  'mint-unlimited',
  'sell-tax-adjustable',
  'honeypot',
  'blacklist',
  'fake-renounce',
  'unverified-contract',
];
const CONTRACT_HERRINGS: ContractHerring[] = [
  'small-fixed-tax',
  'renounced-cleanly',
  'immutable-supply-note',
  'timelocked-admin',
];

export interface GenOptions {
  verdict?: GenVerdict;
  difficulty?: number;
}

interface Plan {
  verdict: GenVerdict;
  difficulty: number;
  /** How many red flags to plant (rug only). */
  flags: number;
  /** Share of planted flags that hide in fine print. */
  fineChance: number;
  herrings: number;
}

function plan(rng: Rng, opts: GenOptions): Plan {
  const verdict: GenVerdict = opts.verdict ?? (rng.chance(0.6) ? 'rug' : 'legit');
  const difficulty = opts.difficulty ?? rng.int(1, 5);
  const flags =
    verdict === 'legit'
      ? 0
      : difficulty <= 2
        ? rng.int(3, 4)
        : difficulty === 3
          ? rng.int(2, 3)
          : rng.int(1, 2);
  const fineChance = difficulty <= 2 ? 0.15 : difficulty === 3 ? 0.4 : 0.75;
  const herrings =
    verdict === 'legit' ? rng.int(3, 6) : difficulty <= 2 ? rng.int(1, 2) : rng.int(2, 4);
  return { verdict, difficulty, flags, fineChance, herrings };
}

/** Loosely typed while building; the schema validates the result (see tests). */
interface ClueDraft {
  id: string;
  label: string;
  finePrint: boolean;
  text?: string;
  anchor: Clue['anchor'];
  flagId?: string;
  herring?: true;
  herringId?: string;
}

function flagClue(
  id: string,
  label: string,
  flagId: string,
  anchor: Clue['anchor'],
  fine?: string,
): ClueDraft {
  return fine
    ? { id, label: label.slice(0, 22), flagId, finePrint: true, text: fine, anchor }
    : { id, label: label.slice(0, 22), flagId, finePrint: false, anchor };
}

function herringClue(
  id: string,
  label: string,
  herringId: string,
  anchor: Clue['anchor'],
): ClueDraft {
  return { id, label: label.slice(0, 22), herring: true, herringId, finePrint: false, anchor };
}

/** Pull `n` distinct items, in random order. */
function take<T>(rng: Rng, pool: readonly T[], n: number): T[] {
  const arr = [...pool];
  const out: T[] = [];
  while (arr.length && out.length < n)
    out.push(arr.splice(Math.floor(rng.next() * arr.length), 1)[0]);
  return out;
}

// ---- documents --------------------------------------------------------------------

function contractDoc(
  rng: Rng,
  nm: Names,
  flags: ContractFlag[],
  herrings: ContractHerring[],
  fine: (id: string) => boolean,
): CaseDocument {
  const cname = `${nm.name.replace(/\s/g, '')}Token`;
  const clues: ClueDraft[] = [];
  if (flags.includes('unverified-contract')) {
    const lines = ['// source not verified. bytecode only.'];
    for (let i = 0; i < 6; i++) {
      let hex = '0x';
      for (let k = 0; k < 40; k++) hex += '0123456789abcdef'[rng.int(0, 15)];
      lines.push(hex);
    }
    clues.push(
      flagClue(
        'g-unverified',
        'Source not verified',
        'unverified-contract',
        { kind: 'row', row: 0, table: 'header' },
        fine('unverified-contract')
          ? 'deployed 3 days ago; verification "pending" ever since'
          : undefined,
      ),
    );
    return {
      type: 'contract',
      title: `${cname}.sol`,
      content: { fileName: `contracts/${cname}.sol`, verified: false, lines },
      clues: clues as unknown as Clue[],
    };
  }
  const lines: string[] = [];
  const push = (l: string): number => {
    lines.push(l);
    return lines.length - 1;
  };
  const renouncedCleanly = herrings.includes('renounced-cleanly');
  const fakeRenounce = flags.includes('fake-renounce');
  const timelock = herrings.includes('timelocked-admin');
  const ownable = !renouncedCleanly && !timelock;
  push('// SPDX-License-Identifier: MIT');
  push('pragma solidity 0.8.24;');
  push(`contract ${cname} is ERC20${ownable ? ', Ownable' : ''} {`);
  const supplyLine = push(`  uint256 public constant MAX_SUPPLY = ${rng.int(10, 900)}_000_000e18;`);
  if (herrings.includes('immutable-supply-note'))
    clues.push(
      herringClue('g-supply', 'Hard cap, minted once', 'immutable-supply-note', {
        kind: 'line',
        line: supplyLine,
      }),
    );
  if (timelock) {
    const l = push('  address public immutable timelock; // 48h public queue');
    clues.push(
      herringClue('g-timelock', 'Admin behind timelock', 'timelocked-admin', {
        kind: 'line',
        line: l,
      }),
    );
  }
  if (herrings.includes('small-fixed-tax')) {
    const pct = rng.int(1, 3);
    const l = push(`  uint256 public constant TAX_BPS = ${pct * 100}; // ${pct}%, fixed`);
    clues.push(
      herringClue('g-fixedtax', `${pct}% tax, constant`, 'small-fixed-tax', {
        kind: 'line',
        line: l,
      }),
    );
  }
  if (flags.includes('sell-tax-adjustable')) {
    push(`  uint256 public sellTaxBps = ${rng.int(2, 5) * 100};`);
    const l = push('  function setSellTax(uint256 bps) external onlyOwner { sellTaxBps = bps; }');
    clues.push(
      flagClue(
        'g-selltax',
        'Sell tax has no cap',
        'sell-tax-adjustable',
        { kind: 'line', line: l },
        fine('sell-tax-adjustable') ? '// no upper bound. 10_000 bps is 100%.' : undefined,
      ),
    );
  }
  if (flags.includes('blacklist')) {
    push('  mapping(address => bool) public flagged; // anti-bot');
    const l = push(
      '  function setFlagged(address a, bool b) external onlyOwner { flagged[a] = b; }',
    );
    clues.push(
      flagClue(
        'g-blacklist',
        "'Anti-bot' blacklist",
        'blacklist',
        { kind: 'line', line: l },
        fine('blacklist') ? '// flagged wallets cannot transfer. ever. any wallet.' : undefined,
      ),
    );
  }
  const honeypot = flags.includes('honeypot');
  if (honeypot) {
    push('  address public pool;');
    push('  mapping(address => bool) public canSell;');
  }
  if (fakeRenounce) {
    push('  address public operator;');
  }
  push('');
  push(`  constructor() ERC20("${nm.name}", "${nm.ticker.slice(1)}") {`);
  push('    _mint(msg.sender, MAX_SUPPLY);');
  if (fakeRenounce) {
    push('    operator = msg.sender;');
    const l = push('    renounceOwnership();');
    clues.push(
      flagClue(
        'g-renounce',
        'Renounced, operator stays',
        'fake-renounce',
        { kind: 'line', line: l },
        fine('fake-renounce') ? '// operator keeps every power the owner had' : undefined,
      ),
    );
  }
  if (renouncedCleanly) {
    const l = push('    // no owner, no operator, no proxy. what you see is what runs.');
    clues.push(
      herringClue('g-clean', 'No owner, no operator', 'renounced-cleanly', {
        kind: 'line',
        line: l,
      }),
    );
  }
  push('  }');
  if (flags.includes('mint-unlimited')) {
    push('');
    const l = push(
      `  function mint(address to, uint256 amount) external ${fakeRenounce ? '' : 'onlyOwner '}{`,
    );
    if (fakeRenounce) push("    require(msg.sender == operator, 'operator');");
    push('    _mint(to, amount);');
    push('  }');
    clues.push(
      flagClue(
        'g-mint',
        'Mint with no cap',
        'mint-unlimited',
        { kind: 'line', line: l },
        fine('mint-unlimited') ? '// MAX_SUPPLY is never checked here' : undefined,
      ),
    );
  }
  if (fakeRenounce && !flags.includes('mint-unlimited')) {
    push('');
    push(
      '  function setFees(uint256 b, uint256 s) external { require(msg.sender == operator); buy = b; sell = s; }',
    );
  }
  // The transfer hook: where fees, freezes and the honeypot actually bite.
  const taxed = flags.includes('sell-tax-adjustable') || herrings.includes('small-fixed-tax');
  if (taxed || honeypot || flags.includes('blacklist')) {
    push('');
    push('  function _update(address from, address to, uint256 v)');
    push('    internal override {');
    if (flags.includes('blacklist')) push("    require(!flagged[from], 'compliance hold');");
    if (honeypot) {
      const l = push("    if (to == pool) require(canSell[from], 'not yet');");
      clues.push(
        flagClue(
          'g-honeypot',
          'Only approved can sell',
          'honeypot',
          { kind: 'line', line: l },
          fine('honeypot')
            ? '// canSell is set by the deployer. nobody else is on the list.'
            : undefined,
        ),
      );
    }
    if (taxed) {
      push(
        `    uint256 fee = v * ${flags.includes('sell-tax-adjustable') ? 'sellTaxBps' : 'TAX_BPS'} / 10_000;`,
      );
      push('    super._update(from, treasury, fee);');
      push('    super._update(from, to, v - fee);');
    } else push('    super._update(from, to, v);');
    push('  }');
  }
  push('}');
  return {
    type: 'contract',
    title: `${cname}.sol`,
    content: { fileName: `contracts/${cname}.sol`, verified: true, lines: lines.slice(0, 60) },
    clues: clues as unknown as Clue[],
  };
}

function tokenomicsDoc(
  rng: Rng,
  nm: Names,
  wants: { unvested: boolean; copied: boolean; marketing: boolean; roadmap: boolean },
  fine: (id: string) => boolean,
): CaseDocument {
  const clues: ClueDraft[] = [];
  const team = wants.unvested ? rng.int(25, 40) : rng.int(8, 15);
  const liq = rng.int(25, 35);
  const mkt = rng.int(3, 8);
  const rest = 100 - team - liq - mkt;
  const allocations = [
    { label: 'Liquidity', pct: liq, vesting: `locked ${rng.int(1, 3)}y` },
    { label: 'Community', pct: rest, vesting: 'by vote' },
    { label: 'Team', pct: team, vesting: wants.unvested ? 'none' : `${rng.int(6, 12)}m cliff+2y` },
    {
      label: 'Marketing',
      pct: mkt,
      vesting: wants.marketing ? `${rng.int(12, 24)} months, multisig` : 'monthly',
    },
  ];
  if (wants.unvested)
    clues.push(
      flagClue(
        'g-unvested',
        `${team}% team, liquid`,
        'team-allocation-unvested',
        { kind: 'row', row: 2 },
        fine('team-allocation-unvested')
          ? 'team wallet already moved 4% to the pool last week'
          : undefined,
      ),
    );
  if (wants.marketing)
    clues.push(
      herringClue('g-mkt', `${mkt}% marketing, vested`, 'small-vested-marketing', {
        kind: 'row',
        row: 3,
      }),
    );
  const notes: string[] = [];
  if (wants.copied) {
    notes.push(
      `Risk disclosure: ${nm.otherTicker} tokens may fluctuate in value. The team is not liable for loses.`,
    );
    clues.push(
      flagClue(
        'g-copied',
        `Text names ${nm.otherTicker}`,
        'copied-whitepaper',
        { kind: 'row', row: 0, table: 'notes' },
        fine('copied-whitepaper') ? `same typo ('loses') as ${nm.other}'s whitepaper` : undefined,
      ),
    );
  }
  if (wants.roadmap) {
    const i =
      notes.push(
        `Roadmap: ${rng.pick(['two more partners this quarter', 'publish monthly reports', 'run the spring event'])}. ${rng.pick(['Nothing else.', "That's it.", 'Nothing exotic.'])}`,
      ) - 1;
    clues.push(
      herringClue('g-roadmap', 'Dull roadmap', 'boring-roadmap', {
        kind: 'row',
        row: i,
        table: 'notes',
      }),
    );
  }
  if (notes.length === 0)
    notes.push(`Roadmap: ${nm.name} app in Q${rng.int(1, 4)}, then listings.`);
  return {
    type: 'tokenomics',
    title: 'Tokenomics',
    content: {
      totalSupply: `${rng.int(10, 900)},000,000 ${nm.ticker.slice(1)}`,
      allocations,
      notes,
    },
    clues: clues as unknown as Clue[],
  };
}

function teamDoc(
  rng: Rng,
  wants: { stock: boolean; meme: boolean },
  fine: (id: string) => boolean,
): CaseDocument {
  const clues: ClueDraft[] = [];
  const members: {
    name: string;
    role: string;
    bio: string;
    portraitSeed: string;
    style: 'normal' | 'stock' | 'ai' | 'anon';
  }[] = [];
  const roles = take(rng, ['CEO', 'CTO', 'Head of Ops', 'Contract dev', 'Community lead'], 3);
  for (let i = 0; i < (wants.meme ? 2 : 3); i++) {
    const name = `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
    members.push({
      name,
      role: roles[i],
      bio: rng.pick([
        `${rng.int(6, 15)} years in ${rng.pick(['logistics', 'payments', 'retail software', 'events'])}. Speaks at the regional meetup.`,
        'Public repo, public commits, public arguments about them.',
        'Serial founder. Previously exited two startups.',
        'Runs the books. Publishes monthly minutes.',
      ]),
      portraitSeed: `${name.toLowerCase().replace(/\s/g, '-')}-${rng.int(1, 99)}`,
      style: 'normal',
    });
  }
  if (wants.stock) {
    const idx = rng.int(0, members.length - 1);
    members[idx].style = rng.chance(0.5) ? 'stock' : 'ai';
    members[idx].bio = 'Blockchain visionary. Led engineering at a top-10 exchange.';
    clues.push(
      flagClue(
        'g-stock',
        'Photo is stock or AI',
        'anon-team-stock-photos',
        { kind: 'row', row: idx, table: 'photo' },
        fine('anon-team-stock-photos') ? `PHOTO ID ${rng.int(1000, 9999)}` : undefined,
      ),
    );
  }
  if (wants.meme) {
    const handle = rng.pick(MEME_HANDLES);
    members.push({
      name: handle,
      role: 'Contract dev',
      bio: `${rng.pick(FIRST)} ${rng.pick(LAST)}. The handle predates the token by a decade; it is on the shop sign.`,
      portraitSeed: `meme-${handle.toLowerCase().replace(/\s/g, '-')}-${rng.int(1, 99)}`,
      style: 'normal',
    });
    clues.push(
      herringClue('g-meme', `${handle}: doxxed`, 'doxxed-meme-name', {
        kind: 'row',
        row: members.length - 1,
      }),
    );
  }
  return {
    type: 'team',
    title: 'Team',
    content: { members: members.slice(0, 4) },
    clues: clues as unknown as Clue[],
  };
}

function chatDoc(
  rng: Rng,
  nm: Names,
  wants: { bots: boolean; urgency: boolean; guaranteed: boolean; joke: boolean; question: boolean },
  fine: (id: string) => boolean,
): CaseDocument {
  const clues: ClueDraft[] = [];
  const msgs: {
    user: string;
    role: 'admin' | 'mod' | 'member' | 'bot';
    time: string;
    text: string;
    deleted: boolean;
  }[] = [];
  const admin = `${rng.pick(FIRST)}_${rng.pick(['admin', 'team', 'dev'])}`;
  let h = rng.int(18, 22);
  let m = rng.int(0, 40);
  const t = () => {
    m += rng.int(1, 4);
    if (m >= 60) {
      m -= 60;
      h = (h + 1) % 24;
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };
  const say = (user: string, text: string, role?: 'admin' | 'mod' | 'member' | 'bot'): number => {
    msgs.push({ user, role: role ?? 'member', time: t(), text, deleted: false });
    return msgs.length - 1;
  };
  const handles = take(rng, HANDLES, 6);
  if (wants.urgency) {
    const i = say(
      admin,
      `PRESALE CLOSES IN ${rng.int(5, 30)} MINUTES. last chance before we moon. don't miss out!!`,
      'admin',
    );
    clues.push(
      flagClue(
        'g-urgency',
        'Countdown pressure',
        'urgency-pressure',
        { kind: 'message', index: i },
        fine('urgency-pressure') ? 'this is the fourth "last chance" this week' : undefined,
      ),
    );
  } else
    say(
      admin,
      rng.pick([
        'weekly report is up in #reports.',
        'partner call went well, notes tomorrow.',
        'new stall payouts posted.',
      ]),
      'admin',
    );
  if (wants.guaranteed) {
    const i = say(
      admin,
      `quick recap for new holders: ${rng.int(5, 30)}% ${rng.pick(['weekly', 'monthly'])} from fees. guaranteed, it's math.`,
      'admin',
    );
    clues.push(
      flagClue('g-guaranteed', 'Guaranteed returns', 'guaranteed-returns', {
        kind: 'message',
        index: i,
      }),
    );
  }
  if (wants.joke) {
    const i = say(handles[0], rng.pick(JOKES).replace('{noun}', nm.noun));
    clues.push(herringClue('g-joke', 'A joke', 'community-jokes', { kind: 'message', index: i }));
  }
  if (wants.question) {
    const i = say(handles[1], rng.pick(QUESTIONS));
    say(
      admin,
      rng.pick([
        'cap is a constant, line 4. lock is a contract, address in the audit.',
        'good question. answered in the docs, section 3, with the tx hash.',
      ]),
      'admin',
    );
    clues.push(
      herringClue('g-question', `${handles[1]} asks`, 'tough-questions', {
        kind: 'message',
        index: i,
      }),
    );
  }
  if (wants.bots) {
    const line = rng.pick([
      'best community in crypto, get in now',
      'smoothest launch I have seen, hands down',
      '100x from here easy, thank me later',
    ]);
    const stamp = t();
    const first = msgs.length;
    for (let k = 0; k < 3; k++)
      msgs.push({
        user: `${rng.pick(['moon', 'crypto', 'ape', 'gem'])}${rng.pick(['_king', 'lord', '_77', 'hunter'])}${rng.int(10, 99)}`,
        role: 'member',
        time: stamp,
        text: k === 1 ? `${line}!!` : k === 2 ? line.charAt(0).toUpperCase() + line.slice(1) : line,
        deleted: false,
      });
    clues.push(
      flagClue(
        'g-bots',
        '3 accounts, 1 sentence',
        'bot-chat',
        { kind: 'message', index: first + 1 },
        fine('bot-chat') ? 'all three accounts created this morning' : undefined,
      ),
    );
  }
  // Real chatter around whatever was planted.
  const filler = take(
    rng,
    [
      'gm',
      'anyone else here from the newsletter?',
      'chart looks fine to me',
      'what time is the call?',
      'can someone explain vesting like I am five',
      'bought the dip. there was no dip. bought anyway.',
      'mods can we get a pinned faq',
      'reading the contract now, brb',
    ],
    rng.int(2, 3),
  );
  filler.forEach((line, i) => say(handles[2 + (i % 3)], line));
  return {
    type: 'chat',
    title: `${rng.pick(['Telegram', 'Discord'])}: ${nm.name}`,
    content: { channel: nm.name.toLowerCase().replace(/\s/g, '-'), messages: msgs.slice(0, 40) },
    clues: clues as unknown as Clue[],
  };
}

function liquidityDoc(
  rng: Rng,
  nm: Names,
  wants: { unlocked: boolean; whales: boolean; lockedLong: boolean; poolTop: boolean },
  fine: (id: string) => boolean,
): CaseDocument {
  const clues: ClueDraft[] = [];
  const days = rng.int(2, 9);
  const years = rng.int(1, 4);
  const lock = wants.unlocked
    ? rng.chance(0.5)
      ? { locked: false, pct: 0 }
      : { locked: true, provider: 'LockBox', expires: `in ${days} days`, pct: 100 }
    : {
        locked: true,
        provider: rng.pick(['LockBox', 'Vaultly']),
        expires: `Sep ${2026 + years} (${years}y)`,
        pct: 100,
      };
  if (wants.unlocked)
    clues.push(
      flagClue(
        'g-unlocked',
        lock.locked ? `Lock ends in ${days} days` : 'Liquidity not locked',
        'liquidity-unlocked',
        { kind: 'row', row: 0, table: 'lock' },
        fine('liquidity-unlocked')
          ? lock.locked
            ? `lock created ${rng.int(20, 40)} days ago for ${rng.int(25, 45)} days. 'renewal soon'.`
            : 'pool tokens sit in the deployer wallet'
          : undefined,
      ),
    );
  if (wants.lockedLong)
    clues.push(
      herringClue('g-lockedlong', `Locked ${years} years`, 'liquidity-locked-long', {
        kind: 'row',
        row: 0,
        table: 'lock',
      }),
    );
  const poolPct = rng.int(24, 40);
  const holders: { label: string; pct: number; tag?: string }[] = [
    { label: 'Liquidity pool', pct: poolPct, tag: 'pool' },
  ];
  const transfers: { when: string; from: string; to: string; amount: string }[] = [];
  if (wants.poolTop)
    clues.push(
      herringClue('g-pooltop', `Pool holds ${poolPct}%`, 'pool-top-holder', {
        kind: 'row',
        row: 0,
        table: 'holders',
      }),
    );
  if (wants.whales) {
    const each = rng.int(9, 12);
    const block = rng.int(19_000_000, 19_999_999);
    const amount = `${rng.int(20, 60)},000,000`;
    for (let k = 0; k < 3; k++) {
      const addr = `0x${rng.int(100, 999).toString(16)}...${rng.int(100, 999).toString(16)}`;
      holders.push({ label: addr, pct: each });
      transfers.push({ when: `${rng.int(3, 9)}d ago`, from: 'Deployer', to: addr, amount });
    }
    clues.push(
      flagClue(
        'g-whales',
        '3 whales, one funder',
        'whale-concentration',
        { kind: 'row', row: 1, table: 'holders' },
        fine('whale-concentration')
          ? `all three funded in block ${block.toLocaleString()} from the deployer`
          : undefined,
      ),
    );
  } else {
    holders.push({ label: 'Treasury contract', pct: rng.int(15, 25), tag: 'contract' });
  }
  const used = holders.reduce((s, x) => s + x.pct, 0);
  holders.push({ label: 'Everyone else', pct: Math.max(1, 100 - used) });
  return {
    type: 'liquidity',
    title: 'Liquidity & Holders',
    content: {
      pool: `${nm.ticker.slice(1)} / USDC`,
      liquidityUsd: `$${rng.int(40, 900)},000`,
      lock,
      holders: holders.slice(0, 8),
      transfers: transfers.slice(0, 6),
    },
    clues: clues as unknown as Clue[],
  };
}

function auditDoc(
  rng: Rng,
  nm: Names,
  wants: { fake: boolean; real: boolean },
  fine: (id: string) => boolean,
): CaseDocument {
  const clues: ClueDraft[] = [];
  const cname = `${nm.name.replace(/\s/g, '')}Token`;
  if (wants.fake) {
    const mismatch = rng.chance(0.5);
    const content = {
      auditor: rng.pick(AUDITORS_FAKE),
      contractName: `${mismatch ? `${nm.other.replace(/\s/g, '')}Token` : cname}.sol (0x${rng.int(100, 999).toString(16)}...${rng.int(100, 999).toString(16)})`,
      date: `${rng.int(1, 28)} ${rng.pick(['Jul', 'Aug', 'Sep'])}`,
      score: '100 / 100',
      summary: 'Automated scan complete. No vulnerabilities detected. Contract is SAFU.',
      findings: [],
    };
    clues.push(
      flagClue(
        'g-fakeaudit',
        mismatch ? 'Audits the wrong file' : '100/100, zero findings',
        'fake-audit',
        { kind: 'row', row: mismatch ? 1 : 3, table: 'field' },
        fine('fake-audit')
          ? mismatch
            ? `deployed contract is ${cname}.sol, not this one`
            : 'auditor has no website. "SAFU" is not a finding.'
          : undefined,
      ),
    );
    return {
      type: 'audit',
      title: 'Audit Certificate',
      content,
      clues: clues as unknown as Clue[],
    };
  }
  const content = {
    auditor: rng.pick(AUDITORS_REAL),
    contractName: `${cname}.sol (0x${rng.int(100, 999).toString(16)}...${rng.int(100, 999).toString(16)})`,
    date: `${rng.int(1, 28)} ${rng.pick(['Jun', 'Jul', 'Aug'])}`,
    score: 'Pass - 1 medium, 2 low',
    summary: `Manual review of ${cname}.sol. One medium issue fixed before deployment.`,
    findings: [
      'Fee rounding on dust transfers (medium) - fixed.',
      'Unused import (low).',
      'Missing NatSpec on _update (low).',
    ],
  };
  if (wants.real)
    clues.push(
      herringClue('g-findings', 'Audit found a medium', 'real-audit-findings', {
        kind: 'row',
        row: 0,
        table: 'findings',
      }),
    );
  return { type: 'audit', title: 'Audit Report', content, clues: clues as unknown as Clue[] };
}

// ---- assembly ---------------------------------------------------------------------

const FLAG_POOL = [
  'mint-unlimited',
  'sell-tax-adjustable',
  'honeypot',
  'blacklist',
  'fake-renounce',
  'unverified-contract',
  'team-allocation-unvested',
  'copied-whitepaper',
  'anon-team-stock-photos',
  'bot-chat',
  'urgency-pressure',
  'guaranteed-returns',
  'liquidity-unlocked',
  'whale-concentration',
  'fake-audit',
] as const;
const HERRING_POOL = [
  'small-fixed-tax',
  'renounced-cleanly',
  'immutable-supply-note',
  'timelocked-admin',
  'small-vested-marketing',
  'boring-roadmap',
  'doxxed-meme-name',
  'community-jokes',
  'tough-questions',
  'liquidity-locked-long',
  'pool-top-holder',
  'real-audit-findings',
] as const;

const FLAG_BLURB: Record<string, string> = {
  'mint-unlimited': 'the owner could print tokens at will',
  'sell-tax-adjustable': 'the sell tax had no cap',
  honeypot: 'only approved wallets could sell',
  blacklist: "the 'anti-bot' list could freeze anyone",
  'fake-renounce': 'ownership was renounced with an operator kept backstage',
  'unverified-contract': 'the source was never verified',
  'team-allocation-unvested': 'the team allocation was liquid on day one',
  'copied-whitepaper': 'the whitepaper was lifted from another token',
  'anon-team-stock-photos': 'the team photos were stock',
  'bot-chat': 'the chat was three bots and an admin',
  'urgency-pressure': 'the countdown never stopped',
  'guaranteed-returns': "returns were 'guaranteed'",
  'liquidity-unlocked': 'the liquidity lock was about to end (or never began)',
  'whale-concentration': 'three whales were funded from one wallet in one block',
  'fake-audit': 'the audit was a certificate, not an audit',
};

export function generateCase(seed: string, opts: GenOptions = {}): CaseData {
  const rng = makeRng(`cold:${seed}`);
  const nm = names(rng);
  const p = plan(rng, opts);
  const flags = new Set(take(rng, FLAG_POOL, p.flags));
  // A contract can carry at most one exit mechanism worth of confusion; keep it readable.
  const contractFlags = CONTRACT_FLAGS.filter((f) => flags.has(f));
  if (contractFlags.length > 2) contractFlags.slice(2).forEach((f) => flags.delete(f));
  if (flags.has('unverified-contract'))
    CONTRACT_FLAGS.filter((f) => f !== 'unverified-contract').forEach((f) => flags.delete(f));
  const herrings = new Set(take(rng, HERRING_POOL, p.herrings));
  // Contradictions: no clean renounce next to a fake one, no long lock next to an unlock.
  if (flags.has('fake-renounce')) {
    herrings.delete('renounced-cleanly');
    herrings.delete('timelocked-admin');
  }
  if (flags.has('liquidity-unlocked')) herrings.delete('liquidity-locked-long');
  if (flags.has('fake-audit')) herrings.delete('real-audit-findings');
  if (flags.has('unverified-contract')) CONTRACT_HERRINGS.forEach((h) => herrings.delete(h));
  if (flags.has('sell-tax-adjustable')) herrings.delete('small-fixed-tax');
  if (p.verdict === 'rug' && flags.size === 0) flags.add('mint-unlimited');
  const fineFor = new Map<string, boolean>();
  const fine = (id: string): boolean => {
    if (!fineFor.has(id)) fineFor.set(id, rng.chance(p.fineChance));
    return fineFor.get(id) as boolean;
  };

  const docs: CaseDocument[] = [];
  docs.push(
    contractDoc(
      rng,
      nm,
      CONTRACT_FLAGS.filter((f) => flags.has(f)),
      CONTRACT_HERRINGS.filter((h) => herrings.has(h)),
      fine,
    ),
  );
  docs.push(
    tokenomicsDoc(
      rng,
      nm,
      {
        unvested: flags.has('team-allocation-unvested'),
        copied: flags.has('copied-whitepaper'),
        marketing: herrings.has('small-vested-marketing'),
        roadmap: herrings.has('boring-roadmap'),
      },
      fine,
    ),
  );
  const wantTeam =
    flags.has('anon-team-stock-photos') || herrings.has('doxxed-meme-name') || rng.chance(0.4);
  if (wantTeam)
    docs.push(
      teamDoc(
        rng,
        { stock: flags.has('anon-team-stock-photos'), meme: herrings.has('doxxed-meme-name') },
        fine,
      ),
    );
  const wantChat =
    flags.has('bot-chat') ||
    flags.has('urgency-pressure') ||
    flags.has('guaranteed-returns') ||
    herrings.has('community-jokes') ||
    herrings.has('tough-questions') ||
    rng.chance(0.5);
  if (wantChat)
    docs.push(
      chatDoc(
        rng,
        nm,
        {
          bots: flags.has('bot-chat'),
          urgency: flags.has('urgency-pressure'),
          guaranteed: flags.has('guaranteed-returns'),
          joke: herrings.has('community-jokes'),
          question: herrings.has('tough-questions'),
        },
        fine,
      ),
    );
  docs.push(
    liquidityDoc(
      rng,
      nm,
      {
        unlocked: flags.has('liquidity-unlocked'),
        whales: flags.has('whale-concentration'),
        lockedLong: herrings.has('liquidity-locked-long'),
        poolTop: herrings.has('pool-top-holder'),
      },
      fine,
    ),
  );
  const wantAudit =
    flags.has('fake-audit') || herrings.has('real-audit-findings') || rng.chance(0.35);
  if (wantAudit && docs.length < 6)
    docs.push(
      auditDoc(
        rng,
        nm,
        { fake: flags.has('fake-audit'), real: herrings.has('real-audit-findings') },
        fine,
      ),
    );

  const flagList = [...flags];
  const debrief =
    p.verdict === 'rug'
      ? `${nm.name} was a cold one: ${flagList.map((f) => FLAG_BLURB[f]).join('; ')}. ${herrings.size > 0 ? 'The rest of the paperwork was real, which is what the paperwork was for.' : 'Nothing about it was real.'}`
      : `${nm.name} was fine. ${[...herrings].length} things looked scary and none of them were: fixed numbers, public locks, a team you could find, a chat that argued. Scary is not the same as guilty.`;
  const title = rng
    .pick(['The {n} File', 'Nothing But {n}', '{n} Hours', 'The {n} Receipt', 'A {n} Problem'])
    .replace('{n}', nm.name.split(' ')[1]);
  return {
    id: `cold-${seed.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`,
    title: title.slice(0, 40),
    ticker: nm.ticker,
    pitch: `${nm.name}: ${rng.pick(PROMISES)}. ${rng.pick(TRAITS)} ${rng.pick(TRAITS)}`.slice(
      0,
      90,
    ),
    intro: rng.pick([
      'Cold one. No name I recognise. Read it like the others.',
      'Fresh off the printer. Nobody has looked at this yet.',
      'A file from the pile. Same rules: read, pin, stamp.',
    ]),
    difficulty: p.difficulty,
    verdict: p.verdict,
    timeLimitSec: p.difficulty >= 4 ? 300 : 240,
    secret: false,
    documents: docs.slice(0, 6),
    debrief,
  } as CaseData;
}
