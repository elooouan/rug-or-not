# Rug or Not?

A pixel-art noir detective game about spotting crypto scams, with Detective Lucien as your guide. Each case is a folder of
evidence on your desk: a contract snippet, tokenomics, a team page, a community chat log,
a liquidity report and sometimes an audit certificate. Read it through the magnifying
glass, pin the suspicious bits, stamp a verdict (**RUG** or **LEGIT**), and read the report.

> All cases, tokens, people and projects are fictional. This is a game, not financial advice.

## Run it

Requires Node 20.9+ (Vite 6 / Vitest 3 are pinned for Node 20; Vite 8 needs Node 20.19+).

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

| Script                   | What it does                                         |
| ------------------------ | ---------------------------------------------------- |
| `npm run build`          | Typecheck + production build into `dist/`            |
| `npm run preview`        | Serve the production build locally                   |
| `npm test`               | Vitest: scoring, rush, generator, save, cases, board |
| `npm run validate-cases` | Validate every case file and print a summary         |
| `npm run lint`           | ESLint                                               |
| `npm run format`         | Prettier                                             |

Production builds register a small network-first service worker (`public/sw.js`) so the game
keeps working offline after one visit. The game is a static site: deploy `dist/` anywhere (paths are relative, so it works
from a sub-folder). A GitHub Pages workflow is included in
`.github/workflows/deploy.yml`: enable Pages (Settings → Pages → Source: _GitHub Actions_)
and run the workflow from the Actions tab, or change its trigger to `push` to deploy on
every commit. CI (`.github/workflows/ci.yml`) runs lint, typecheck, case validation, tests
and a build on every push.

## Meet Detective Lucien

The mascot pops up Pokémon-trainer style with once-only guidance: the title intro, opening
the first folder, using the lens, pinning, switching tabs, stamping, reading the report, the
notebook, the daily case. Hints can be switched off or replayed in Settings. Source art lives
in `assets/`; the transparent in-game PNGs are in `public/img/`.

## The desk is alive

Hover the coffee to take a sip. Click the lamp (it has feelings after ten clicks), the window
(cycles the weather: rain, thunderstorm, snow, clear night, fog), the moon, the corkboard
(real detective tips), the folder stack, the ink pad (inks your cursor), the clock, and
Biscuit the cat on the sill. The title card has a few typed-word and Konami surprises, and the
version number hides the credits. There is also a floor safe with a three-digit combination
(the notebook counts the answer) holding the developer's ledger, and a radio under the lamp
that tunes between lo-fi, late jazz, static and off; sit with the static long enough and
you'll hear a numbers station tapping the combination in morse. Badges track all of it (NetScope > Badges).

## NetScope (the phone)

The phone on the desk opens an in-game browser:

- **RugScan** - an explorer page for the current case (flavour only, never a verdict).
- **The coin** - connect a Phantom wallet (Solflare and Backpack work too; read-only: public address, SOL and token balance
  via public RPC). Holder tiers unlock cosmetics: `VITE_TOKEN_HOLDER_MIN`+ tokens → gilded
  magnifier rim, 5× → mahogany desk, 10× → coin-gold lamp shade, plus the Shareholder badge,
  an aurora over the city on clear nights and a `$` after your name on the board. The last
  balance seen is remembered, so the perks survive reloads. The game never requests signatures
  or transactions; nothing about scoring changes.
- **Board** - Hall of Detectives. Local by default; set `VITE_LEADERBOARD_URL` to a JSON
  endpoint (`GET ?limit=N&mode=case|rush|cold` returns entries, `POST` accepts one) for a
  shared board. A ready-made Cloudflare Worker lives in
  [`server/leaderboard`](server/leaderboard/README.md) (one KV namespace, free tier, three
  commands to deploy). Pick your arcade-style handle on the page, and save a Detective ID card
  (a PNG with your rank, record and badges) from there.
- **News**, **Badges**, **Help**, and a 404 with a cat.

Configure the coin through env vars (see `.env.example`); nothing is hard-coded.

## Modes

- **Campaign**: fourteen cases in order (eight rugs, six legit, difficulty 1→5); each verdict
  unlocks the next folder. Stamp all fourteen correctly and a fifteenth folder with no name
  turns up in the drawer (`"secret": true` in its JSON keeps it out of the daily pool and
  RugScan until then).
- **Daily Case**: one case chosen deterministically from today's date (same for everyone),
  with a local streak counter. Daily plays don't unlock campaign folders.
