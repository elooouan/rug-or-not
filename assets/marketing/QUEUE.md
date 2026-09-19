# Tweet queue

Rendered from `queue.json` (edit that, then `node scripts/queue.mjs`). Times are Paris.
`{PLAY_URL}` becomes the game link; media lives in this folder.

## Mon, 21 Sept, 09:00  ·  `intro-thread`  ·  pin

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

## Mon, 21 Sept, 15:30  ·  `flag-1`

(266)

> Red flag of the day: owner-only unlimited mint.
> 
> One address can print tokens whenever it likes. "Fixed supply" in the pitch, `mint(uint256)` with `onlyOwner` in the contract. The pitch is a JPEG; the contract is the contract.
> 
> Lucien: read the code before the chat.

media: v0.8-red-flag-trading-switch.png

## Mon, 21 Sept, 21:00  ·  `desk-alive`

(176)

> The office at night. The window cycles through rain, storm, snow, fog and a clear night with a moon you can click. A train crosses the horizon now and then. Biscuit watches it.

media: v0.8-clip-weather.gif

## Tue, 22 Sept, 09:00  ·  `devlog-coats`

(233)

> How the coats work: Lucien is one PNG. The market recolours only the pixels that are trench-coat cloth (a hue band, a saturation floor) and leaves skin and brass alone, hat above a line, coat below. Seven coats, six hats, no new art.

media: v0.9-market-page.png

## Tue, 22 Sept, 15:30  ·  `quiz-1`

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

## Tue, 22 Sept, 21:00  ·  `rush-clip`

(196)

> Red Flag Rush. Sixty seconds, one evidence page at a time, click the red flag. Herrings cost five seconds, blank paper two, streaks multiply. Then the notebook remembers what you keep falling for.

media: v0.8-red-flag-rush.png

## Wed, 23 Sept, 09:00  ·  `quiz-1-answer`

(226)

> Yesterday's file: RUG.
> 
> A tax the owner can set is a tax the owner can set to 99%. "Fixed" means a constant, or no setter at all. This one had a setter, no cap, no timelock.
> 
> The report in the game says the same thing, slower.

media: v0.8-case-report.png

## Wed, 23 Sept, 15:30  ·  `board`

(244)

> The Hall of Detectives. Your runs under a handle, a 14-day streak strip, the rush and cold-case boards, and now one row per desk: career score, rank, clips earned, files solved. Sort by score or by clips.
> 
> Arcade names only. No email, no login.

media: v0.9-hall-of-detectives.png

## Wed, 23 Sept, 21:00  ·  `rogues`

(146)

> Every rug you call correctly puts a face on the wall. Wanted posters with charges and a reward, generated per case.
> 
> The Tailor is still at large.

media: v0.8-rogues-gallery.png

## Thu, 24 Sept, 09:00  ·  `flag-2`

(252)

> Red flag of the day: the honeypot.
> 
> Anyone can buy. Only approved addresses can sell. The chart only goes up because nobody can take profit, until the owner does.
> 
> Where it hides: a transfer hook with a whitelist check, or a "cooldown" that never ends.

media: v0.8-pins-and-suspicions.png

## Thu, 24 Sept, 15:30  ·  `wallet-stance`

(262)

> The game connects to Phantom read-only. It learns your public address and reads two balances. It never asks you to sign anything, never sees a seed phrase, and plays exactly the same without a wallet.
> 
> A game about rugs that asked for a signature would be a rug.

media: v0.9-coin-page-phantom-connected.png

## Thu, 24 Sept, 21:00  ·  `second-look`

(225)

> "Missed: in Tokenomics" used to be the whole lesson. Now the file comes back read-only with your pins where they were and every miss in amber. Click one and Lucien explains why it mattered. Nothing counts; it's for next time.

media: v0.8-second-look.png

## Fri, 25 Sept, 09:00  ·  `herring-hunt`

(237)

> Half of learning to spot rugs is learning what's fine. A small fixed tax. A team of two. A liquidity pool that's the top holder. An audit that lists minor findings.
> 
> Herring hunts: five printed pages, click the thing that only looks bad.

media: v0.8-clip-herring-hunt.gif

## Fri, 25 Sept, 15:30  ·  `quiz-2`

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

## Fri, 25 Sept, 21:00  ·  `office-colours`

(199)

> Five office colours: Noir, Old file, Blue hour, Newsprint, Speakeasy. The whole desk is drawn from twelve named colours, so a theme is twelve new values and a repaint. Lucien has opinions about each.

media: v0.8-clip-office-colours.gif

## Sat, 26 Sept, 12:00  ·  `saturday-1`

(135)

> The detective's desk, four ways. A pixel-noir game about spotting rug pulls, all in a browser.
> 
> #screenshotsaturday #pixelart #indiedev

media: v0.9-dressed-desk.png, v0.8-theme-midnight-reading.png, v0.8-weather-snow.png, v0.8-rogues-gallery.png

## Sat, 26 Sept, 20:00  ·  `quiz-2-answer`

(205)

> Yesterday's file: LEGIT, on this page at least.
> 
> Liquidity locked for two years with the pool as top holder is the boring, good kind of paperwork. You still read the contract. One page never clears a case.

media: v0.8-cold-case-printed-file.png

## Sun, 27 Sept, 12:00  ·  `the-wall`

(181)

> Behind the corkboard is the making-of: a polaroid for every notable build since the first night, red string and all. 29 photos, 430-odd commits, ten days.
> 
> Click one to look closer.

media: v0.8-the-wall-making-of.png

## Sun, 27 Sept, 20:00  ·  `lucien-says-1`

(92)

