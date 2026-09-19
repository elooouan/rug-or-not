# Tweet queue

Rendered from `queue.json` (edit that, then `node scripts/queue.mjs`). Times are Paris.
`{PLAY_URL}` becomes the game link; media lives in this folder.

## Mon 21 Sept, 09:00  ·  `intro-thread`  ·  pin

**1/7** (254)

> I made a detective game about rug pulls.
> 
> A folder lands on your desk: contract, tokenomics, team page, chat log, liquidity report. You read it through a magnifying glass, pin the red flags, and stamp RUG or LEGIT.
> 
> The detective is Lucien. He has a cat.

media: v0.8-clip-solve-a-case.gif

**2/7** (209)

> Fine print only shows through the lens. A sell tax that can change. An address that isn't the one it claims to be. A lock that expires next week.
> 
> Move slowly. Anything that turns amber is worth a second look.

media: v0.8-lens-fine-print.png

**3/7** (186)

> The report shows every flag: the ones you caught and the ones you walked past. Miss one and it offers a second look at the same paper, your pins where you left them, the misses in amber.

media: v0.8-clip-second-look.gif

**4/7** (204)

> 18 red flags, 15 yellow herrings (things that look scary and are fine), 16 written cases, and a printer that makes up cold cases forever.
> 
> Red Flag Rush: sixty seconds, one page at a time, click the flag.

media: v0.8-clip-red-flag-rush.gif

**5/7** (184)

> Everything on the desk does something. Coffee, lamp, window (it has weather), the cat, a radio with a numbers station, a safe, and a phone that runs a fake browser with a market on it.

media: v0.8-clip-desk-toys.gif

**6/7** (173)

> Files pay paper clips. Clips buy Lucien a coat, the cat a new fur, the desk a globe. It's a desk; dress it.
> 
> Nothing bought changes a score. Nothing in the game costs money.

media: v0.9-clip-market-shopping.gif

**7/7** (142)

> It's free, it runs in a browser, phones work sideways. All cases are fictional. This is a game, not financial advice.
> 
> {PLAY_URL}

## Mon 21 Sept, 15:30  ·  `flag-1`

(266)

> Red flag of the day: owner-only unlimited mint.
> 
> One address can print tokens whenever it likes. "Fixed supply" in the pitch, `mint(uint256)` with `onlyOwner` in the contract. The pitch is a JPEG; the contract is the contract.
> 
> Lucien: read the code before the chat.

media: v0.8-red-flag-trading-switch.png

## Mon 21 Sept, 21:00  ·  `desk-alive`

(176)

> The office at night. The window cycles through rain, storm, snow, fog and a clear night with a moon you can click. A train crosses the horizon now and then. Biscuit watches it.

media: v0.8-clip-weather.gif

## Tue 22 Sept, 09:00  ·  `devlog-coats`

(269)

> How the coats work: Lucien is one PNG. The market finds the trench cloth by colour (a hue band, a saturation floor) and splits it into connected pieces: the one that starts up top is the hat, the rest is the coat. Skin and brass stay. Seven coats, six hats, no new art.

media: v0.9-market-page.png

## Tue 22 Sept, 15:30  ·  `quiz-1`

(200)

> Rug or Not? #1
> 
> From the contract:
> 
> function setSellTax(uint256 t) public onlyOwner {
>   sellTax = t;
> }
> 
> The pitch says "1% tax, fixed".
> 
> Stamp it in the replies: RUG or LEGIT. Answer tomorrow morning.

## Tue 22 Sept, 21:00  ·  `rush-clip`

(196)

> Red Flag Rush. Sixty seconds, one evidence page at a time, click the red flag. Herrings cost five seconds, blank paper two, streaks multiply. Then the notebook remembers what you keep falling for.

media: v0.8-red-flag-rush.png

## Wed 23 Sept, 09:00  ·  `quiz-1-answer`

(226)

> Yesterday's file: RUG.
> 
> A tax the owner can set is a tax the owner can set to 99%. "Fixed" means a constant, or no setter at all. This one had a setter, no cap, no timelock.
> 
> The report in the game says the same thing, slower.

media: v0.8-case-report.png

## Wed 23 Sept, 15:30  ·  `board`

(244)

> The Hall of Detectives. Your runs under a handle, a 14-day streak strip, the rush and cold-case boards, and now one row per desk: career score, rank, clips earned, files solved. Sort by score or by clips.
> 
> Arcade names only. No email, no login.

media: v0.9-hall-of-detectives.png

## Wed 23 Sept, 21:00  ·  `rogues`

(146)

> Every rug you call correctly puts a face on the wall. Wanted posters with charges and a reward, generated per case.
> 
> The Tailor is still at large.

media: v0.8-rogues-gallery.png

## Thu 24 Sept, 09:00  ·  `flag-2`

(252)

> Red flag of the day: the honeypot.
> 
> Anyone can buy. Only approved addresses can sell. The chart only goes up because nobody can take profit, until the owner does.
> 
> Where it hides: a transfer hook with a whitelist check, or a "cooldown" that never ends.

media: v0.8-pins-and-suspicions.png

