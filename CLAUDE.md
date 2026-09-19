# Working on Rug or Not?

Persistent instructions for Claude Code in this repository. Read this before touching code.

## What this is

A Phaser 3 + TypeScript pixel-noir detective game (Vite 6, Vitest 3, Playwright, Node 20.9).
World is 640×360 rendered at 2–3× (`RENDER_SCALE`); sprites stay NEAREST, text is rasterised
sharp. `README.md` describes every system; `CHANGELOG.md` is the running history.

Key places:

- `src/scenes/` — one file per screen. `CursorScene` is the always-on-top pointer/lens overlay;
  every scene calls `setupScene(this)` first (camera zoom + cursor on top).
- `src/ui/` — reusable pieces. `DeskBackground` (window, weather, cat, radio, safe, fly…),
  `DialogueBox` / `LucienBubble` (the mascot), `BrowserPanel` + `browser/pages` (NetScope),
  `Magnifier`, `DocumentView` + `documents/`, `PixelButton`, `Toast`, `squish` (mascot bounce).
- `src/systems/` — pure logic: `scoring`, `rush`, `caseGen` (cold cases), `dailyCase`,
  `save` (schema + sanitising), `leaderboard`, `audio` (all sound is synthesised), `wallet`.
- `src/data/` — `flags.ts` (red flags + herrings), `dialogue.ts` (Lucien's lines), `cases/*.json`
  (validated by `src/data/schema.ts`), `badges.ts`, `history.ts` (the wall).
- `src/config/` — `layout.ts` (every position), `palette.ts` (the only colours), `depth.ts`.
- `tests/` (Vitest), `e2e/` (Playwright), `scripts/` (case validation, wall photos).

## Credit-efficiency rules

- Inspect the existing code before changing anything; `grep` for the symbol, read the
  surrounding function, then edit. Don't read the whole repository.
- Before editing, identify the smallest set of files likely to be relevant and stay there.
- Reuse existing components, utilities, styles, palette keys, textures and patterns. Don't
  create a new file when an existing one can reasonably be extended.
- No new dependencies unless genuinely necessary.
- Group related changes into one coherent implementation, not many tiny edits.
- No speculative changes: have evidence (a repro, a screenshot, a failing check) that the
  change improves the game.
- Fix the root cause; don't patch the same symptom twice.
- Don't rewrite or refactor working systems for style. Preserve the visual identity.
- Don't repeat expensive commands. Cheapest validation first: `npx tsc --noEmit -p .` and
  `npx eslint <changed files>`, then `npx vitest run <affected test>`; the full suite, the
  build and `npm run e2e` only when a batch is done or the change is broad.
- After a change, exercise the affected functionality (dev server + browser pane, or the
  matching test), not unrelated parts of the game.
- If a check fails for an unrelated, pre-existing reason, note it and move on unless it
  blocks the work.
- Keep explanations short. Report findings, changes, what was tested, and what's left.

## Workflow

1. Inspect the relevant files.
2. Pick the highest-value improvement.
3. Make the smallest sensible change.
4. Test the affected functionality (see "Testing tips").
5. Fix any regression you introduced.
6. Commit coherent changes.
7. Move on to the next worthwhile improvement.

## Priorities

1. Bugs and broken interactions.
2. Cursor disappearance and interaction-state problems (`CursorScene`, `Magnifier`).
3. Inconsistent Lucien rendering, animation, positioning or behaviour (`DialogueBox`,
   `LucienBubble`, `TitleScene` idle, `squish`).
4. Gameplay feel and responsiveness.
5. UI/UX and visual feedback.
6. Backgrounds, atmosphere, animation, polish (`DeskBackground`, `art/`).
7. Existing easter eggs first; new ones only when they fit the desk.
8. New functionality only when it meaningfully improves the game.

## Quality rules

Don't: add filler features, over-engineer simple problems, endlessly tweak what already
looks good, add abstractions, change unrelated code, trade performance for superficial
effects, or make architectural changes without a clear reason.

Do: preserve the design language (palette, pixel scale, paper/wood/noir tone), keep
animations intentional and short, keep Lucien consistent (one mascot on screen at a time,
every squish returns to rest), make interactions respond immediately, check UI edge cases
(paused, overlays, dialogue open, touch), preserve existing functionality.

## Testing tips

- Dev server: `npm run dev` (port 5173). Set `localStorage['rug-or-not:dev-mute'] = '1'` on
  the origin (from any page on it, e.g. `/favicon-32.png`) so the game starts silent in the
  browser pane: it survives reloads and save resets. Dev builds expose `window.__game` and `__debug`
  (`startCase(id)`, `snapshot(name)`, `audio`, `audioLevels()`, `wallet`). To test wallet
  flows without Phantom, inject a fake `window.phantom.solana` (connect/disconnect/on) and
  stub `fetch` for the RPC, then drive `__debug.wallet`; `VITE_TOKEN_MOCK_BALANCE` fakes a
  holder balance for perks.
- In the browser pane drive the game with synthetic DOM events on the canvas (world→canvas
  scaling by the canvas rect); synthetic `KeyboardEvent`s must define `keyCode`, and send
  them one per frame (Phaser re-runs its whole key queue on every DOM key event until the
  next game step, so several keys fired in one JS tick reach handlers more than once). The pane's
  document is usually hidden: a dev-only worker pump keeps the game loop running, but page
  `setTimeout`s are throttled to about a second, so don't time anything under 1 s with them
  (read game state instead).
- Dynamic `import('/src/...')` from the console can give a different module instance than
  the game's; read state from scene objects instead.
- Touch: Phaser only listens for touch events when the device reports touch at boot, so in
  the browser pane set a viewport under 768 px wide (touch emulation) and reload before
  dispatching synthetic `TouchEvent`s on the canvas; in Playwright use `test.use({ hasTouch:
true })` (see the touch block in `e2e/smoke.spec.ts`). Fingers fire buttons on lift, so a
  drag that starts on a button scrolls instead; `emit('pointerdown')` with no pointer is
  the mouse path and fires at once.
- CI runners render through software GL: e2e waits must be condition-based (see `e2e/`).
- `node scripts/fuzz.mjs [seconds] [seed]` (dev server up) is a monkey test: random clicks,
  keys, wheel and drags across the game; it prints page errors with the scene, and heap
  jumps. A crash is deterministic per seed: `FUZZ_TRACE=<n>` prints actions from n on,
  `FUZZ_WATCH=<n>` pauses the page with the debugger during action n and prints the stack.
- `node scripts/promo.mjs` (dev server up) regenerates the marketing stills and GIF clips in
  `assets/marketing/`; add an entry there when a feature deserves a tweet. Regenerate only
  what changed (`node scripts/promo.mjs <name>`): every GIF committed again is a few more
  MB of history.
- `node scripts/sweep.mjs [cold=24]` (dev server up) plays every campaign file and a batch of
  printed ones perfectly and reports page errors and anything that doesn't grade S: run it
  after touching documents, the generator, scoring or the report. `SWEEP_INLINE=1` plays
  with the lens off (fine print laid out inline, as in the rush); `SWEEP_LOOK=1` also takes
  the report's second look on every campaign file.
- Wall photos: `SNAP_ROOT=$PWD npx vite --config scripts/snapshot.config.ts --port 5180`, then
  `__debug.snapshot('NN-vXX-name')` and a frame in `src/data/history.ts`.

## Commits

Short, natural, imperative-ish subject describing what actually changed (see `git log`).
No AI/tool attribution, no "generated by", no trailers, no exaggeration. One coherent change
per commit; run the cheap checks before committing.
