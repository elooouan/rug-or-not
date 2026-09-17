# Rug or Not?

A pixel-art noir detective game about spotting crypto scams. Each case is a folder of
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

| Script                   | What it does                                        |
| ------------------------ | --------------------------------------------------- |
| `npm run build`          | Typecheck + production build into `dist/`           |
| `npm run preview`        | Serve the production build locally                  |
| `npm test`               | Vitest: scoring, daily seeding, save, unlocks, cases |
| `npm run validate-cases` | Validate every case file and print a summary        |
| `npm run lint`           | ESLint                                              |
| `npm run format`         | Prettier                                            |

The game is a static site: deploy `dist/` anywhere.

## How to play

- **Hover** evidence with the magnifying glass. The lens shows a 2x view; some clues
  (fine print) are only legible through it.
- **Click** a suspicious line/row/message to pin it. Click again to unpin. Pins on empty
  paper count as false accusations.
- **Stamp** RUG or LEGIT by clicking a stamp or dragging it onto the paper.
- Keyboard: `Tab`/arrows cycle clue spots, `Enter` pins, `R`/`L` stamp, `1`–`6` switch
  documents, `PageUp`/`PageDown` or the wheel scroll long documents, `Esc` pauses.

Scoring lives in [`src/systems/scoring.ts`](src/systems/scoring.ts): +100 correct verdict,
−50 wrong, +25 per real red flag pinned (+10 if it was fine print), −15 per false
accusation, a time bonus in timed mode, and a letter grade S/A/B/C/D. Your total score is
the sum of your **best** run per case, so replays can't farm points.

## Project layout

```
src/
  main.ts           Phaser boot + integer scaling
  config/           palette.ts (the only colours), layout.ts (all layout numbers), gameConfig.ts
  art/              Procedural placeholder textures (swap for sprite sheets later)
  data/             flags.ts (red flag + herring library), schema.ts (zod), cases/*.json, unlockables.ts
  systems/          Pure logic: scoring, ranks, dailyCase, save, settings, unlocks, audio, caseLoader
  ui/               Reusable Phaser components: DocumentView + documents/, Magnifier, Stamp, NotebookPanel…
  scenes/           Boot, Cursor (overlay), Title, CaseSelect, Investigation, Report, Notebook, Settings
scripts/            validate-cases.ts
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

| Type         | Anchor                                                                       |
| ------------ | ---------------------------------------------------------------------------- |
| `contract`   | `{ "kind": "line", "line": N }` or `{ "kind": "row", "row": 0, "table": "header" }` |
| `tokenomics` | `{ "kind": "row", "row": N }` (allocation) or `"table": "notes"`             |
| `team`       | `{ "kind": "row", "row": N }` (bio) / `"table": "photo"` / `"table": "note"` |
| `chat`       | `{ "kind": "message", "index": N }`                                          |
| `liquidity`  | `{ "kind": "row", "row": N, "table": "lock" \| "holders" \| "transfers" }`   |
| `audit`      | `{ "kind": "row", "row": 0-3, "table": "field" }` or `"table": "findings"`   |

Rules enforced by the schema: legit cases contain only herrings, rug cases contain at least
one red flag, anchors must be in range, clue ids must be unique, fine print needs `text`.

```bash
npm run validate-cases
```

Invalid files are also reported in the browser console at boot and skipped, so a broken
case never crashes the game.

## Adding a red flag or unlockable

- Red flags: add an entry to `FLAGS` in `src/data/flags.ts` (title, explanation, how to
  spot it, severity). It appears in the Detective's Notebook once a player meets it.
- Unlockables: add to `src/data/unlockables.ts`. The `source` field is a tagged union; new
  source kinds only need a resolver in `sourceResolvers` (`src/systems/unlocks.ts`).
  Unlockables are cosmetic only.

## Licences

Code: MIT. Fonts: Pixelify Sans and VT323 under the SIL Open Font License
(`public/fonts/OFL-*.txt`).