## Thu 24 Sept, 15:30  ·  `wallet-stance`

(262)

> The game connects to Phantom read-only. It learns your public address and reads two balances. It never asks you to sign anything, never sees a seed phrase, and plays exactly the same without a wallet.
> 
> A game about rugs that asked for a signature would be a rug.

media: v0.9-coin-page-phantom-connected.png

## Thu 24 Sept, 21:00  ·  `second-look`

(225)

> "Missed: in Tokenomics" used to be the whole lesson. Now the file comes back read-only with your pins where they were and every miss in amber. Click one and Lucien explains why it mattered. Nothing counts; it's for next time.

media: v0.8-second-look.png

## Fri 25 Sept, 09:00  ·  `herring-hunt`

(237)

> Half of learning to spot rugs is learning what's fine. A small fixed tax. A team of two. A liquidity pool that's the top holder. An audit that lists minor findings.
> 
> Herring hunts: five printed pages, click the thing that only looks bad.

media: v0.8-clip-herring-hunt.gif

## Fri 25 Sept, 15:30  ·  `quiz-2`

(215)

> Rug or Not? #2
> 
> From the liquidity report:
> 
> Pool: TOKEN / USDC
> Liquidity: $614,000
> Locked 100% via LockBox until Sep 2028
> Top holder: the liquidity pool (34%)
> 
> Stamp it in the replies: RUG or LEGIT. Answer tomorrow.

## Fri 25 Sept, 21:00  ·  `office-colours`

(199)

> Five office colours: Noir, Old file, Blue hour, Newsprint, Speakeasy. The whole desk is drawn from twelve named colours, so a theme is twelve new values and a repaint. Lucien has opinions about each.

media: v0.8-clip-office-colours.gif

## Sat 26 Sept, 12:00  ·  `saturday-1`

(135)

> The detective's desk, four ways. A pixel-noir game about spotting rug pulls, all in a browser.
> 
> #screenshotsaturday #pixelart #indiedev

media: v0.9-dressed-desk.png, v0.8-theme-midnight-reading.png, v0.8-weather-snow.png, v0.8-rogues-gallery.png

## Sat 26 Sept, 20:00  ·  `quiz-2-answer`

(205)

> Yesterday's file: LEGIT, on this page at least.
> 
> Liquidity locked for two years with the pool as top holder is the boring, good kind of paperwork. You still read the contract. One page never clears a case.

media: v0.8-cold-case-printed-file.png

## Sun 27 Sept, 12:00  ·  `the-wall`

(181)

> Behind the corkboard is the making-of: a polaroid for every notable build since the first night, red string and all. 29 photos, 430-odd commits, ten days.
> 
> Click one to look closer.

media: v0.8-the-wall-making-of.png

## Sun 27 Sept, 20:00  ·  `lucien-says-1`

(92)

> Lucien, on being asked whether a coin will go up:
> 
> "Wen? When you have read the tokenomics."

media: v0.8-title-first-night.png

## Mon 28 Sept, 09:00  ·  `devlog-week`

(277)

> Shipped last week (v0.9): paper clips as currency, a market with 39 things, a try-on strip, a daily deal, a detectives board, deep links, a secret badge for an all-gold look, and a bug where asking Lucien for help cost points and said nothing if you'd muted his remarks. Fixed.

media: v0.9-market-page.png

## Mon 28 Sept, 15:30  ·  `flag-3`

(237)

> Red flag of the day: liquidity that isn't locked, or a lock that expires next week.
> 
> The lock is the promise that the pool won't be pulled. "Locked" with an expiry in nine days is a countdown, not a promise. Read the date, not the badge.

media: v0.8-cold-case-printed-file.png

## Mon 28 Sept, 21:00  ·  `handbook`

(199)

> Too many features, someone said. Fair. So the desk opens up a piece at a time now, and the notebook grew a handbook: nineteen short pages on how the office works. "How to play" on the title opens it.

media: v0.8-clip-handbook.gif

## Tue 29 Sept, 09:00  ·  `drawer`

(216)

> The drawer: sixteen written files, a pile of printed ones that never runs out, a weekly file everyone gets the same seed for. Every closed folder keeps its last run; the sticker in the corner opens that report again.

media: v0.8-case-files-drawer.png

## Tue 29 Sept, 15:30  ·  `quiz-3`

(192)

> Rug or Not? #3
> 
> From the team page:
> 
> "Ownership renounced."
> Roles in the contract: OPERATOR (can pause transfers). Held by: 0x4b1...e2.
> 
> Stamp it in the replies: RUG or LEGIT. Answer tomorrow.

## Tue 29 Sept, 21:00  ·  `title-intro`

(171)

> The first night. The lamp clicks on, the case file slides in, and Lucien explains the job in four lines. After that he only speaks when something new turns up on the desk.

media: v0.8-clip-title-intro.gif

## Wed 30 Sept, 09:00  ·  `quiz-3-answer`

(186)

> Yesterday's file: RUG.
> 
> "Renounced" is about one role. If another role can pause transfers, nothing was given up; the button changed hands. Look for every role, not the one in the tweet.

