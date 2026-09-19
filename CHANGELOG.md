# Changelog

## v0.8 — the handbook

- The desk opens up a piece at a time: a fresh save sees the folder, the daily, the notebook
  and settings. The drawer turns up after the first closed file (Lucien's tour covers it),
  Red Flag Rush after the second, cold cases after the third, the weekly after the fourth,
  each with a word from Lucien and a toast the first time. Saves that already had it all
  keep it all; shared links skip the gate.
- A handbook: the notebook's fourth chapter, eighteen short pages on how the office works
  (lens, pins, tabs, stamping, scoring, hints, notebook, daily, drawer, cold cases, weekly,
  rush, the phone, the coin, badges, sharing, desk toys). "How to play" on the title opens
  it; pages about things not yet on the desk say when they turn up.
- Screens dip to dark on the way out as well as fading up on arrival (a double-click on a
  button can't start two screens any more). The wall's last polaroid, tonight's desk, has a
  "Save this photo" button so it can leave the office as a PNG.
- A brand-new save starts with reduced motion on when the system asks for it
  (`prefers-reduced-motion`); after that it's the player's setting.
- Esc mid-rush asks first ("Esc again to leave") so a stray press can't throw a run away.
- The detective name picker takes typing: letters and digits fill the slots, Backspace
  clears, arrows move and spin, Enter saves, Esc cancels. Typed letters there no longer
  reach the desk's easter eggs or the M/F hotkeys.
- The board page opens with the desk's own log: the last six files, newest first, whatever
  the board is set to.
- Three new badges: Herring Hunter (every hunt done), Decorator (all five office colours
  tried) and Hindsight (five second looks); the badges page counts progress for each.
- Herring hunts: every yellow herring page in the notebook can print five pages that each
  carry that herring, and the job is to click the thing that only looks bad. Red flags on
  those pages cost seconds, like herrings do in the rush. Hunting them all earns Herring
  Hunter. The generator can be asked for a herring the way drills ask for a flag.
- The drawer keeps the last run of every file: the grade sticker on a closed folder opens
  that run's report again, second look included. (The fastest-call record also survives a
  slower replay now; it used to be dropped.)
- The second look: when a report has a missed flag or a false accusation, a line on it
  (or the S key) opens the file again read-only, with the run's pins where they were and every missed
  flag marked in amber (tabs with marks keep a dot). Clicking a mark gets the flag or the
  herring explained in Lucien's bubble; the fine print still needs the lens. Esc or "Back
  to report" returns to the report, which lands quietly the second time.
- A new red flag in the library and the printer: "Trading switch in one hand", a
  tradingOpen flag the owner (or the operator behind a fake renounce) can flip with nothing
  that reopens it. The notebook, the drills, the rush decks and the safe's combination all
  count it. A corkboard tip to match. Its yellow twin joins the herrings: an emergency
  pause that only the public timelock can pull and that lifts itself within 48 hours.
- Asking Lucien twice about the same page makes him point at the line (the focus ring lands
  on an unread spot); the first nudge still only names the page.
- A faint crawl of film grain over the office (Office page of Settings; off with reduced
  motion).
- Settings is two pages now: Game (sound, modes, Lucien, pointer size) and Office (colours,
  weather, lamp, cosmetics, save export/import/reset). A "Pointer size" row makes the
  pointer half again as big.
- Office colours: five looks for the whole place (Noir, Old file, Blue hour, Newsprint,
  Speakeasy) under Settings. Everything is redrawn in the new palette on the spot; a change
  made from a paused file waits for the title.
- Phantom's mark on the wallet buttons; buttons can carry an icon. The title chip says
  which wallet it will connect.
- The pause menu opens by itself when another window takes the focus mid-file; the rush
  just holds its clock until you're back.
- Lucien introduces the first cold case and the first weekly, and tells rookies what the
  red dots on the tabs and the examined counter mean. A printed file's long pitch stays on
  the folder label. The printer's pools are wider: more pitches, traits, chat lines,
  questions, names and auditors.
- Wallet: the refresh button is throttled and says when it's busy; switching Phantom to an
  account this site isn't approved for clears the stale address and says so; RPC, price
  and board calls give up after a few seconds instead of hanging the page; the help page
  and the coin page point phone users at Phantom's in-app browser.
- Small readability pass: the notebook's section headings, the phone's placeholder lines,
  the rush card's hints and the sticky notes use the darker ink instead of the faint one.
  Every settings row now has a line under it saying what it does.
- The pile folder shows tonight's printer difficulty; the weekly folder counts the days
  until the next one. A story beat after the seventh file, between the template and the
  name.
- Drawer folders wrap their title onto a second line instead of cutting it mid-word, and
  the grade sticker sits in the corner, clear of long tickers.
- Notebook pages taller than the book scroll (wheel or drag over the page, a "v more"
  mark at the corner); the small section headings are darker and read at a glance.
- The title's Fullscreen button stays hidden where the browser can't do fullscreen (iPhone
  Safari); the wallet chip takes its corner.
- On a touch screen the desk's hints say tap and hold instead of click, hover and type
  (the title's footer, the desk's key line, the rush's), and Lucien's lessons do too: the
  first file's tour talks about sliding a finger, tapping a clue and dragging a stamp.
- Fixed (touch): a finger dragging to scroll the report, a phone page or a notebook page
  fired whatever button or link it started on. Buttons and report lines now fire when a
  finger lifts where it landed; a mouse still fires on the press.
- Fixed: with the lens off (the no-magnifier setting, and every rush page) fine print that
  wrapped to a second line ran into the row below it; rows now make room. The desk's key
  hint no longer mentions the lens when there isn't one.
- Fixed: a lesson left up on a screen that then opened the notebook or settings over it
  (the report's Notebook button, say) kept its hold on Esc, so Esc did nothing in the
  overlay until the Back button was clicked. Esc claims now belong to the box, panel or
  safe that made them, lapse when it dies, and don't count while its screen is paused
  under another. The desk's Menu button no longer opens the pause menu over a lesson.
- Fixed: a desk quip (the coffee, the cat, the radio) landing while one of Lucien's chained
  lessons was up (the report's, on a wrong verdict) crashed the screen with a half-built
  dialogue box. The lesson's follow-up wins now, and the quip keeps its turn for later.
  Found by the monkey test, which now also aims clicks at real buttons and lines.
- Fixed: a toast with a long line ("Silver rim · Settings, Office page") ran off the right
  edge of the screen; the card now grows to fit its text.
- Fixed: closing the pause menu or the phone with a click over the paper dropped a stray
  pin (and cost 15 points) on the release; a release now only counts where the press began.
- Fixed: changing a cosmetic (rim, ink, wood, lamp) in Settings left the pointer overlay
  holding textures that no longer existed, which threw on every frame afterwards and could
  lock the whole tab up on the next screen change. Found by a new monkey test
  (`scripts/fuzz.mjs`) that clicks and types at random and reports what breaks.

## v0.7 — night shift

- Wallet: a "Connect wallet" chip on the title (it opens the coin page on the phone), silent
  reconnect for a wallet you linked before, plain messages for cancelled or locked wallets,
  a warning when the RPC is on the wrong network, and the page says what connecting does
  before you do it. Still read-only.
- Token foundation: one entitlement layer decides what holding unlocks (three tiers), with a
  dev-only mock balance to try it before launch. First real utility: a second weekly cold
  case for holders, plus your tier title on the ID card.

- Fixed: the pointer could vanish after a fullscreen toggle or a resize under the mouse
  (the cursor overlay now trusts any move over the canvas); the lens could re-activate under
  the pause dim or the phone and follow the mouse into the report (it now only runs while
  the paper is in play and lets go when the scene ends); the pointer ring has a dark halo
  so it reads on the wall as well as on paper.
- Fixed: Lucien could end up squashed or stretched after fast clicks through a dialogue
  (every squish now returns to his resting size); on the title his corner bubble sat a
  second head on top of him; the "glance at the window" mirror-flip is now a heel bounce;
  a new dialogue replaces the one on screen instead of stacking a second box (and a second
  Lucien) on top of it.

- Streak freezes: every seventh daily in a row earns one (two at most); a freeze quietly
  bridges a single missed night. The report says when one is earned or spent; the board
  shows what's in hand.
- Back on the title after the first case, Lucien gives a once-only tour of the desk (phone,
  radio, cat, polaroid, safe). Drills can start from a report's notebook links; the rush
  names the flag on every hit; the help page covers the weekly, drills and custom files.
- Seasonal dressing: a pumpkin by the mug in the last week of October, fairy lights in the
  window from December 10th. PixelForge carries the young-token herring.
- Promotions get confetti; unlock toasts say where to equip the thing; Lucien's rookie
  remarks (first pin, unpin, idle nudge toward the lens) stop after the first few files.
- The case clock waits while Lucien is talking, so the tutorial no longer eats the timer.
  With the lamp off the desk actually goes dark.
- Suspicions in the desk notebook are links: click one to jump back to that clue. Buttons
  press down a pixel (and take a slightly bigger tap on touch screens); tabs and the drawer's
  special folders lift under the pointer; screens fade up from the dark; dust drifts through
  the lamplight.
- The window has more life: the moon shows the real calendar phase, a lit night train
  crosses the horizon now and then (Biscuit watches it), a plane blinks across clear skies,
  clouds drift over the moon when it rains or snows.
  The desk clock keeps real time on the title. New typed words on the title: biscuit, train,
  plane, tailor, safe; the footer hint rotates.
- The page shows the title while the engine downloads instead of a blank dark screen.
- M mutes from any screen (the volume setting is kept for when it comes back; the settings
  page shows the mute and clears it when you touch the volume).
- Editor: "Save & play". Generated chats sometimes have a deleted question the lens can read.
- Once a mint is configured, the board page can show holders only.
- Board handles pass a light word filter (client and worker); the weekly file sits at
  difficulty 3-4; the pile and the weekly have P / W hotkeys in the drawer.

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
  (`#cold=week-<year>-w<week>`), marked closed once stamped, with its own top five on the
  board page.
- Drills: from any red-flag page in the notebook, five generated pages that all hide that
  flag. Clearing them logs the drill; the full set earns Drill Sergeant.
- Two more red flags (an upgradeable proxy behind one admin key; wash trading between the
  same two wallets) and two more herrings (a token that is only weeks old; a team of two).
  The generator plants them; the notebook teaches them.
- A new case, $TRAM "The Night Tram" (d4): honest code behind an upgradeable proxy with one
  admin key, wash-traded volume, a countdown that resets; a real team of two and a real lock.
- A hidden sixteenth file, "The Tailor" ($SEAM), opens once every ordinary case has been
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
- Rush decks mix in four generated pages a day; every hit names the flag as it goes by; the
  results card explains the herrings you fell for; drills reuse the rush desk.
- The board page can save a Detective ID card (PNG); NetScope has an About page; the report
  shows how long a file took and the drawer remembers your fastest correct call per case;
  notebook flag pages keep your record (pinned vs missed).
- Touch: the lens floats above your finger while you hold the paper; no arrow cursor under a
  finger; the "more" / "up" hints at the foot of a document are tap targets; the wall,
  NetScope pages, the report and the ledger all scroll by dragging.
- Returning players get a one-line "new tonight" from Lucien after an update (the save
  remembers the last version it was opened with).
- On the title, Lucien points at a drill for the flag that keeps getting past you (missed
  more than pinned, never drilled) when there is no streak to nag about.
- Lucien gives a one-off reading tip the first time each kind of document lands on the desk,
  reminds you about a daily streak at risk, fidgets on the title and reviews the radio.
  Settings: "Lucien's remarks" switches the corner bubbles off without touching the hints.

- Share menus (report and rush) offer copy / share sheet, "Post on X" and "Telegram"
  (prefilled intents in a new tab); the report's also saves the card.
- Snow and fog nights get a low wind bed with slow gusts.
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
- Playwright smoke tests (`npm run e2e`): boot, a full case to the report, rush and cold deep
  links, the editor; CI runs them after the unit tests.
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
