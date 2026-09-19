/**
 * Detective Lucien's lines. Each script is shown once (tracked in the save)
 * unless hints are reset. Steps with `waitFor` stay on screen until the
 * player does the thing; the scene supplies the predicate.
 */
export interface DialogueLine {
  text: string;
  /** Name of a condition the scene checks each frame; the line waits until it's true. */
  waitFor?: string;
  /** Short prompt shown while waiting, e.g. "hover the paper". */
  prompt?: string;
}

export type ScriptId =
  | 'title-intro'
  | 'first-intake'
  | 'first-investigation'
  | 'first-report'
  | 'first-legit'
  | 'first-wrong'
  | 'first-daily'
  | 'first-cold'
  | 'first-weekly'
  | 'notebook'
  | 'case-files'
  | 'settings'
  | 'coffee'
  | 'cat'
  | 'browser'
  | 'wallet'
  | 'leaderboard'
  | 'konami'
  | 'all-cases'
  | 'wall'
  | 'first-rush'
  | 'radio'
  | 'rogues'
  | 'holder'
  | 'story-1'
  | 'story-2'
  | 'story-3'
  | 'story-4'
  | 'secret-unlocked'
  | 'secret-solved'
  | 'desk-tour';

/** Campaign story beats: shown on the report after the case at this index (0-based) is closed. */
export const STORY_BEATS: Record<number, ScriptId> = {
  1: 'story-1',
  4: 'story-2',
  9: 'story-3',
  12: 'story-4',
};

/** One-off reading tips, the first time each kind of document lands on the desk. */
export const DOC_TIPS: Record<string, string> = {
  contract:
    'Code first. Who can mint, who can change fees, who can freeze. Names lie, functions do not.',
  tokenomics: 'Percentages are fine. Vesting is the column that matters.',
  team: 'Faces can be bought. Check whether the bios could belong to anyone.',
  chat: 'Count how many people say the same thing at the same minute.',
  liquidity: 'Locks have expiry dates. Read them. Then read who funded the whales.',
  audit: 'An audit names a file. Make sure it is this file, and that it found something.',
};

/** What changed, in Lucien's words, for players coming back after an update. */
export const WHATS_NEW: Record<string, string> = {
  'v0.7':
    'New tonight: a wallet chip on the desk (read-only; the phone explains), a streak freeze every seventh night, clouds over the moon. The safe has the rest.',
  'v0.6':
    'New on the desk: the pile (cold cases that never run out), drills in the notebook, a weekly file. The safe has the details.',
};

/** Things Lucien says when you poke him on the title screen. */
export const LUCIEN_QUIPS: string[] = [
  'The coffee is not for sharing.',
  'Biscuit solved a case once. Sat on the evidence until it confessed.',
  "If the chart only goes up, somebody's holding the elevator door.",
  'Renounced is a word. Renounced with a proxy admin is a costume.',
  "I don't do guaranteed returns. I do guaranteed reading.",
  'Every rug starts with a pitch and ends with a wallet named 0x9f3.',
  'The lamp flickers when someone lies. Or when it rains. Mostly rain.',
  'Pin what you can explain. Drop what you cannot.',
  'A team photo with a watermark is a team of one: the intern who downloaded it.',
  'Quiet night. Suspiciously quiet. Probably fine.',
];