media: v0.8-notebook-red-flags.png

## Wed 30 Sept, 15:30  ·  `try-on`

(252)

> Hover a coat (tap it on a phone) and he wears it before you buy it. One item a day is a third off, the same one for everyone. Coin holders pay half. That's the whole economy: clips from closed files, dressing for the desk, nothing that touches a score.

media: v0.9-dressed-desk.png

## Wed 30 Sept, 21:00  ·  `rush-results`

(149)

> The results card after a rush tells you which herrings cost you seconds and why they were fine. Learning by getting fooled, on purpose, with a timer.

media: v0.8-rush-results.png

## Thu 01 Oct, 09:00  ·  `flag-4`

(218)

> Red flag of the day: the trading switch.
> 
> One bool the owner flips and nobody else moves. No timelock, nothing that reopens it on its own. An emergency pause that expires by itself is fine. One that doesn't is a leash.

media: v0.8-red-flag-trading-switch.png

## Thu 01 Oct, 15:30  ·  `id-card`

(194)

> Every report has a Share button: a detective ID card with your rank, record and badges, and a link that opens the same file for someone else.
> 
> Post yours and I'll put the best names on the wall.

media: v0.8-share-card.png

## Thu 01 Oct, 21:00  ·  `badges`

(246)

> 38 badges. Some for playing well, most for poking things: ten sips of coffee, every kind of weather, sitting with the radio static long enough to hear the numbers station, opening the safe. They change nothing about scoring. They're for bragging.

media: v0.9-badges.png

## Fri 02 Oct, 09:00  ·  `cold-cases`

(242)

> The printer. Cold cases are generated on the spot from the same 18 flags and 15 herrings as the written ones, contradictions checked, so a fake renounce never sits next to a clean one. A seed in the share link brings the exact same file back.

media: v0.8-cold-case-printed-file.png

## Fri 02 Oct, 15:30  ·  `quiz-4`

(255)

> Rug or Not? #4
> 
> From the chat log:
> 
> @degen_paul: "when marketing wallet unlock?"
> @team: "2% marketing wallet, 12-month vesting, contract linked in the pinned message."
> @degen_paul: "ok boring"
> 
> Stamp the chat in the replies: RUG or LEGIT. Answer tomorrow.

## Fri 02 Oct, 21:00  ·  `notebook`

(188)

> The notebook fills in as you meet things: red flags, yellow herrings, the rogues, the handbook. Each flag page keeps your own record: how often you caught it, how often you walked past it.

media: v0.8-notebook-red-flags.png

## Sat 03 Oct, 12:00  ·  `saturday-2`

(132)

> Reading fine print, taking a second look, hunting herrings, and the same desk in Speakeasy.
> 
> #screenshotsaturday #pixelart #indiedev

media: v0.8-lens-fine-print.png, v0.8-second-look.png, v0.8-herring-hunt.png, v0.8-theme-speakeasy.png

## Sat 03 Oct, 20:00  ·  `quiz-4-answer`

(159)

> Yesterday's chat: LEGIT.
> 
> A small marketing wallet, vested, with the contract linked, answered plainly. Boring is the tell. Rugs answer questions with rockets.

media: v0.8-herring-hunt.png

## Sun 04 Oct, 12:00  ·  `coat-poll`

(138)

> Lucien's coat for next week's screenshots: navy, oxblood, forest or cream. Reply with one. He'll wear whatever wins and complain about it.

media: v0.9-market-page.png

## Sun 04 Oct, 20:00  ·  `board-sunday`

(186)

> Sunday board. The weekly file is the same seed for everyone, so the scores compare. Top three get their names on the wall next week. Arcade handles only; the game never asks who you are.

media: v0.9-hall-of-detectives.png

## Mon 05 Oct, 09:00  ·  `curtains`

(159)

> Velvet curtains, 45 clips at the market. Click the cloth and they draw across the rain; click again and the city comes back. Biscuit keeps the sill either way.

media: v0.9-clip-curtains.gif

## Mon 05 Oct, 15:30  ·  `flag-5-selltax`

_drafted in the sibling session_

(235)

> Red flag of the day: a sell tax the owner can change.
> 
> 3% today. There is a function that sets it. Nothing caps what it can be set to.
> 
> A tax you can edit isn't a tax, it's a lever. Fixed and documented is fine. Adjustable is the tell.

media: v0.8-notebook-red-flags.png

## Mon 05 Oct, 21:00  ·  `herring-pool-top-holder`

_drafted in the sibling session_

(249)

> Looks bad, is fine: the liquidity pool holding most of the supply.
> 
> People see "top holder: 78%" and run. That 78% is the pool everyone is trading against.
> 
> The version worth worrying about is a fresh wallet at the top, funded an hour before launch.

## Tue 06 Oct, 09:00  ·  `flag-10-unverified`

(253)

> Red flag of the day: the contract isn't verified.
> 
> The explorer shows bytecode and nothing else. The team says the source is "coming". Until it does, every promise on the website is about code nobody can read.
> 
> No source, no case. The folder stays shut.