- **Cold cases**: an endless pile of generated files (`src/systems/caseGen.ts`). Each is built
  from a seed, so a share link (`#cold=<seed>`) brings back the exact same file; every
  generated case passes the same schema as the handcrafted ones (400 seeds are validated in
  the tests). Cold cases unlock notebook pages but keep their own tally and board; they never
  touch the campaign or your rank. The drawer ends with "the pile" (a fresh cold case) and a
  WEEKLY folder: the week's cold case, identical for everyone, so boards can be compared.
- **Red Flag Rush**: sixty seconds, one evidence page at a time. Every page hides at least
  one red flag; click it to clear the page (+3 s), herrings cost 5 s, blank paper 2 s, streaks
  multiply up to ×3. Fine print is shown inline (no lens). Best score, longest streak and a
  separate top-five live on the Hall of Detectives page.
- **Detective's honour** (hard mode): no nudges from Lucien, no examined counter, no hover
  highlights; every run scores ×1.25 and is starred on the board.
- **Relaxed**: turn off timers in Settings. Reduced motion, lamp flicker, rain and a
  no-magnifier accessibility mode (fine print shown inline with a dotted underline) live there too.
- **Drills**: every red-flag page in the notebook has a "Drill this flag" button: five generated
  pages that all hide that flag, on a gentle clock. Clearing all five logs the drill (Drill
  Sergeant badge for the full set).
- **Detective's Notebook**: three chapters. Every red flag you meet in a report unlocks its
  glossary page; every yellow herring you run into fills the "looks scary, is fine" chapter;
  and every rug you call correctly pins a WANTED poster (procedural mugshot, charges, reward)
  in the rogues gallery.
  Flag and herring lines in a report are links straight to the page.
- **Progress**: everything lives in `localStorage`; Settings can export a save code to the
  clipboard and import one on another device.
- **Unlockables**: cosmetic desk woods, lamp shades, magnifier rims and stamp inks earned by
  rank, cases closed, grades, streaks and flags learned. They never affect gameplay.

## How to play

- **Hover** evidence with the magnifying glass. The lens shows a 2x view; some clues
  (fine print) are only legible through it.
- **Click** a suspicious line/row/message to pin it. Click again to unpin. Pins on empty
  paper count as false accusations.
- **Stamp** RUG or LEGIT by clicking a stamp or dragging it onto the paper.
- Keyboard: `Tab`/arrows cycle clue spots, `Enter` pins, `R`/`L` stamp, `1`–`6` switch
  documents, `PageUp`/`PageDown` or the wheel scroll long documents, `Esc` pauses, `F` toggles
  fullscreen.
- Rendering: the world is 640×360 pixel-art units drawn on a 2× (3× on retina) canvas so
  sprites stay chunky while text stays sharp; the canvas scales to fit the window.

Deep links: `#case=<id>` opens a file directly, `#daily` opens today's case, `#cold=<seed>` prints
that cold case and `#rush` starts a rush (the Share button
includes one in its clipboard text; its "Save card" option downloads a 1280x720 PNG of the
report instead). Dev builds expose `__debug.startCase('kelp')` and `__debug.audioLevels()` in the console.

Scoring lives in [`src/systems/scoring.ts`](src/systems/scoring.ts): +100 correct verdict,
−50 wrong, +25 per real red flag pinned (+10 if it was fine print), −15 per false
accusation, −10 per nudge bought from Lucien (max three), a time bonus in timed mode,
×1.25 in Detective's honour mode, and a letter grade S/A/B/C/D. Your total score is
the sum of your **best** run per case, so replays can't farm points.

## Project layout

```
src/
  main.ts           Phaser boot + integer scaling
  config/           palette.ts (the only colours), layout.ts (all layout numbers), gameConfig.ts
  art/              Procedural placeholder textures (swap for sprite sheets later)
  data/             flags.ts (red flag + herring library), schema.ts (zod), cases/*.json, unlockables.ts
  systems/          Pure logic: scoring, rush, caseGen (cold cases), secretCase, ranks, dailyCase, save,
                    settings, unlocks, badges, hints, leaderboard, wallet (Phantom, read-only), weather,
                    audio (synth SFX, lo-fi + jazz loops, radio static), shareCard, caseLoader
  ui/               Reusable Phaser components: DocumentView + documents/, Magnifier, Stamp, NotebookPanel,
                    DialogueBox (Lucien), BrowserPanel (NetScope), DeskBackground (window, cat, radio, safe…),
                    Vault, StickyNote, Toast, dragScroll…
  scenes/           Boot, Cursor (overlay), Title, CaseSelect, Investigation, Report, Notebook, Settings,
                    Rush (also drills), History (the wall)
scripts/            validate-cases.ts, snapshot.config.ts + photograph.sh (wall photos)
server/leaderboard  Reference Cloudflare Worker for a shared board
tests/              vitest
public/fonts/       Pixelify Sans + VT323 (both SIL OFL, licences included)
```