> Lucien, on being asked whether a coin will go up:
> 
> "Wen? When you have read the tokenomics."

media: v0.8-title-first-night.png

## Mon, 28 Sept, 09:00  ·  `devlog-week`

(277)

> Shipped last week (v0.9): paper clips as currency, a market with 39 things, a try-on strip, a daily deal, a detectives board, deep links, a secret badge for an all-gold look, and a bug where asking Lucien for help cost points and said nothing if you'd muted his remarks. Fixed.

media: v0.9-market-page.png

## Mon, 28 Sept, 15:30  ·  `flag-3`

(237)

> Red flag of the day: liquidity that isn't locked, or a lock that expires next week.
> 
> The lock is the promise that the pool won't be pulled. "Locked" with an expiry in nine days is a countdown, not a promise. Read the date, not the badge.

media: v0.8-cold-case-printed-file.png

## Mon, 28 Sept, 21:00  ·  `handbook`

(199)

> Too many features, someone said. Fair. So the desk opens up a piece at a time now, and the notebook grew a handbook: nineteen short pages on how the office works. "How to play" on the title opens it.

media: v0.8-clip-handbook.gif

## Tue, 29 Sept, 09:00  ·  `drawer`

(216)

> The drawer: sixteen written files, a pile of printed ones that never runs out, a weekly file everyone gets the same seed for. Every closed folder keeps its last run; the sticker in the corner opens that report again.

media: v0.8-case-files-drawer.png

## Tue, 29 Sept, 15:30  ·  `quiz-3`

(192)

> Rug or Not? #3
> 
> From the team page:
> 
> "Ownership renounced."
> Roles in the contract: OPERATOR (can pause transfers). Held by: 0x4b1...e2.
> 
> Stamp it in the replies: RUG or LEGIT. Answer tomorrow.

## Tue, 29 Sept, 21:00  ·  `title-intro`

(171)

> The first night. The lamp clicks on, the case file slides in, and Lucien explains the job in four lines. After that he only speaks when something new turns up on the desk.

media: v0.8-clip-title-intro.gif

## Wed, 30 Sept, 09:00  ·  `quiz-3-answer`

(186)

> Yesterday's file: RUG.
> 
> "Renounced" is about one role. If another role can pause transfers, nothing was given up; the button changed hands. Look for every role, not the one in the tweet.

media: v0.8-notebook-red-flags.png

## Wed, 30 Sept, 15:30  ·  `try-on`

(232)

> Hover a coat and he wears it before you buy it. One item a day is a third off, the same one for everyone. Coin holders pay half. That's the whole economy: clips from closed files, dressing for the desk, nothing that touches a score.

media: v0.9-dressed-desk.png

## Wed, 30 Sept, 21:00  ·  `rush-results`

(149)

> The results card after a rush tells you which herrings cost you seconds and why they were fine. Learning by getting fooled, on purpose, with a timer.

media: v0.8-rush-results.png

## Thu, 01 Oct, 09:00  ·  `flag-4`

(218)

> Red flag of the day: the trading switch.
> 
> One bool the owner flips and nobody else moves. No timelock, nothing that reopens it on its own. An emergency pause that expires by itself is fine. One that doesn't is a leash.

media: v0.8-red-flag-trading-switch.png

## Thu, 01 Oct, 15:30  ·  `id-card`

(194)

> Every report has a Share button: a detective ID card with your rank, record and badges, and a link that opens the same file for someone else.
> 
> Post yours and I'll put the best names on the wall.

media: v0.8-share-card.png

## Thu, 01 Oct, 21:00  ·  `badges`

(246)

> 38 badges. Some for playing well, most for poking things: ten sips of coffee, every kind of weather, sitting with the radio static long enough to hear the numbers station, opening the safe. They change nothing about scoring. They're for bragging.

media: v0.9-badges.png

## Fri, 02 Oct, 09:00  ·  `cold-cases`

(242)

> The printer. Cold cases are generated on the spot from the same 18 flags and 15 herrings as the written ones, contradictions checked, so a fake renounce never sits next to a clean one. A seed in the share link brings the exact same file back.

media: v0.8-cold-case-printed-file.png

## Fri, 02 Oct, 15:30  ·  `quiz-4`

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

## Fri, 02 Oct, 21:00  ·  `notebook`

(188)

> The notebook fills in as you meet things: red flags, yellow herrings, the rogues, the handbook. Each flag page keeps your own record: how often you caught it, how often you walked past it.

media: v0.8-notebook-red-flags.png

## Sat, 03 Oct, 12:00  ·  `saturday-2`

(132)

> Reading fine print, taking a second look, hunting herrings, and the same desk in Speakeasy.
> 
> #screenshotsaturday #pixelart #indiedev

media: v0.8-lens-fine-print.png, v0.8-second-look.png, v0.8-herring-hunt.png, v0.8-theme-speakeasy.png

## Sat, 03 Oct, 20:00  ·  `quiz-4-answer`

(159)

> Yesterday's chat: LEGIT.
> 
> A small marketing wallet, vested, with the contract linked, answered plainly. Boring is the tell. Rugs answer questions with rockets.

media: v0.8-herring-hunt.png

## Sun, 04 Oct, 12:00  ·  `coat-poll`

(138)

> Lucien's coat for next week's screenshots: navy, oxblood, forest or cream. Reply with one. He'll wear whatever wins and complain about it.

media: v0.9-market-page.png

## Sun, 04 Oct, 20:00  ·  `board-sunday`

(186)

> Sunday board. The weekly file is the same seed for everyone, so the scores compare. Top three get their names on the wall next week. Arcade handles only; the game never asks who you are.

media: v0.9-hall-of-detectives.png

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