media: v0.8-lens-fine-print.png

## Tue 06 Oct, 15:30  ·  `quiz-5`

_drafted in the sibling session_

(184)

> Rug or Not? #5
> 
> From the tokenomics:
> 
> Team:       18%
> Vesting:    none
> Unlock:     at launch
> Marketing:  9%, same terms
> 
> Everything else sits in the pool.
> 
> Rug or not? Answer tomorrow.

## Tue 06 Oct, 21:00  ·  `desk-right-side-teaser`

_drafted in the sibling session_

(144)

> The left of the desk has a lamp, a mug, a radio, a clock, a phone and a safe.
> 
> The right of the desk has a cat and two stamps.
> 
> Working on that.

media: v0.8-clip-weather.gif

## Wed 07 Oct, 09:00  ·  `devlog-sound`

(259)

> Every sound in the game is synthesised while it plays: the stamp, the paper, the rain, the till, both radio stations and the numbers station under the static. No audio files anywhere. One oscillator graph per sound, tuned by ear, in about seven hundred lines.

## Wed 07 Oct, 15:30  ·  `quiz-5-answer`

_drafted in the sibling session_

(240)

> Yesterday's tokenomics: RUG.
> 
> 27% held by the team and the marketing wallet, no vesting, no cliff. A quarter of the supply can hit the pool the minute the chart looks good.
> 
> Vesting is the whole difference between an allocation and an exit.

## Wed 07 Oct, 21:00  ·  `flag-6-whales`

_drafted in the sibling session_

(234)

> Red flag of the day: a few wallets holding most of the supply.
> 
> Open the holder list. Skip the pool. Read 2 through 10.
> 
> If six of them were funded within an hour of each other, that isn't six holders. That's one person with six hats.

media: v0.8-clip-red-flag-rush.gif

## Thu 08 Oct, 09:00  ·  `herring-liquidity-locked`

(217)

> Looks bad, is fine: nothing about the liquidity can move.
> 
> Locked for two years, with a known locker, the pool address on the certificate. It is dull. Dull is the point. A lock you can check beats a promise you can't.

media: v0.8-cold-case-printed-file.png

## Thu 08 Oct, 15:30  ·  `herring-real-audit`

_drafted in the sibling session_

(240)

> Looks bad, is fine: an audit that lists problems.
> 
> Four medium findings with a fix logged against each one is an audit. A gold badge and zero findings is a receipt.
> 
> Nobody writes perfect code. Anyone claiming they did is selling the badge.

## Thu 08 Oct, 21:00  ·  `lucien-says-2`

_drafted in the sibling session_

(138)

> Lucien, on a team that answered every question in the chat within a minute:
> 
> "A fast answer is a decision somebody made before you asked."

## Fri 09 Oct, 09:00  ·  `cold-case-seed`

(202)

> Every cold case has a seed. The share link carries it, so the file a friend opens is the exact file you closed: same pages, same flags, same herrings. Two grades on the same paper, and then an argument.

media: v0.8-cold-case-printed-file.png

## Fri 09 Oct, 15:30  ·  `flag-7-anon-team`

_drafted in the sibling session_

(263)

> Red flag of the day: an anonymous team with a photo each.
> 
> Anonymous isn't the problem. Half of crypto is anonymous and fine.
> 
> The problem is four headshots, four job titles, and no way to check that any of the four exist. Pick one. Be anonymous, or be checkable.

## Fri 09 Oct, 21:00  ·  `devlog-desk-editor-1`

_drafted in the sibling session_

(188)

> Coming to the desk: an editor.
> 
> Pick things up. Put them where you want them. Take the ones you never touch off entirely.
> 
> Clips buy the slots. None of it moves a score.
> 
> It's your office.

## Sat 10 Oct, 17:00  ·  `saturday-3`

_drafted in the sibling session_

(151)

> The paperwork side of detective work: the notebook, the drawer, the badges, the ID card.
> 
> All of it drawn from twelve named colours.
> 
> #pixelart #Solana

media: v0.8-notebook-red-flags.png, v0.8-case-files-drawer.png, v0.9-badges.png, v0.8-share-card.png

## Sat 10 Oct, 21:00  ·  `herring-two-person-team`

_drafted in the sibling session_

(248)

> Looks bad, is fine: a team of two.
> 
> Small teams ship. The headcount on the about page is not a safety rating, and a 40-person "team" of stock photos is worth less than two people you can actually find.
> 
> Count what they shipped, not who they listed.

## Sun 11 Oct, 15:30  ·  `board-sunday-2`

_drafted in the sibling session_

(198)

> Sunday board. Everyone gets the same weekly file, same seed, so the scores actually compare.
> 
> Post your grade with the time on it. S ranks with four minutes on the clock don't count and you know it.

media: v0.8-share-card.png

## Sun 11 Oct, 21:00  ·  `quiz-6`

_drafted in the sibling session_

(209)

> Rug or Not? #6
> 
> From the contract:
> 
> contract Token is ERC20, Pausable {
>   function pause() external onlyOwner {
>     _pause();
>   }
> }
> 
> No unpause timer. No timelock. Ownership "renounced" last week.
> 
> Rug or not?

