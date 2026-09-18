# Changelog

## v0.6 — the pile

- Cold cases: a procedural case generator (names, contracts, tokenomics, teams, chats,
  liquidity, audits assembled from the red-flag and herring libraries; difficulty sets how
  many flags and how much fine print). Endless play with its own board and badges, seeds
  shareable as `#cold=<seed>`; "the pile" folder in the drawer prints one. Difficulty grows
  with the number of campaign files you've solved (a `d<n>-` prefix in the seed pins it).
- Every other day the daily is a generated file seeded by the date (still the same for
  everyone); generated dailies count for the streak and the cold-case tally, never for the
  campaign or the rank.
- A WEEKLY folder in the drawer: this week's cold case, the same file for everyone
  (`#cold=week-<year>-w<week>`), marked closed once stamped.
- Drills: from any red-flag page in the notebook, five generated pages that all hide that
  flag. Clearing them logs the drill; the full set earns Drill Sergeant.
- Two more red flags (an upgradeable proxy behind one admin key; wash trading between the
  same two wallets) and two more herrings (a token that is only weeks old; a team of two).
  The generator plants them; the notebook teaches them.
- A hidden fifteenth file, "The Tailor" ($SEAM), opens once every ordinary case has been
  stamped correctly: a difficulty-5 rug where everything is stitched to look right. Lucien
  announces it; the drawer shows a nameless folder until then; Tailor-Made badge and late
  news headlines follow the story.
- Campaign story beats: Lucien connects the files after cases 2, 5, 10 and 13 (someone is
  running a template; the chats keep deleting a name).
- The coin page can show a price from an optional feed URL (plain, Jupiter or DexScreener
  JSON), read-only, cached a minute.
- Holder perks beyond cosmetics: northern lights over the city on clear nights, a `$` mark on
  the board, and a word from Lucien. Perks use the last balance the coin page saw. The coin
  page accepts any injected Solana wallet with Phantom's connect shape (Solflare, Backpack),
  still read-only.
- Rush decks mix in four generated pages a day; the results card explains the herrings you
  fell for; drills reuse the rush desk.
- The board page can save a Detective ID card (PNG); NetScope has an About page; the report
  shows how long a file took and the drawer remembers your fastest correct call per case;
  notebook flag pages keep your record (pinned vs missed).
- Touch: the lens floats above your finger while you hold the paper; no arrow cursor under a
  finger; the "more" / "up" hints at the foot of a document are tap targets; the wall,
  NetScope pages, the report and the ledger all scroll by dragging.
- Returning players get a one-line "new tonight" from Lucien after an update (the save
  remembers the last version it was opened with).
- Lucien gives a one-off reading tip the first time each kind of document lands on the desk,
  reminds you about a daily streak at risk, fidgets on the title and reviews the radio.
  Settings: "Lucien's remarks" switches the corner bubbles off without touching the hints.
- Snow and fog nights get a low wind bed with slow gusts.
- Share menus (report and rush) offer copy / share sheet, "Post on X" and "Telegram"
  (prefilled intents in a new tab); the report's also saves the card.
- Share uses the phone's share sheet where there is one; the clipboard elsewhere; a note
  with the text if neither works.
- Deleted chat messages leave a ghost of their text that only the lens can read.
- A case editor (`editor.html`): write a file against the game's schema with templates and
  live validation, download it for `src/data/cases/`, or save it into this browser's game
  (NetScope > RugScan > Your files, `#custom=<id>`).
- A social preview image (`public/img/og.png`) with Open Graph / Twitter card tags.
- Offline: a network-first service worker (production builds) keeps a desk you've opened
  once playable without a connection. Phaser ships in its own chunk.
- `server/leaderboard`: a reference Cloudflare Worker for the shared board (KV, per-board
  top 200, sanitising, rate limit, CORS), with tests against a fake KV.
- Dev builds keep the game loop stepping in a hidden tab (a worker drives it), so automated
  checks and long-running tests don't freeze.
- Wall photos: the rogues gallery, the radio, the nameless folder, a cold case, a drill.

