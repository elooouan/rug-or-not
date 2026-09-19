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
    id: 'decorator',
    name: 'Decorator',
    description: 'Try all five office colours.',
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
  { id: 'most-wanted', name: 'Most Wanted', description: 'Fill every page of the rogues gallery.' },
  {
    id: 'drill-sergeant',
    name: 'Drill Sergeant',
    description: 'Complete the drill for every red flag.',
  },
  {
    id: 'herring-hunter',
    name: 'Herring Hunter',
    description: 'Finish the hunt for every yellow herring.',
  },
  {
    id: 'hindsight',
    name: 'Hindsight',
    description: 'Take the second look at five reports.',
  },
  { id: 'cold-one', name: 'Cold One', description: 'Close a cold case (a generated file).' },
  { id: 'cold-ten', name: 'Night Desk', description: 'Call ten cold cases correctly.' },
  { id: 'rush-hour', name: 'Rush Hour', description: 'Finish a Red Flag Rush.' },
  { id: 'hot-streak', name: 'Hot Streak', description: 'Ten red flags in a row in Rush.' },
  { id: 'speed-reader', name: 'Speed Reader', description: 'Score 2000 in a single Rush.' },
  { id: 'swatter', name: 'Swatter', description: 'Swat the fly.', secret: true },
  { id: 'stargazer', name: 'Stargazer', description: 'Catch a falling star.', secret: true },
  {
    id: 'night-radio',
    name: 'Night Radio',
    description: 'Sit with the numbers station a while.',
    secret: true,
  },
  {
    id: 'tailor-made',
    name: 'Tailor-Made',
    description: 'Stamp the file with no name correctly.',
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