## Mon 12 Oct, 09:00  ·  `flag-11-copied-whitepaper`

(262)

> Red flag of the day: the copied whitepaper.
> 
> A roadmap that mentions the wrong token name. Team bios identical, word for word, to another project's. It means there is no plan, only a template filled in to look busy.
> 
> Search one sentence of it. Takes ten seconds.

## Mon 12 Oct, 15:30  ·  `quiz-6-answer`

_drafted in the sibling session_

(256)

> Yesterday's contract: RUG.
> 
> "Renounced" covers the owner role. Pausable keeps its own. If the pauser survived the renounce, transfers stop whenever that key says so, and nothing in the contract reopens them.
> 
> Read which role was given up, not that one was.

## Mon 12 Oct, 21:00  ·  `flag-8-fake-audit`

_drafted in the sibling session_

(278)

> Red flag of the day: an audit you can't verify.
> 
> Check three things. Does the auditor exist outside this one PDF. Does the contract address in the report match the one you're buying. Is the report on the auditor's site, or only on the project's.
> 
> Most fakes fail the second one.

media: v0.8-lens-fine-print.png

## Tue 13 Oct, 09:00  ·  `devlog-fuzz`

(260)

> Testing a game with a cat and a safe in it: a script clicks, drags, types and scrolls at random for as long as you like, on a fixed seed, and prints every error with the screen it happened on. Same seed, same crash, every time. A finger mode does it with taps.

## Tue 13 Oct, 15:30  ·  `herring-doxxed-meme-name`

_drafted in the sibling session_

(239)

> Looks bad, is fine: a developer called something like gm_toaster who is completely doxxed underneath it.
> 
> A real name, a real history and a stupid handle is a person having fun.
> 
> A serious handle with nothing behind it is the one to check.

## Tue 13 Oct, 21:00  ·  `devlog-desk-editor-2`

_drafted in the sibling session_

(254)

> The editor doesn't open, it takes over. The lamp dims, the paperwork slides off, the desk lifts into a grid and every object you own gets a handle.
> 
> Drag it where you like. Put it back. Buy another shelf.
> 
> Then the lamp comes up and it's your desk again.

media: v0.8-clip-office-colours.gif

## Wed 14 Oct, 09:00  ·  `the-safe`

(201)

> There is a floor safe under the desk. Three digits. Sit with the radio's static long enough and a numbers station taps them out in morse; the notebook counts them too. Inside is the developer's ledger.

media: v0.8-title-the-desk.png

## Wed 14 Oct, 15:30  ·  `flag-9-blacklist`

_drafted in the sibling session_

(242)

> Red flag of the day: an owner-controlled blacklist.
> 
> One address decides which wallets can move. It's sold as anti-bot protection, and it is, right up until the day it isn't.
> 
> Ask who can be added, who decides, and what stops them adding you.

media: v0.8-notebook-red-flags.png

## Wed 14 Oct, 21:00  ·  `herring-small-fixed-tax`

_drafted in the sibling session_

(212)

> Looks bad, is fine: a small tax.
> 
> 1% to a treasury, written down, hardcoded, with no function to raise it, is a funding model.
> 
> The number isn't what matters. Whether anyone can change the number is what matters.

## Thu 15 Oct, 09:00  ·  `herring-young-token`

(170)

> Looks bad, is fine: the token is three weeks old.
> 
> Everything was new once. Age is not a verdict. The lock, the code and the team are. Read those and let the calendar be.

## Thu 15 Oct, 15:30  ·  `quiz-7`

_drafted in the sibling session_

(181)

> Rug or Not? #7
> 
> From the chat log:
> 
> @newguy: "why is the dev wallet moving?"
> @mod: "FUD. muted."
> @newguy2: "same question tbh"
> @mod: "muted."
> @everyone_else: "LFG 🚀🚀"
> 
> Rug or not?

## Thu 15 Oct, 21:00  ·  `lucien-says-3`

(103)

> Lucien, on a roadmap with "CEX listing" in Q2:
> 
> "Which one? They didn't say. Neither did the exchange."

## Fri 16 Oct, 09:00  ·  `flag-12-bot-chat`

(189)

> Red flag of the day: a chat full of the same sentence.
> 
> "Bullish!" from forty accounts made this week, seconds apart, and no question answered anywhere.
> 
> Real communities argue. Bots agree.

## Fri 16 Oct, 15:30  ·  `quiz-7-answer`

(215)

> Yesterday's chat: RUG.
> 
> A dev wallet moving isn't the flag. The mute is. When the only answer to a question is "FUD", the answer is whatever they're not saying.
> 
> Find the wallet on the explorer and read it yourself.

media: v0.8-case-report.png

## Fri 16 Oct, 21:00  ·  `desk-editor-launch`

(186)

> The desk editor is in. Pick anything up and put it where you like. Take off what you never touch. The desk remembers, and every screen follows.
> 
> Your office now.
> 
> {PLAY_URL}

media: v0.8-title-the-desk.png

