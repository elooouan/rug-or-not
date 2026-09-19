import { RANKS, RUSH, SCORING } from '@/config/gameConfig';
import { TOKEN } from '@/config/token';
import type { Feature } from '@/systems/discovery';

/**
 * The detective's handbook: the notebook chapter that explains how the office
 * works, one short page per subject. Pages tied to a feature the player hasn't
 * unlocked yet still read in full, with a note on when the thing shows up.
 */
export interface HandbookTopic {
  id: string;
  title: string;
  /** The desk feature this page describes, if it unlocks with progress. */
  feature?: Feature;
  /** Paragraphs; `{ h }` entries are small headings. */
  body: (string | { h: string })[];
}

const ranks = RANKS.map((r) => `${r.rank} at ${r.minScore}`).join(', ');

export const HANDBOOK: HandbookTopic[] = [
  {
    id: 'desk',
    title: 'The desk',
    body: [
      'Every night a folder lands on the desk. Open it, read what is inside, decide whether the coin is a rug pull or legit, and stamp it. That is the whole job.',
      { h: 'Around the folder' },
      'The phone runs NetScope (explorer, board, coin page, news). The notebook keeps what you learn. The clock is the timer. The radio, cat, lamp and safe are yours to poke.',
      { h: 'Keys' },
      'Esc pauses or goes back, F fills the screen, M mutes. Most buttons show their hotkey in brackets.',
    ],
  },
  {
    id: 'lens',
    title: 'Reading with the lens',
    body: [
      'On the paper your pointer becomes a magnifier. Fine print only shows through it: a fee that can change, an address that is not the one it claims to be, a date that does not add up.',
      'Move slowly. Anything that turns amber under the lens is a clue spot worth a second look.',
      { h: 'On a touch screen' },
      'The lens floats above your finger so the finger does not cover what you are reading.',
    ],
  },
  {
    id: 'pins',
    title: 'Pins and clue spots',
    body: [
      'Click a clue spot to pin it. A pin says "this smells wrong". Click again to unpin.',
      `Pins on real red flags score ${SCORING.realFlagPinned} (+${SCORING.finePrintBonus} when the flag hid in fine print). Pins on things that only look bad, the yellow herrings, cost ${-SCORING.falseAccusation} each. So do pins on blank paper.`,
      'Everything pinned shows up in the suspicions list on the right; click a line there to jump back to it.',
    ],
  },
  {
    id: 'tabs',
    title: 'Tabs, scrolling, keys',
    body: [
      'A file has several documents: contract, tokenomics, team, chat, liquidity, audit. Tabs above the paper switch between them; keys 1-6 and [ ] do too.',
      'Long pages scroll with the wheel, PageUp/PageDown, or by dragging. The "v more" mark at the bottom means there is more below.',
      'Tab and the arrow keys walk through clue spots; Enter or Space pins the one in focus.',
    ],
  },
  {
    id: 'stamp',
    title: 'Stamping and the report',
    body: [
      'When you have read enough, stamp the file: RUG (R) or LEGIT (L). The stamps sit on the ink pad at the bottom right of the desk.',
      `A correct verdict is ${SCORING.correctVerdict} points, a wrong one ${SCORING.wrongVerdict}. The report that follows lists every red flag, found or missed, and each line links to its notebook page.`,
      { h: 'The second look' },
      'When something got past you, the report offers a second look: the file opens again, read-only, with your pins where they were and every missed flag marked in amber. Click a mark and Lucien says why it mattered. Esc brings the report back.',
      { h: 'The clock' },
      `Files run on a timer; what is left when you stamp is worth up to ${SCORING.timeBonusMax}. Time running out costs nothing but the bonus. Relaxed mode in Settings removes timers altogether.`,
    ],
  },
  {
    id: 'score',
    title: 'Grades and ranks',
    body: [
      'Each file gets a grade from how much of the possible score you took: S from 95%, A from 80%, B from 60%, C from 40%, D below.',
      `Points add up across the campaign into a rank: ${ranks}. Replaying a file only counts the improvement.`,
      { h: "Detective's honour" },
      `Settings can turn off hints, the examined counter and hover highlights. Every score is then multiplied by ${SCORING.hardModeMultiplier}.`,
    ],
  },
  {
    id: 'hints',
    title: 'Asking Lucien',
    body: [
      `Stuck? Click Lucien's face in the corner of the desk. He points at a document; ask again about the same page and he points at the line, though whether it is a flag or a herring stays your call. Each nudge costs ${-SCORING.hintCost} points, ${SCORING.maxHints} per file.`,
      'He also mutters on his own: a tip the first time a kind of document turns up, a word when the clock gets short. Both can be switched off in Settings.',
    ],
  },
  {
    id: 'notebook',
    title: 'The notebook',
    body: [
      'Red flags fill in as you meet them: what the pattern is and how to spot it, plus your own record of pins and misses. Yellow herrings do the same for the things that look bad and are fine.',
      'The rogues gallery keeps a wanted poster for every rug you called correctly.',
      { h: 'Drills' },
      `Every learned red flag has a Drill button: ${RUSH.drillPages} generated pages that all hide that flag, on a ${RUSH.drillTimeSec}-second clock. Clear them all to log the drill. Yellow herrings get a Hunt instead: five pages where you click the thing that only looks bad.`,
    ],
  },
  {
    id: 'daily',
    title: 'The daily and streaks',
    body: [
      'One file a day is the daily: the same one for everyone that day. It alternates between a campaign file and a freshly printed one.',
      'Closing it keeps a streak. Every seventh night in a row earns a streak freeze (two at most); a freeze quietly bridges one missed night.',
      'The daily never touches your rank; it has its own line on the board and the ID card.',
    ],
  },
  {
    id: 'drawer',
    title: 'The case files',
    feature: 'drawer',
    body: [
      'The drawer holds every campaign file. Closed ones can be reopened for a better grade; the best grade is what counts. New files unlock as you close the ones before.',
      'A folder with no name turns up at the end once everything else is closed. Nobody knows who filed it.',
    ],
  },
  {
    id: 'cold',
    title: 'Cold cases (the pile)',
    feature: 'cold',
    body: [
      'The printer makes files up on the spot: a fresh coin, contract, team and chat every time, assembled from the same red flags and herrings as the campaign. They never run out.',
      'Difficulty grows with the campaign files you have solved. Cold cases keep their own tally, board and badges; the seed in a share link brings the exact same file back for someone else.',
    ],
  },
  {
    id: 'weekly',
    title: 'The weekly',
    feature: 'weekly',
    body: [
      'The WEEKLY folder in the drawer is one cold case for the whole week, the same for everyone who opens it. It sits at difficulty 3 or 4 and has its own top five on the board.',
      'Stamp it once and the folder is marked closed until Monday.',
    ],
  },
  {
    id: 'rush',
    title: 'Red Flag Rush',
    feature: 'rush',
    body: [
      `${RUSH.timeSec} seconds, one evidence page at a time. Click the red flag to clear the page: ${RUSH.flagPoints} points, +${RUSH.flagTimeBonus}s, and the multiplier climbs by ${RUSH.streakStep} per hit up to x${RUSH.maxMultiplier}.`,
      `A herring costs ${RUSH.herringPenaltySec}s and the streak; blank paper costs ${RUSH.strayPenaltySec}s. The results card explains the herrings you fell for.`,
      'The rush has its own board. Deck pages change daily.',
    ],
  },
  {
    id: 'phone',
    title: 'NetScope (the phone)',
    body: [
      'Click the phone on the desk. RugScan is the explorer: the current file, and every token on record. Board is the Hall of Detectives. News is mostly nonsense, which is the point.',
      'Badges lists every badge and how to earn it. Help repeats the basics. The wall (behind the corkboard polaroid) is the making-of.',
      'Esc closes the phone. The wallet lives on its coin page.',
    ],
  },
  {
    id: 'coin',
    title: 'The coin and your wallet',
    body: [
      `${TOKEN.name} (${TOKEN.symbol}) is the precinct's own coin. Holding some opens extra dressing for the office and a weekly file for holders. It changes nothing about scoring, and you never need it to play.`,
      { h: 'Connecting' },
      'The chip on the title opens the coin page. Connecting shares your public address so the game can read balances. Nothing is signed, nothing is sent, and the game never asks for a seed phrase.',
    ],
  },
  {
    id: 'badges',
    title: 'Badges and unlocks',
    body: [
      'Badges mark things done: first file, a clean streak, every herring met, a rush over 2000, the safe opened. The ID card on the phone shows them.',
      'Cosmetics (desk wood, lamp shade, magnifier rim, stamp ink) unlock with rank, grades, streaks and learned flags, and are equipped on the Office page of Settings.',
      { h: 'Office colours' },
      'The same page repaints the whole office: noir, an old sepia file, a blue hour, newsprint, a speakeasy. Free, any time.',
    ],
  },
  {
    id: 'share',
    title: 'Sharing and your own files',
    body: [
      'Every report has a Share button: a card with the result and a link that opens the same file for someone else.',
      'The case editor (About page on the phone) writes new files with the same documents and clues. They appear under RugScan > Your files and can be shared by link too.',
    ],
  },
  {
    id: 'toys',
    title: 'Desk toys',
    body: [
      'Almost everything on the desk does something. Hover the coffee. Click the lamp, the window, the moon, the cat, the clock, the corkboard, the radio (four stations), the ink pad, the safe.',
      'The title screen listens for typed words. The safe wants three digits that are hidden somewhere in the office. Lucien has opinions if you click him.',
    ],
  },
];