## Adding a case

1. Copy an existing file in `src/data/cases/` to `NN-my-case.json` (files load in name order,
   which is the campaign order).
2. Fill in `id`, `title`, `ticker`, `pitch`, `difficulty` (1–5), `verdict` (`rug` | `legit`),
   `timeLimitSec`, `documents[]` and a `debrief`.
3. Each document has a `type` (`contract`, `tokenomics`, `team`, `chat`, `liquidity`, `audit`),
   a `title`, type-specific `content` and `clues[]`.
4. Each clue needs an `id`, a short `label` (≤ 22 chars, shown in the notebook), an `anchor`,
   and either a `flagId` from `src/data/flags.ts` or `"herring": true` + a `herringId`.
   Set `"finePrint": true` and give it `text` to make it lens-only.

Anchors per document type:

| Type         | Anchor                                                                              |
| ------------ | ----------------------------------------------------------------------------------- |
| `contract`   | `{ "kind": "line", "line": N }` or `{ "kind": "row", "row": 0, "table": "header" }` |
| `tokenomics` | `{ "kind": "row", "row": N }` (allocation) or `"table": "notes"`                    |
| `team`       | `{ "kind": "row", "row": N }` (bio) / `"table": "photo"` / `"table": "note"`        |
| `chat`       | `{ "kind": "message", "index": N }`                                                 |
| `liquidity`  | `{ "kind": "row", "row": N, "table": "lock" \| "holders" \| "transfers" }`          |
| `audit`      | `{ "kind": "row", "row": 0-3, "table": "field" }` or `"table": "findings"`          |

Rules enforced by the schema: legit cases contain only herrings, rug cases contain at least
one red flag, anchors must be in range, clue ids must be unique, fine print needs `text`.

```bash
npm run validate-cases
```

Invalid files are also reported in the browser console at boot and skipped, so a broken
case never crashes the game.

## The wall (how the game evolved)

There is a polaroid pinned to the corkboard. Click it (or NetScope > Home > The wall) for
the evidence wall: one photo per notable build, joined by red string, each clickable for a
closer look and a caption. Frames are listed in `src/data/history.ts`; photos live in
`public/img/history/` (480×270 JPEG).

To photograph a build for the wall:

```bash
scripts/photograph.sh <commit-or-HEAD> [scratch-dir]   # serves that checkout on :5180
```

then in the browser console on http://localhost:5180 drive the game to the screen you want
and run `__debug.snapshot('13-v05-something')`. The dev server writes the file straight into
`public/img/history/`; add an entry to `HISTORY` with a version, date, title and caption.
(Without the snapshot server, `__debug.snapshot` downloads the JPEG instead.)

## Adding Lucien lines, tips, news, badges

- Dialogue scripts: `src/data/dialogue.ts` (`LUCIEN`, keyed by `ScriptId`; lines with
  `waitFor` need a matching condition in the scene). Title quips: `LUCIEN_QUIPS`. Per-case
  intro lines: the optional `intro` field in each case file.
- Corkboard tips: `src/data/tips.ts`. Headlines: `src/data/news.ts`. Badges: `src/data/badges.ts`
  (award with `awardBadge(scene, id)`; counters live in `save.stats`).

## Adding a red flag or unlockable

- Red flags: add an entry to `FLAGS` in `src/data/flags.ts` (title, explanation, how to
  spot it, severity). It appears in the Detective's Notebook once a player meets it.
- Unlockables: add to `src/data/unlockables.ts`. The `source` field is a tagged union; new
  source kinds only need a resolver in `sourceResolvers` (`src/systems/unlocks.ts`).
  Unlockables are cosmetic only.

## Licences

Code: MIT. Fonts: Pixelify Sans and VT323 under the SIL Open Font License
(`public/fonts/OFL-*.txt`).
