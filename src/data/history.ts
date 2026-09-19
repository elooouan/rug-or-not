/**
 * The game's own case file: one photo per notable build, pinned to the wall
 * behind the corkboard polaroid. Photos live in public/img/history/ and are
 * taken with scripts/photograph.sh (see README, "Photographing the game").
 * Add a frame here whenever the game changes enough to deserve one.
 */
export interface HistoryFrame {
  /** File name without extension, in public/img/history/. */
  file: string;
  version: string;
  date: string;
  title: string;
  caption: string;
}

export const HISTORY: HistoryFrame[] = [
  {
    file: '01-v01-title',
    version: 'v0.1',
    date: '2026-09-17',
    title: 'Night one',
    caption: 'A desk, a lamp, a title card. Pixel text, one folder, no cat yet.',
  },
  {
    file: '02-v01-lens',
    version: 'v0.1',
    date: '2026-09-17',
    title: 'The lens',
    caption:
      'A second camera zoomed 2x and masked to a circle. Fine print hides from the main one.',
  },
  {
    file: '03-v02-cases',
    version: 'v0.2',
    date: '2026-09-17',
    title: 'Ten files',
    caption: 'The filing cabinet: ten cases, grades on the tabs, padlocks on the rest.',
  },
  {
    file: '04-v02-report',
    version: 'v0.2',
    date: '2026-09-17',
    title: 'The report',
    caption: 'Typed-out verdicts: what you caught, what you missed, and why it mattered.',
  },
  {
    file: '05-v03-window',
    version: 'v0.3',
    date: '2026-09-17',
    title: 'Readable',
    caption:
      'Text rendered at 3x on top of the pixels, a city outside, a cat on the sill, fullscreen.',
  },
  {
    file: '06-v03-lucien',
    version: 'v0.3',
    date: '2026-09-17',
    title: 'Enter Lucien',
    caption: 'Detective Lucien starts talking. Once per lesson, unless you poke him.',
  },
  {
    file: '07-v04-weather',
    version: 'v0.4',
    date: '2026-09-17',
    title: 'Weather',
    caption: 'Snow, fog, storms on demand, and the corkboard starts handing out advice.',
  },
  {
    file: '08-v04-netscope',
    version: 'v0.4',
    date: '2026-09-17',
    title: 'NetScope',
    caption: 'A phone on the desk runs a browser: explorer pages, the coin, the board, the news.',
  },
  {
    file: '09-v04-badges',
    version: 'v0.4',
    date: '2026-09-17',
    title: 'Badges',
    caption: 'Twenty of them, some secret. The lamp has feelings after ten clicks.',
  },
  {
    file: '10-v04-drawer',
    version: 'v0.4',
    date: '2026-09-17',
    title: 'Twelve files',
    caption: 'Two bonus cases, a goose and a library. The drawer goes six wide.',
  },
  {
    file: '11-v04-notebook',
    version: 'v0.4',
    date: '2026-09-17',
    title: 'Two chapters',
    caption: 'Red flags on the left page, yellow herrings on the right. Report lines link to them.',
  },
  {
    file: '12-v04-now',
    version: 'v0.4',
    date: '2026-09-18',
    title: 'Tonight',
    caption: 'Ask Lucien, share your results, hard mode, and the wall you are looking at.',
  },
  {
    file: '13-v04-wall',
    version: 'v0.4',
    date: '2026-09-18',
    title: 'The wall',
    caption: 'A photo of the wall, on the wall. The Historian badge for finding the polaroid.',
  },
  {
    file: '14-v04-safe',
    version: 'v0.4',
    date: '2026-09-18',
    title: 'The safe',
    caption:
      'A floor safe with a three-dial lock. The combination is in the notebook. Inside: the ledger.',
  },
  {
    file: '15-v05-rush',
    version: 'v0.5',
    date: '2026-09-18',
    title: 'Rush hour',
    caption: 'Sixty seconds, one page at a time. Five in a row and the multiplier is climbing.',
  },
  {
    file: '16-v05-rogues',
    version: 'v0.5',
    date: '2026-09-18',
    title: 'Rogues gallery',
    caption: 'A WANTED poster for every rug called correctly. Grandma Edith is not who she says.',
  },
  {
    file: '17-v05-radio',
    version: 'v0.5',
    date: '2026-09-18',
    title: 'Late jazz',
    caption:
      'A radio under the lamp: lo-fi, late jazz, static, off. The static is not just static. A fly, too, some nights.',
  },
  {
    file: '18-v05-noname',
    version: 'v0.6',
    date: '2026-09-18',
    title: 'No name',
    caption:
      'Fifteen folders in a drawer built for twelve. The last one has no name until the others are closed.',
  },
  {
    file: '19-v05-cold',
    version: 'v0.6',
    date: '2026-09-18',
    title: 'The pile',
    caption:
      'Cold cases: the printer makes them up on the spot. $CRBAD, Crystal Badger, never existed until this photo.',
  },
  {
    file: '20-v05-drill',
    version: 'v0.6',
    date: '2026-09-18',
    title: 'Drill',
    caption:
      'Five pages that all hide the same flag, printed on demand from the notebook. Practice, with a clock.',
  },
  {
    file: '21-v06-tram',
    version: 'v0.6',
    date: '2026-09-18',
    title: 'Night tram',
    caption:
      'Case fifteen: honest code behind a proxy, two wallets passing the same bag back and forth. New tells, same desk.',
  },
  {
    file: '22-v07-freeze',
    version: 'v0.7',
    date: '2026-09-18',
    title: 'Seven nights',
    caption:
      'The seventh daily in a row earns a streak freeze: one missed night, forgiven. The chain is the point.',
  },
  {
    file: '23-v07-wallet',
    version: 'v0.7',
    date: '2026-09-18',
    title: 'Shareholder',
    caption:
      'Phantom on the coin page, read-only: an address, two balances, a tier. The staged 1,200 in the photo is a dev switch; the mint is still blank.',
  },
  {
    file: '24-v08-handbook',
    version: 'v0.8',
    date: '2026-09-18',
    title: 'The handbook',
    caption:
      "Eighteen pages in the notebook on how the office works. The greyed ones are about things that haven't turned up on this desk yet: it opens up a piece at a time now.",
  },
  {
    file: '25-v08-bluehour',
    version: 'v0.8',
    date: '2026-09-19',
    title: 'Blue hour',
    caption:
      'The same office in other colours: every texture is drawn from twelve named colours, so a theme is just twelve new values and a repaint. This one is Blue hour.',
  },
  {
    file: '26-v08-hunt',
    version: 'v0.8',
    date: '2026-09-19',
    title: 'Herring hunt',
    caption:
      'The mirror of a drill: five printed pages, and the target is the thing that only looks bad. The chart joke is the answer; the countdown above it is the trap.',
  },
];