## Sat 17 Oct, 12:00  ·  `saturday-4`

(80)

> The desk, the phone, the wall, and fog.
> 
> #screenshotsaturday #pixelart #indiedev

media: v0.8-title-the-desk.png, v0.8-netscope-phone.png, v0.8-the-wall-making-of.png, v0.8-weather-fog.png

## Sat 17 Oct, 20:00  ·  `herring-renounced-cleanly`

(240)

> Looks bad, is fine: "ownership renounced" when it's actually true.
> 
> No owner, no operator, no pauser, no proxy admin. Nobody can change anything, including the bugs. Boring, and the real thing.
> 
> Check every role before you believe the word.

## Sun 18 Oct, 12:00  ·  `board-sunday-3`

(121)

> Sunday board. One weekly file, the same seed on every desk, so the grades compare.
> 
> Post yours. Lucien reads the replies.

media: v0.9-hall-of-detectives.png

## Sun 18 Oct, 20:00  ·  `lucien-says-4`

(118)

> Lucien, on "the audit is on our website":
> 
> "And the exam results are on the student's website. Show me the auditor's."

## Mon 19 Oct, 09:00  ·  `flag-13-urgency`

(224)

> Red flag of the day: the countdown.
> 
> "Presale closes in 2 hours." "Last 50 spots." "100x, guaranteed."
> 
> A project that needs you to hurry needs you not to look. Nothing worth buying vanishes because you read for ten minutes.

## Mon 19 Oct, 15:30  ·  `contract-thread`

**1/6** (127)

> How to read a token contract in five minutes. No code background needed; you're looking for five words. A thread from the desk.

**2/6** (202)

> 1. mint
> 
> Search the source for it. If a function can create tokens, only the owner can call it, and nothing caps the total, the supply is whatever the owner says it is. The tokenomics page is overruled.

media: v0.8-lens-fine-print.png

**3/6** (180)

> 2. tax, fee
> 
> Find the number, then find the setter. A fixed 1% is a funding model. A setSellTax with no maximum is a trapdoor. What matters is not the number but who can change it.

**4/6** (170)

> 3. blacklist, pause
> 
> Either means one key can stop your tokens moving. Sold as anti-bot. Ask what stops the key being used on you, and whether the pause lifts on its own.

**5/6** (164)

> 4. owner, admin, proxy
> 
> "Renounced" covers one role. Read them all: operator, pauser, proxy admin. A renounce with an upgradeable proxy behind it renounced nothing.

**6/6** (213)

> 5. verified
> 
> If the explorer can't show you the source, none of the above is readable and none of the promises are checkable. That's where the case ends.
> 
> Practice on fictional files, free: {PLAY_URL}

media: v0.8-clip-solve-a-case.gif

## Mon 19 Oct, 21:00  ·  `weather-window`

(147)

> Click the window: rain, storm, snow, fog, a clear night. On a clear night, wait. Something falls now and then, and there's a badge for catching it.

media: v0.8-weather-clear.png

## Tue 20 Oct, 09:00  ·  `herring-tough-questions`

(225)

> Looks bad, is fine: someone in the chat grilling the team and not getting banned.
> 
> A community that argues is a community. Watch the admins, not the question: an honest answer is a green flag, a deleted question is a red one.

## Tue 20 Oct, 15:30  ·  `quiz-8`

(225)

> Rug or Not? #8
> 
> From the whitepaper:
> 
> "$NOVA will revolutionise DeFi with its community-first ethos. Q3: CEX listings. Q4: the NOVA metaverse."
> 
> The same paragraph, with a different ticker, is on two other sites.
> 
> Rug or not?

## Tue 20 Oct, 21:00  ·  `typed-words`

(161)

> Things you can type on the title screen: rug, legit, cat, moon, wen, gm, biscuit, train, plane, curtains, safe, clips.
> 
> There are more. Lucien doesn't list them.

media: v0.8-title-first-night.png

## Wed 21 Oct, 09:00  ·  `quiz-8-answer`

(223)

> Yesterday's whitepaper: RUG.
> 
> A plan lifted from another project with the ticker swapped is not a plan. It's a template filled in to look busy. Roadmap items that name the wrong token are the giveaway. Read it slowly, once.

## Wed 21 Oct, 15:30  ·  `flag-14-guaranteed`

(214)

> Red flag of the day: guaranteed returns.
> 
> "5% daily, forever." Nobody has that. The money paying today's 5% is tomorrow's deposits, and the last people in pay for everyone before them.
> 
> A guarantee is a confession.

## Wed 21 Oct, 21:00  ·  `handbook-2`

(231)

> Nineteen short pages on how the office works: the lens, the pins, the stamps, the rush, the market, the phone. It's in the notebook, and "How to play" on the title opens it. Read one page a night and you're a detective by November.

media: v0.8-handbook-how-to-play.png

## Thu 22 Oct, 09:00  ·  `herring-immutable-supply`

(207)

> Looks bad, is fine: a contract with no mint function at all.
> 
> Some people read "can't mint" as "can't grow". It means the supply on the tokenomics page is the supply, forever.
> 
> That's the good kind of can't.

