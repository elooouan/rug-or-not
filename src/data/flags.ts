/**
 * The red flag library. This is the educational core: every entry has a plain
 * English explanation that the Detective's Notebook unlocks the first time the
 * player meets it. Keep this file free of Phaser imports (used by tests/scripts).
 */
export type Severity = 'minor' | 'major' | 'critical';

export interface RedFlag {
  id: string;
  title: string;
  /** One or two plain sentences: what it is and why it matters. */
  explanation: string;
  /** A short tip on how to spot it in the wild. */
  howToSpot: string;
  severity: Severity;
}

export const FLAGS = {
  'mint-unlimited': {
    id: 'mint-unlimited',
    title: 'Owner-only unlimited mint',
    explanation:
      'The contract lets one address create new tokens whenever it likes. The owner can print supply and dump it on holders, crashing the price to zero.',
    howToSpot: 'Look for a mint() function guarded only by onlyOwner with no cap on total supply.',
    severity: 'critical',
  },
  'sell-tax-adjustable': {
    id: 'sell-tax-adjustable',
    title: 'Adjustable or hidden sell tax',
    explanation:
      'A fee on selling that the owner can change at any time. It can be raised to 99% after launch so nobody can exit with their money.',
    howToSpot:
      'A setSellTax() style function with no maximum, or a tax value that differs from what the website claims.',
    severity: 'critical',
  },
  honeypot: {
    id: 'honeypot',
    title: 'Honeypot (buys allowed, sells blocked)',
    explanation:
      'Anyone can buy the token but only approved addresses can sell. The chart only goes up because nobody can take profit, until the owner sells everything.',
    howToSpot:
      'Transfer logic that checks a whitelist only when the recipient is the liquidity pool, or a canSell flag.',
    severity: 'critical',
  },
  blacklist: {
    id: 'blacklist',
    title: 'Owner-controlled blacklist',
    explanation:
      'The owner can freeze any wallet at will. Even if the intent is "anti-bot", it means your tokens can be locked forever by one person.',
    howToSpot:
      'A blacklist mapping and a function like setBlacklisted(address, bool) restricted to the owner.',
    severity: 'major',
  },
  'liquidity-unlocked': {
    id: 'liquidity-unlocked',
    title: 'Liquidity not locked (or lock expiring soon)',
    explanation:
      'Liquidity is the pool of funds you trade against. If it is not locked, the team can pull it out at any moment and leave the token untradeable.',
    howToSpot:
      'No lock certificate, a lock held by a personal wallet, or an expiry date only days away.',
    severity: 'critical',
  },
  'whale-concentration': {
    id: 'whale-concentration',
    title: 'A few wallets hold most of the supply',
    explanation:
      'When one or two wallets hold a huge share, a single sale can wipe out the price. Often those wallets belong to the team under different names.',
    howToSpot: 'Top holder list where the biggest non-pool wallets add up to 30% or more.',
    severity: 'major',
  },
  'team-allocation-unvested': {
    id: 'team-allocation-unvested',
    title: 'Large team allocation with no vesting',
    explanation:
      'The team gets a big slice of tokens that they can sell immediately. Vesting (a gradual release schedule) is what aligns them with long-term holders.',
    howToSpot:
      'Tokenomics where the team share is 15%+ and the vesting column says none, immediate, or is blank.',
    severity: 'major',
  },
  'anon-team-stock-photos': {
    id: 'anon-team-stock-photos',
    title: 'Anonymous team with stock or AI photos',
    explanation:
      'Nobody accountable means nobody to chase when the money disappears. Stock or generated photos are a sign the "team" was invented.',
    howToSpot:
      'Reverse-image the photos, check for watermarks, and look for bios with no verifiable history.',
    severity: 'major',
  },
  'fake-audit': {
    id: 'fake-audit',
    title: 'Fake or unverifiable audit',
    explanation:
      'A certificate from an auditor that does not exist, or for a different contract, is worth nothing. Real audits are published by the auditor and name the exact contract.',
    howToSpot:
      'Contract name mismatch, an auditor with no website or track record, or a "100/100" score with zero findings.',
    severity: 'major',
  },
  'copied-whitepaper': {
    id: 'copied-whitepaper',
    title: 'Copied whitepaper or roadmap',
    explanation:
      'Text lifted from another project shows there is no real plan, only a template filled in to look busy.',
    howToSpot:
      'Roadmap items that mention the wrong token name, or bios identical to another project word for word.',
    severity: 'minor',
  },
  'bot-chat': {
    id: 'bot-chat',
    title: 'Bot-filled chat and fake engagement',
    explanation:
      'Repeated messages from fresh accounts create fake hype so newcomers feel they are late to a party. Real communities argue, ask questions and complain.',
    howToSpot:
      'Identical phrases posted seconds apart by different usernames, and no real questions being answered.',
    severity: 'minor',
  },
  'urgency-pressure': {
    id: 'urgency-pressure',
    title: 'Urgency and pressure tactics',
    explanation:
      '"Last chance" and "100x guaranteed" exist to stop you from thinking. A project that needs you to hurry is a project that needs you not to look.',
    howToSpot:
      'Countdowns, "presale closing", "don\'t miss out", and mods scolding people who ask for time.',
    severity: 'minor',
  },
  'guaranteed-returns': {
    id: 'guaranteed-returns',
    title: 'Promises of guaranteed returns',
    explanation:
      'Nobody can guarantee a return on a token. Fixed "APY" numbers or "pays you back" pitches are paid with new buyers\' money until it runs out.',
    howToSpot:
      'Words like guaranteed, risk-free, or a fixed daily percentage anywhere in the pitch.',
    severity: 'major',
  },
  'unverified-contract': {
    id: 'unverified-contract',
    title: 'Contract not verified / source hidden',
    explanation:
      'If the source code is not published and verified, nobody can check what it actually does. Hidden code is hiding something.',
    howToSpot: 'Explorer shows bytecode only, or the "verified" tag is missing.',
    severity: 'major',
  },
  'fake-renounce': {
    id: 'fake-renounce',
    title: '"Renounced" but an admin role still exists',
    explanation:
      'Renouncing ownership is meaningless if another role, a proxy, or a hard-coded address keeps the same powers. It is a costume, not a safeguard.',
    howToSpot:
      'renounceOwnership() present, but also an admin or operator address that can still change fees or mint.',
    severity: 'critical',
  },
} as const satisfies Record<string, RedFlag>;