export const LUCIEN: Record<ScriptId, DialogueLine[]> = {
  'title-intro': [
    { text: "Evening. Name's Lucien. Detective, coin sniffer, coffee enjoyer." },
    { text: 'Every night a new token lands on this desk. Some are honest. Most... are not.' },
    { text: 'Your job: read the evidence, pin what smells, and stamp the verdict. RUG or LEGIT.' },
    { text: "Grab a coffee. It's going to be a long night. Hit Play when you're ready." },
  ],
  'first-intake': [
    { text: 'First file of the night. Small fry, but they all start small.' },
    {
      text: 'Click the folder to open it, or press Enter.',
      waitFor: 'opened',
      prompt: 'open the folder',
    },
  ],
  'first-investigation': [
    {
      text: 'Move your magnifier over the paper. The lens zooms in, and some fine print only shows up through it.',
      waitFor: 'examined',
      prompt: 'hover a clue with the lens',
    },
    {
      text: "That's a clue spot. If it smells wrong, click it to pin it. Pinned clues land in the notebook on the right.",
      waitFor: 'pinned',
      prompt: 'pin a clue',
    },
    {
      text: "Good. There's more evidence in the tabs above the paper. Number keys work too.",
      waitFor: 'tab',
      prompt: 'open another tab',
    },
    {
      text: "Pinning innocent stuff costs points, so don't just pin everything. Think like a detective, not a fire hose.",
    },
    {
      text: 'Stuck? Click my face in the corner and I will point at something. It costs ten points, so read first.',
    },
    {
      text: 'When you have a verdict, click a stamp on the right, or press R for RUG and L for LEGIT.',
    },
  ],
  'first-report': [
    { text: 'The report shows every red flag, the ones you caught and the ones you missed.' },
    {
      text: "Each flag you meet gets a page in your Notebook. That's the real prize: next time you'll see it coming.",
    },
  ],
  'first-legit': [
    { text: 'See? Not every token is a rug. Looking suspicious is not the same as being guilty.' },
    {
      text: 'A fixed tax, a silly username, a big pool wallet: yellow herrings. Learn to tell them apart.',
    },
  ],
  'first-wrong': [
    { text: 'Happens to the best of us. Read the report, learn the tell, get back on the horse.' },
  ],
  'first-daily': [
    {
      text: 'The daily case: same file for every detective in the city. One shot a day. Keep the streak alive.',
    },
  ],
  notebook: [
    { text: 'This is where the knowledge lives. Locked pages open as you run into new tricks.' },
    {
      text: 'Red flags can be drilled and herrings hunted from their pages. The last chapter is the handbook, in case I mumble.',
    },
  ],
  'case-files': [
    {
      text: 'Fifteen files, easy to nasty. Each verdict unlocks the next folder. Grades stick around, so replays count.',
    },
  ],
  'first-cold': [
    {
      text: 'This one came off the printer a second ago. New name, new contract, same tricks. It has its own tally and its own board.',
    },
  ],
  'first-weekly': [
    {
      text: "The weekly: one printed file, the same for every detective in the city until Monday. Its own top five, so don't rush it.",
    },
  ],
  settings: [
    {
      text: 'Relaxed mode kills the timer. No-magnifier mode prints the fine print for you. No shame in either. Office colours repaints the place.',
    },
  ],
  coffee: [
    {
      text: 'Easy on the coffee, partner. The evidence is not going to read itself, but you might.',
    },
  ],
  cat: [{ text: "That's Biscuit. She has never once solved a case. She is, however, the boss." }],
  browser: [
    {
      text: 'The phone runs NetScope. Explorer pages, the leaderboard, your wallet, the news. Mostly the news is nonsense.',
    },
  ],
  wallet: [
    {
      text: 'Connecting a wallet only shares your public address. I will never ask you to sign anything. Anyone who does is the case.',
    },
  ],
  leaderboard: [
    { text: 'Best runs in the city. Yours, mostly, until we wire up the precinct server.' },
  ],
  konami: [
    { text: 'A cheat code? In my office? Cute. No points for you, but here is some confetti.' },
  ],
  wall: [
    {
      text: 'Every case leaves a photo on the wall. This one is ours: how the office came together, night by night.',
    },
  ],
  radio: [
    {
      text: 'Numbers station. Someone out there has been tapping the same three digits all night.',
    },
    {
      text: 'Long beep is a dash, short is a dot. Five dashes make a zero. Work out the other two, then check under the desk.',
    },
  ],
  rogues: [
    {
      text: "Every face in this chapter walked off with somebody's savings. Fictional savings. Still: remember them.",
    },
  ],
  holder: [
    {
      text: "You're holding. That makes you family. Family still reads the contract. Look out the window on a clear night.",
    },
  ],
  'first-rush': [
    { text: 'Different game tonight. One page at a time, sixty seconds on the clock.' },
    {
      text: 'Every page hides at least one red flag. Find it, click it, next page. Each hit buys you three seconds.',
    },
    { text: 'Herrings cost you five. Blank paper costs two. Streaks multiply. Go.' },
  ],
  'story-1': [
    {
      text: "Two files down, and you didn't rug the honest one. Most rookies stamp everything red on night one.",
    },
    { text: 'The city has a lot of tokens and one of us. Keep the notebook close.' },
  ],
  'story-2': [
    {
      text: "Grandma's 'family'. I've seen those faces before, under different names, on a different coin.",
    },
    {
      text: "Somebody is running a template: same stock photos, same countdown, same 'anti-bot' blacklist. Watch for the same handwriting.",
    },
  ],
  'story-3': [
    {
      text: "TideWorks' compliance list. Vaultline's proxy. Grandma's family. Different masks, same hands.",
    },
    {
      text: "There's a name that keeps coming up in the chats, always deleted a minute later: the Tailor. Keep reading. Every file gets us closer.",
    },
  ],
  'story-4': [
    {
      text: 'Thirteen files. By now you can smell a template from the tokenomics page alone. The Tailor knows we can.',
    },
    {
      text: 'Two files left on the desk tonight. Read them twice. Nothing about them is what it looks like.',
    },
  ],
  'secret-unlocked': [
    {
      text: 'Every ordinary file on this desk, stamped right. Which is when this one showed up. No name on it.',
    },
    { text: 'Case files, bottom drawer. Take your coffee. Read it twice.' },
  ],
  'desk-tour': [
    { text: 'One file down. Since you are back at the desk: everything on it does something.' },
    {
      text: 'The phone is NetScope, the browser: explorer, the coin, the board, the news. The radio picks the station. The lamp is a lamp, mostly.',
    },
    {
      text: 'The cat is Biscuit. The polaroid on the corkboard is how this office got built. The safe under the desk is locked. For now.',
    },
    {
      text: 'The drawer holds the case files: a closed one can be reopened for a better grade. And if anything on this desk ever puzzles you, the notebook has a handbook.',
    },
  ],
  'secret-solved': [
    {
      text: "The Tailor's best suit, on your desk, stamped. Every thread of it stitched to look right.",
    },
    { text: "He'll cut another one. Different name, same seams. Now you know where to look." },
  ],
  'all-cases': [
    {
      text: 'Every file on this desk, closed. Keep the notebook close; the real ones look just like these.',
    },
  ],
};