## Thu 22 Oct, 15:30  ·  `flag-15-proxy-admin`

(229)

> Red flag of the day: an upgradeable proxy with one admin key.
> 
> The contract you read today can be swapped for another tomorrow by whoever holds the key. Every audit, every "renounced", every promise: valid until the next upgrade.

## Thu 22 Oct, 21:00  ·  `rush-notes`

(242)

> Rush notes: a herring costs five seconds, blank paper two, so guessing loses to reading. Streaks multiply. The training is in the notebook: every red flag has a drill, five printed pages that each hide that one flag, until you know its shape.

media: v0.8-rush-results.png

## Fri 23 Oct, 09:00  ·  `herring-boring-roadmap`

(207)

> Looks bad, is fine: a roadmap with nothing exciting on it.
> 
> "Q4: audit remediation, lock extended, docs." No metaverse, no CEX, no moon. Specific, small, checkable.
> 
> That's what work looks like written down.

## Fri 23 Oct, 15:30  ·  `quiz-9`

(163)

> Rug or Not? #9
> 
> From the explorer:
> 
> Proxy: yes
> Implementation: changed 3 times this month
> Proxy admin: 0x9c...a1 (a plain wallet)
> Ownership: renounced
> 
> Rug or not?

## Fri 23 Oct, 21:00  ·  `devlog-schema`

(211)

> Every written case is a JSON file checked against a schema before the build: every flag it names has to exist in the library, every clue has to land on a page. A misspelt flag id fails the build, not the player.

media: v0.8-case-folder-intake.png

## Sat 24 Oct, 12:00  ·  `pumpkin`

(118)

> A pumpkin turned up on the desk this morning, next to the mug. It stays until the end of the month. Nobody ordered it.

## Sat 24 Oct, 20:00  ·  `quiz-9-answer`

(242)

> Yesterday's explorer: RUG.
> 
> Renouncing ownership of a proxy whose admin is one wallet renounced nothing. Three implementation swaps in a month means the contract you read isn't the one you'll hold.
> 
> The admin is the owner, whatever the label.

## Sun 25 Oct, 12:00  ·  `board-sunday-4`

(143)

> Sunday board. Last call on this week's file: same seed on every desk, so the grades compare. Post yours; the Hall of Detectives keeps the rest.

media: v0.9-hall-of-detectives.png

## Sun 25 Oct, 20:00  ·  `lucien-says-5`

(101)

> Lucien, on being told to "do your own research":
> 
> "I did. That's why we're having this conversation."

## Mon 26 Oct, 09:00  ·  `flag-16-wash-trading`

(234)

> Red flag of the day: wash trading.
> 
> Volume looks healthy. Open the trades: the same three wallets buying from each other every few minutes, round numbers, nobody else.
> 
> Volume is a number anyone can make with two wallets and a script.

## Mon 26 Oct, 15:30  ·  `herrings-thread`

**1/6** (131)

> Five things that look like rugs and aren't. A thread from the desk, because half of learning to spot a rug is learning what's fine.

**2/6** (135)

> 1. The liquidity pool is the top holder.
> 
> "Top wallet: 78%" is the pool everyone trades against. Skip it. Read holders 2 to 10 instead.

**3/6** (125)

> 2. A small, fixed tax.
> 
> 1% to a treasury, hardcoded, no setter. The number doesn't matter; whether anyone can change it does.

**4/6** (130)

> 3. An audit with findings.
> 
> Four mediums, each with a fix logged, is an audit. "100/100, zero findings" is a badge someone bought.

**5/6** (153)

> 4. An emergency pause that expires on its own.
> 
> A pause with a timer written into the contract is a fire exit. A pause with a key and no timer is a trap.

**6/6** (250)

> 5. Admin powers behind a public timelock.
> 
> Every change queued in the open, 48 hours before it lands, on a contract you can watch. Power you can see coming is power you can leave ahead of.
> 
> The herring hunt drills all fifteen: {PLAY_URL}

media: v0.8-clip-herring-hunt.gif

## Mon 26 Oct, 21:00  ·  `notebook-drills`

(209)

> Every red flag page in the notebook has a drill: five printed pages in a row that each hide that one flag. Eighteen drills, one per flag, and a badge for the lot. The rush gets easier for reasons you can name.

media: v0.8-notebook-red-flags.png

## Tue 27 Oct, 09:00  ·  `herring-community-jokes`

(198)

> Looks bad, is fine: a chat that's mostly memes.
> 
> People joking is people. The chat to worry about is the tidy one: identical praise, fresh accounts, no questions.
> 
> Noise is fine. Choreography isn't.

## Tue 27 Oct, 15:30  ·  `quiz-10`

(166)

> Rug or Not? #10
> 
> From the chat log:
> 
> @dev: "emergency pause active for 24h while we patch the router. it lifts itself at block 19,404,220. tx in pinned."
> 
> Rug or not?

## Tue 27 Oct, 21:00  ·  `office-colours-2`

(194)

> Five office colours: Noir, Old file, Blue hour, Newsprint, Speakeasy. The desk is drawn from twelve named colours, so a theme is twelve new values and a repaint. Pick yours in Settings > Office.

