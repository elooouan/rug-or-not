# Changelog

## v0.5 — rush hour

- Red Flag Rush: an arcade mode. Sixty seconds, one page at a time, streak multipliers,
  its own board, three badges, Lucien's rules talk, a 3-2-1 countdown.
- A radio under the lamp: lo-fi / late jazz / static / off. The jazz station is a second
  arrangement of the loop (walking bass, ride, dorian noodling at 104 bpm); the static hides a
  numbers station beeping the safe combination in morse, and Lucien explains dots and dashes
  if you sit with it.
- Fixed: pad releases in the music loop ramped from AudioParam.value (a burst in offline
  renders); they now ramp from their own level.
- Rogues gallery: a third notebook chapter with a WANTED poster for every rug you've called
  correctly (mugshot, charges, reward, CAUGHT stamp); the report announces new posters.
- Share now offers "Save card": a 1280x720 PNG of the report (stamp, grade, score, Lucien)
  for posting, next to the clipboard text.
- Two new cases: $NAPKIN (a renounce with an operator behind it, an audit for the wrong file)
  and $LNTRN (a loud, fee-charging festival token that is entirely fine). The drawer is three
  rows deep.
- Rush plays the loop faster, has a Share button and a `#rush` deep link; the daily button
  counts down to tomorrow's case; notebook flag pages remember how often you missed them.
- A fly visits the lamp now and then (swat it); shooting stars on clear nights (catch one);
  more typed words on the title screen.
- Holder perks beyond cosmetics: northern lights over the city on clear nights, a `$` mark on
  the board, and a word from Lucien. Perks use the last balance the coin page saw.
- A hidden fifteenth file, "The Tailor" ($SEAM), opens once every ordinary case has been
  stamped correctly: a difficulty-5 rug where everything is stitched to look right. Lucien
  announces it; the drawer shows a nameless folder until then.
- Deleted chat messages leave a ghost of their text that only the lens can read.
- Campaign story beats: Lucien connects the files after cases 2, 5, 10 and 13 (someone is
  running a template; the chats keep deleting a name). Confetti on an S grade; the title
  counts points to the next rank; Lucien fidgets and reviews the radio.
- The badges page shows progress on counter badges (1/5, 3/14...).
- Toasts queue instead of stacking on top of each other.
- The wall gets photos of the safe, the rush and the rogues gallery, and its last polaroid
  is now a live photo of your own desk, taken as you open it. Scrolling moves the wall, not
  the camera, so Lucien and the buttons stay put.
- Fixed: pinned clues stay listed in the desk notebook (a quip had eaten the else branch).

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
