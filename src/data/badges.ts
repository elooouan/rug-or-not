/** Achievement badges. Cosmetic bragging rights; nothing affects scoring. */
export interface Badge {
  id: string;
  name: string;
  description: string;
  /** Hidden badges show as ??? until earned. */
  secret?: boolean;
}

export const BADGES: Badge[] = [
  { id: 'first-case', name: 'First File', description: 'Close your first case.' },
  {
    id: 'clean-sweep',
    name: 'Clean Sweep',
    description: 'Pin every red flag in a rug case with no false accusations.',
  },
  { id: 's-grade', name: 'Gold Star', description: 'Earn an S grade.' },
  { id: 'five-s', name: 'Decorated', description: 'Earn five S grades.' },
  { id: 'all-cases', name: 'Case Closed', description: 'Finish every campaign case.' },
  { id: 'all-flags', name: 'Encyclopedia', description: 'Learn every red flag in the notebook.' },
  { id: 'fair-judge', name: 'Fair Judge', description: 'Stamp LEGIT correctly three times.' },
  {
    id: 'quick-draw',
    name: 'Quick Draw',
    description: 'Close a case correctly with more than half the time left.',
  },
  {
    id: 'steady-hand',
    name: 'Steady Hand',
    description: 'Five cases in a row without a false accusation.',
  },
  { id: 'thorough', name: 'Thorough', description: 'Examine every clue spot in a case.' },
  { id: 'streak-3', name: 'Regular', description: 'Keep a 3-day daily streak.' },
  { id: 'streak-7', name: 'Night Shift', description: 'Keep a 7-day daily streak.' },
  { id: 'wired', name: 'Wired', description: 'Ten sips of coffee.', secret: true },
  { id: 'cat-person', name: 'Cat Person', description: 'Pet Biscuit ten times.', secret: true },
  {
    id: 'weather-watcher',
    name: 'Weather Watcher',
    description: 'See all five kinds of weather.',
    secret: true,
  },
  {
    id: 'power-user',
    name: 'Power User',
    description: 'Visit every page in NetScope.',
    secret: true,
  },
  {
    id: 'electrician',
    name: 'Electrician',
    description: 'Click the lamp ten times.',
    secret: true,
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Play between 1 and 4 in the morning.',
    secret: true,
  },
  {
    id: 'cheater',
    name: 'Cheater (affectionate)',
    description: 'You know what you did.',
    secret: true,
  },
  {
    id: 'shareholder',
    name: 'Shareholder',
    description: 'Connect a wallet that holds the coin.',
    secret: true,
  },
  {
    id: 'historian',
    name: 'Historian',
    description: 'Find the photo on the corkboard.',
    secret: true,
  },
  {
    id: 'safecracker',
    name: 'Safecracker',
    description: 'Open the safe under the desk.',
    secret: true,
  },
];

export const BADGE_BY_ID: Record<string, Badge> = Object.fromEntries(BADGES.map((b) => [b.id, b]));