media: v0.8-theme-newsprint.png

## Wed 28 Oct, 09:00  ·  `quiz-10-answer`

(238)

> Yesterday's chat: LEGIT, on this page.
> 
> A pause that lifts itself at a named block, with the transaction pinned, is one you can check and wait out. The one to run from has no timer and no transaction.
> 
> You still read the rest of the file.

## Wed 28 Oct, 15:30  ·  `flag-17-team-unvested`

(256)

> Red flag of the day: a big team allocation with no vesting.
> 
> 20% to the team, unlocked at launch. Not a payday later; a payday now, the moment the chart looks good.
> 
> Vesting means they get paid over years, alongside you. Unlocked means they get paid first.

## Wed 28 Oct, 21:00  ·  `reduced-motion`

(229)

> Reduced motion switches off the flicker, the grain, the dust in the lamplight and every bounce; the desk plays the same without them. Lucien's hints can be turned off too, or replayed from Settings when you want the lesson again.

media: v0.8-settings.png

## Thu 29 Oct, 09:00  ·  `small-things`

(194)

> Small things on the desk: the ink pad inks your cursor for a few seconds, a fly finds the lamp now and then (swat it, there's a badge), and the folder stack has opinions about the $PUPCOIN file.

media: v0.8-clip-desk-toys.gif

## Thu 29 Oct, 15:30  ·  `quiz-11`

(192)

> Rug or Not? #11
> 
> From the holder list:
> 
> 1. Pool     61%
> 2. 0x3f…   4.1%   funded 14:02
> 3. 0x8a…   4.0%   funded 14:02
> 4. 0xc1…   4.0%   funded 14:03
> 5. 0x77…   3.9%   funded 14:03
> 
> Rug or not?

## Thu 29 Oct, 21:00  ·  `phones`

(230)

> Phones work sideways. The desk is 640 by 360 and scales to whatever you hold it in. Under a finger the lens floats above the fingertip so it never hides the fine print, and buttons fire on release, so a scroll never stamps a file.

## Fri 30 Oct, 09:00  ·  `quiz-11-answer`

(241)

> Yesterday's holders: RUG.
> 
> Four wallets funded within a minute of each other, holding the same slice, is one person with four hats and 16% of the supply. The pool at 61% is fine; that's the trade.
> 
> Read rows 2 to 10, and read the timestamps.

## Fri 30 Oct, 15:30  ·  `october-recap`

(205)

> October on the desk: the market, curtains, the desk editor, a pumpkin nobody ordered.
> 
> Still true: every case is fictional, nothing costs money, and none of it is financial advice.
> 
> {PLAY_URL}

media: v0.9-clip-market-shopping.gif

## Fri 30 Oct, 21:00  ·  `lucien-says-6`

(111)

> Lucien, on a chart that only goes up:
> 
> "A chart that only goes up is a room with no exit. Ask who has the key."

## Sat 31 Oct, 12:00  ·  `saturday-5`

(143)

> The rogues gallery, for the season. Every rug you called right is a face on the wall, with charges and a reward.
> 
> #screenshotsaturday #pixelart

media: v0.8-rogues-gallery.png

## Sat 31 Oct, 20:00  ·  `lucien-halloween`

(167)

> Lucien, on Halloween:
> 
> "Everyone in a mask, everyone asking for something sweet, and none of them will say where they live. An ordinary Tuesday, in this line of work."

# Drafts (unscheduled)

## when you say so  ·  `coin-launch-thread`

_Unscheduled. Fill in CA, lock link, supply, DexScreener link on launch day; pin it; nowhere else._

**1/3** (261)

> The precinct's coin is live.
> 
> What holding does in the game: an allowance of paper clips at the market, a weekly holders' file, a gold hat, a bobblehead, a coat. What it does to scoring: nothing. What you need it for: nothing. It's a membership card for a desk.

media: v0.9-dressed-desk.png

**2/3** (248)

> Contract: {CA}
> Supply: {SUPPLY}, fixed, no mint function.
> Liquidity: locked until {LOCK_DATE} ({LOCK_LINK}).
> Team wallet: {TEAM_WALLET_NOTE}.
> Chart: {DEXSCREENER_LINK}
> 
> This is the only place the address is posted. Anyone DMing you one is the case.

**3/3** (262)

> The game reads your balance through Phantom, read-only. It never asks for a signature or a seed phrase. Connect on the coin page inside the game or don't; it plays the same.
> 
> {PLAY_URL}
> 
> All cases are fictional. This is a game, not financial advice.

media: v0.9-coin-page-phantom-connected.png

## when you say so  ·  `coin-teaser`

_Unscheduled. T-3 days before the coin: perks only, no date, no address._

(277)

> What the coin will do in the game, and nothing else:
> 
> - clips at the market, an allowance that follows the balance
> - a second weekly file, the holders' file
> - a gold fedora, a bobblehead, a coat for the board
> - the daily deal at half price
> 
> Scoring untouched. Nothing required.

media: v0.9-market-page.png