## v0.5 — rush hour

- Red Flag Rush: an arcade mode. Sixty seconds, one page at a time, streak multipliers,
  its own board, three badges, Lucien's rules talk, a 3-2-1 countdown, a `#rush` deep link,
  a faster loop while it runs.
- A radio under the lamp: lo-fi / late jazz / static / off. The jazz station is a second
  arrangement of the loop (walking bass, ride, dorian noodling at 104 bpm); the static hides a
  numbers station beeping the safe combination in morse, and Lucien explains dots and dashes
  if you sit with it.
- Rogues gallery: a third notebook chapter with a WANTED poster for every rug you've called
  correctly (mugshot, charges, reward, CAUGHT stamp); the report announces new posters.
- Share now offers "Save card": a 1280x720 PNG of the report (stamp, grade, score, Lucien)
  for posting, next to the clipboard text.
- Two new cases: $NAPKIN (a renounce with an operator behind it, an audit for the wrong file)
  and $LNTRN (a loud, fee-charging festival token that is entirely fine). The drawer is three
  rows deep.
- The daily button counts down to tomorrow's case; confetti on an S grade; the title counts
  points to the next rank; the badges page shows progress on counter badges; toasts queue
  instead of stacking.
- A fly visits the lamp now and then (swat it); shooting stars on clear nights (catch one);
  more typed words on the title screen.
- The wall gets photos of the safe and the rush, and its last polaroid is a live photo of
  your own desk, taken as you open it. Scrolling moves the wall, not the camera.
- Fixed: pinned clues stay listed in the desk notebook (a quip had eaten the else branch).
  Pad releases in the music loop ramped from AudioParam.value (a burst in offline renders);
  they now ramp from their own level.

## v0.4 — the lively desk

- Notebook chapters (red flags + yellow herrings); report lines link to notebook pages.
- Per-case Lucien intros, distant sirens, music fade-in, denser snow.
- Export / import progress as a save code.
- A floor safe under the desk: crack the combination for the developer's ledger.
- The wall: a polaroid on the corkboard opens the game's own history as an evidence board
  (photos of every notable build joined by red string); `scripts/photograph.sh` +
  `__debug.snapshot()` add new frames.
- Fixed: closing an overlay with Esc no longer closes the screen behind it; shared keys are
  no longer destroyed by the dialogue box / browser.

- Detective Lucien: Pokémon-style dialogue, first-run tutorial, corner quips, report reviews,
  paid nudges ("Ask Lucien"), title-screen pokes.
- NetScope phone browser: RugScan token index + explorer pages (launch cases from it), the
  coin page with read-only Phantom connect and holder tiers, Hall of Detectives leaderboard
  (local, remote-ready) with calendar strip and personal record, fictional news, badges, help, 404.
- Weather outside the window (rain, thunderstorm, snow, clear, fog) from Settings or a click.
- Desk interactions and easter eggs: coffee sips, lamp, moon, corkboard tips, folders, ink
  pad, clock, cat (pets, strolls, naps), knocks on wood, typed words, Konami, credits.
- Twenty badges with toasts; rank-up celebration; share button with deep links
  (`#case=<id>`, `#daily`).
- Detective's honour hard mode (×1.25); music volume; music tension in the last 30 s.
- Two bonus cases ($GOOSE rug, $ARCV legit) and a new yellow herring (timelocked admin).
- Rendering at 2–3× with smooth text, FIT scaling, fullscreen (F), app icons + manifest,
  tap-vs-drag pinning for touch, unread tab dots, folder tooltips, difficulty pips.

## v0.3 — readability and vibe

- Hi-res text over pixel sprites, night-city window with rain/lightning and a cat, arcade SFX
  and a generated lo-fi loop, pin/page/stamp juice, examined counter, verdict banner.

## v0.2 — full MVP

- Ten cases, campaign progression, notebook glossary, daily case with streaks, settings,
  cosmetic unlockables, save system, README, CI.

## v0.1 — foundation

- Desk scene, magnifier lens with fine print, document views, pinning, stamps, scoring, report.
