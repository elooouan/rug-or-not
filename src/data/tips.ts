/**
 * Short real-world tips pinned to the corkboard. Click a note to read one. A tip that
 * names a red flag leans the corkboard toward it while that flag is on the desk (hints on,
 * honour off): a nudge for the attentive, never an answer.
 */
export interface Tip {
  text: string;
  /** The red flag this tip is about, if one. */
  flag?: string;
}

export const TIPS: Tip[] = [
  {
    text: 'Check who can change the fees. If one wallet can set the sell tax, assume it will be set to 99%.',
    flag: 'sell-tax-adjustable',
  },
  {
    text: 'A liquidity lock is only as good as its expiry date. Two years is a lock. Two days is a countdown.',
    flag: 'liquidity-unlocked',
  },
  {
    text: 'Read the holders list. If the top wallets share a funding source, they are one wallet wearing hats.',
    flag: 'whale-concentration',
  },
  {
    text: 'Renounced ownership means nothing if a proxy admin or operator role keeps the same powers.',
    flag: 'fake-renounce',
  },
  {
    text: 'Reverse-image search team photos. Stock sites and AI generators leave fingerprints.',
    flag: 'anon-team-stock-photos',
  },
  {
    text: 'Real audits list findings. A report with a perfect score and zero findings audited nothing.',
    flag: 'fake-audit',
  },
  {
    text: 'Bots post the same sentence seconds apart. Communities argue, joke, and ask annoying questions.',
    flag: 'bot-chat',
  },
  {
    text: 'Urgency is a tool. Anyone rushing you is trying to stop you from reading.',
    flag: 'urgency-pressure',
  },
  {
    text: 'Guaranteed returns do not exist. A fixed daily yield is paid by the next buyer, until there is none.',
    flag: 'guaranteed-returns',
  },
  {
    text: 'Unverified source code is a locked box. You do not put money in a box you cannot open.',
    flag: 'unverified-contract',
  },
  {
    text: 'Big team allocations are fine with vesting. Big team allocations with no vesting are an exit plan.',
    flag: 'team-allocation-unvested',
  },
  { text: 'A blacklist called a compliance list is still a blacklist.', flag: 'blacklist' },
  {
    text: 'A copied whitepaper usually forgets to change the old token name. Ctrl+F is a detective tool.',
    flag: 'copied-whitepaper',
  },
  {
    text: 'Yellow herrings: fixed 1-2% taxes, doxxed founders with silly handles, and pools as top holders.',
  },
  { text: 'When an admin dodges a question about liquidity, the answer is the dodge.' },
  {
    text: 'A trading switch with no timelock is a rug waiting for a reason. Ask who flips it and what reopens it.',
    flag: 'trading-pause',
  },
  {
    text: 'A mint with no cap makes the supply whatever the owner says it is today. Tomorrow it says something else.',
    flag: 'mint-unlimited',
  },
  {
    text: 'If only some wallets can sell, the chart is a photograph, not a market.',
    flag: 'honeypot',
  },
  {
    text: 'A proxy is a door. Ask who holds the key to the door, not who painted it.',
    flag: 'proxy-admin',
  },
  {
    text: 'Volume between the same two wallets is a conversation, not a market. Check who is buying.',
    flag: 'wash-trading',
  },
];