export type FlagId = keyof typeof FLAGS;
export const FLAG_IDS = Object.keys(FLAGS) as FlagId[];

export function isFlagId(id: string): id is FlagId {
  return id in FLAGS;
}

/**
 * Yellow herrings: things that look scary but are not scams on their own.
 * Legit cases sprinkle these in so the player can't just flag everything.
 */
export interface Herring {
  id: string;
  title: string;
  /** Why this is fine (shown when a player pins it by mistake). */
  reassurance: string;
}

export const HERRINGS = {
  'doxxed-meme-name': {
    id: 'doxxed-meme-name',
    title: 'Doxxed team member with a silly handle',
    reassurance:
      'A goofy username is not a red flag. What matters is that the person is identifiable and accountable, and this one is.',
  },
  'small-fixed-tax': {
    id: 'small-fixed-tax',
    title: 'Small, fixed, documented tax',
    reassurance:
      'A 1-2% tax that is hard-coded, capped, and explained in the docs is a normal way to fund a project. The danger is a tax the owner can change.',
  },
  'small-vested-marketing': {
    id: 'small-vested-marketing',
    title: 'Small marketing wallet with vesting',
    reassurance:
      'A modest marketing allocation released gradually is standard. It is large unvested allocations that let a team dump on holders.',
  },
  'renounced-cleanly': {
    id: 'renounced-cleanly',
    title: 'Ownership renounced with no other admin role',
    reassurance:
      'When ownership is renounced and no other privileged role exists, nobody can change the rules. That is a good sign, not a bad one.',
  },
  'liquidity-locked-long': {
    id: 'liquidity-locked-long',
    title: 'Liquidity locked for a long time',
    reassurance:
      'A lock with a year or more left, held by a known locker service, is exactly what you want to see.',
  },
  'community-jokes': {
    id: 'community-jokes',
    title: 'Memes and jokes in the chat',
    reassurance:
      'Real communities are messy and silly. Jokes are not fake engagement; identical copy-pasted hype from fresh accounts is.',
  },
  'tough-questions': {
    id: 'tough-questions',
    title: 'Someone asking hard questions',
    reassurance:
      'A member grilling the team is healthy. Watch how the admins respond: honest answers are a green flag, deleting the question is a red one.',
  },
  'pool-top-holder': {
    id: 'pool-top-holder',
    title: 'The liquidity pool is the top holder',
    reassurance:
      'The pool contract holding a large share is normal, that is where trading liquidity lives. Worry when personal wallets hold that much.',
  },
  'real-audit-findings': {
    id: 'real-audit-findings',
    title: 'An audit that lists minor findings',
    reassurance:
      'Real audits almost always find something. A report with a few resolved low-severity items is more credible than a flawless 100/100.',
  },
  'immutable-supply-note': {
    id: 'immutable-supply-note',
    title: 'Fixed supply with no mint function',
    reassurance:
      'A hard cap in the constructor and no mint() anywhere means supply cannot grow. This is the opposite of a red flag.',
  },
  'boring-roadmap': {
    id: 'boring-roadmap',
    title: 'An unexciting, specific roadmap',
    reassurance:
      'Modest, concrete milestones are what real teams write. Grand promises are the thing to distrust.',
  },
} as const satisfies Record<string, Herring>;

export type HerringId = keyof typeof HERRINGS;
export function isHerringId(id: string): id is HerringId {
  return id in HERRINGS;
}
