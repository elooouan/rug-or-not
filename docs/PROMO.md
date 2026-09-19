# Promoting Rug or Not? (and the coin) on X

Condensed playbook. Times are Paris time (CEST/CET); UTC in brackets. The tweet queue itself
is in [`assets/marketing/QUEUE.md`](../assets/marketing/QUEUE.md) (scheduled through Typefully).

## 1. Positioning, in one breath

**A pixel-noir detective game that teaches you to spot rug pulls.** Lucien is the face. The
coin is the precinct's membership card: read-only perks in the game (dressing, a weekly
holders' file, an allowance at the market), never scoring, never required to play.

Three pillars, and every tweet belongs to one:

1. **The game** — clips and stills, one feature at a time. Show, don't announce.
2. **Rug education** — "Red flag of the day", "Rug or Not?" quizzes, Lucien's take on real
   rugs (from public post-mortems; never accuse a live project).
3. **The coin** — facts only: what holding does in the game, supply, liquidity, where the
   contract address is. No price talk, no "guaranteed", no countdown hype.

Voice: Lucien's lines are deadpan noir, short sentences. Your own lines are a builder's:
specific numbers, what shipped, what broke. Never "excited to announce", never "game
changer", never a wall of emojis or hashtags. If a sentence could be on any other project's
account, cut it.

## 2. Profile setup (day 0)

- **Name:** `Rug or Not?` · **handle:** short (`@rugornotgame` / `@rugornot_`) · **bio:**
  "A detective game about spotting rug pulls. Pin the red flags, stamp the verdict. Lucien is
  the boss. Browser, free. All cases fictional, not financial advice." · **link:** the game
  (GitHub Pages), later a linktree with game / Telegram / DexScreener.
- **Avatar:** Lucien's face (`public/img/lucien-face.png` on a paper background).
  **Banner:** `assets/marketing/v0.9-dressed-desk.png` (1500×500 crop of the desk).
- **Pinned:** the intro thread (queue, Mon 09:00). Repin the launch thread on launch day.
- **X Premium** (the blue check): replies rank higher, long video uploads, analytics. Buy it
  before the first week, not after.
- Turn on **X Analytics**; check "best hours" after two weeks and move the slots to match.
- Same handle on Telegram (a group with the game link pinned) and, later, Discord. Register
  the DexScreener token profile the day the coin exists (socials + logo, otherwise a fake
  one will).

## 3. Who to follow (and reply to) — build three X lists

Follow ~150 accounts in week 0; the point is the **lists**, which you read daily and reply
from. Verify each handle still exists and is active.

**A. Rug hunters & security (your natural allies; your content is their content):**
@zachxbt, @realScamSniffer, @PeckShieldAlert, @SlowMist_Team, @CertiKAlert, @GoPlusSecurity,
@RugDocIO, @tayvano_, @lookonchain, @whale_alert. Reply with Lucien's read of a
post-mortem ("three flags, all in the contract, none in the chat").

**B. Solana ecosystem (where the coin lives):**
@solana, @aeyakovenko, @rajgokal, @0xMert_, @heliuslabs, @JupiterExchange, @phantom,
@DexScreener, @birdeye_so, @pumpdotfun, @MagicEden, @tensor_hq, @SuperteamDAO,
@solanafloor, @SolanaLegend, @bonk_inu, @dogwifcoin. Reply with useful things (a clip that
matches their topic), never "check out my game".

**C. Memecoin CT & media (reach):**
@MustStopMurad, @blknoiz06, @theunipcs, @notthreadguy, @Cobie, @CryptoKaleo, @inversebrah,
@frankdegods, @WatcherGuru, @CoinDesk, @Cointelegraph, @TheBlock__, @decryptmedia,
@DLNewsInfo. Quote-tweet rug news within the hour with a one-line Lucien take.

**D. Indie / pixel-art games (the other half of the audience):**
@phaser_, @photonstorm (Phaser), @itchio, plus everyone who posts under
#screenshotsaturday, #pixelart, #indiedev, #gamedev. Saturdays are theirs.

Also follow back every real person who replies in the first month.

## 4. Format rules

- **First line is the tweet.** Under ~90 characters, a fact or a hook. The rest can be cut
  without losing it.
- **One piece of media per tweet**, always. Video > GIF > still. Clips are 16:9 at 640×360
  (X converts GIFs to video); stills are 1280×720. Convert the GIFs to MP4 once ffmpeg is
  installed (`brew install ffmpeg`, then
  `ffmpeg -i in.gif -movflags faststart -pix_fmt yuv420p -vf scale=1280:-2 out.mp4`) —
  sharper, better watch-time.
- **No link in the body of a main tweet.** Links go in the second tweet of a two-tweet
  thread or in the first reply. External links get less reach.
- **Hashtags:** none on weekdays. Saturdays: `#screenshotsaturday #pixelart #indiedev` at the
  end, nothing else.
- **Threads:** 5–8 tweets, strongest visual first, one idea per tweet, the link and the ask
  last. Number nothing; the thread line does that.
- **Alt text** on every image (Typefully supports it): one sentence, what the picture shows.
- **Polls** for "Rug or Not?" quizzes: two options, `Rug` / `Legit`, 24 h. X polls can't
  carry media, so the snippet is text; the answer is the next morning's tweet with the
  report screenshot.
- Coin posts end with "All cases are fictional. This is a game, not financial advice."
  Never post a contract address anywhere but the pinned launch thread and the bio link.
- Lengths: ≤ 280 characters even with Premium. Long posts are for the launch thread only.

## 5. Cadence and timing

Crypto Twitter's loud hours are US market hours and US evening; Europe's morning is a
second, smaller wave. From Paris:

| Slot                     | Paris         | UTC           | What goes here                              |
| ------------------------ | ------------- | ------------- | ------------------------------------------- |
| EU morning               | 09:00         | 07:00         | dev log, quiz answers, red flag of the day  |
| US open (**main slot**)  | 15:30         | 13:30         | the best clip or thread of the day, quizzes |
| US afternoon (**main**)  | 21:00         | 19:00         | second clip / feature still                 |
| US evening (launch days) | 00:30         | 22:30         | launch thread, live leaderboard, Spaces     |
| Weekends                 | 12:00 · 20:00 | 10:00 · 18:00 | #screenshotsaturday, community, polls       |

- **3 scheduled tweets a day on weekdays, 2 on weekends.** More than 5 a day dilutes reach.
- **Reply sessions, live, 2 × 30 minutes a day** (15:30 and 21:00 Paris): 20–30 replies on
  the lists above. Replies grow accounts faster than tweets do. Premium makes them visible.
- Weekly rhythm: Mon dev log · Tue feature · Wed quiz answer + board · Thu red flag +
  wallet/coin fact · Fri clip + quiz · Sat #screenshotsaturday (4 stills) · Sun community
  (poll, leaderboard, the wall).
- A version thread every time `GAME_VERSION` bumps; pin it for 48 h.

## 6. Roadmap

**Week 0 — setup (this weekend).** Profile, banner, lists, Premium, Telegram group, GitHub
Pages enabled and the game live at the bio link, Typefully connected, first two weeks queued.

**Weeks 1–3 — build in public, before the coin.** Daily: one clip, one lesson, one reply
session. Twice a week: "Rug or Not?" polls. Every version: a thread + wall photo. Goal:
1,000 followers who play, 50 people posting their detective ID card (the Share button).
Collect emails/Telegram for launch day. DM ten rug-hunter and pixel-art accounts a personal
note with the game link (no ask beyond "tell me what's wrong with it").

**Launch week — game v1.0 + the coin (pick a Tuesday or Wednesday, 15:30 Paris).**

- T-3: teaser thread "what holding does in the game" (perks only, no date).
- T-1: "tomorrow, 15:30 Paris / 9:30 ET" with the launch checklist (LP locked, supply, where
  the CA will be posted — only the pinned tweet). Warn about impersonators in Lucien's voice.
- T-0 15:30: launch thread (CA, DexScreener link, the game, the holders' file, the market).
  Pin it. Repost the CA nowhere else. Update the bio link.
- T-0 all day: reply to everyone; post the live Hall of Detectives at 21:00 and 00:30.
- T+1..T+3: one thread a day on a perk (holders' file, the market allowance, the gold hat);
  a Space with a rug-hunter guest if you can get one; first weekly file competition.

**Weeks 5–8 — loops.** Weekly file leaderboard every Sunday (screenshot the board, tag the
top 3). Monthly "community case" made in the editor (`/editor.html`), posted as a challenge.
Herring hunt / rush high-score challenges with small clip prizes (not token airdrops —
they attract farmers, not players). One collab a fortnight (a rug hunter reviews a case
file; a pixel artist draws Lucien). Listings: DexScreener profile day 1, CoinGecko / CMC
applications week 5.

**Ongoing.** Every real rug that hits the news: a quote-tweet within the hour, "Lucien's
three flags", never naming victims, never accusing live projects. Every version: thread,
wall photo, `WHATS_NEW`. Review X Analytics every Sunday; keep what got replies, drop what
didn't.

## 7. Content formats that repeat (fill the queue with these)

1. **Rug or Not? poll** — a 3-line contract or chat snippet, `Rug` / `Legit`, answer next
   morning with the report still.
2. **Red flag of the day** — one of the 18 flags: what it is, where it hides, Lucien's line.
3. **Version thread** — 5–8 tweets, one feature each, from `CHANGELOG.md`.
4. **Desk clip** — 10–20 s of one thing (weather, the market, a rush).
5. **The wall** — a making-of photo with the commit count.
6. **Detective ID** — reshare players' cards (ask permission in a reply first).
7. **Board Sunday** — the Hall of Detectives, top 3 tagged.
8. **Lucien says** — a one-liner from `LUCIEN_QUIPS`, no media or the face still.

## 8. Replies — the part that has to sound like you

- Reply within the first hour on your own tweets; answer questions with a specific fact or
  a screenshot, not a thank-you.
- On other people's posts: add one thing they didn't say. A number, a counter-example, a
  clip that proves it. Never "great thread!". Never a link unless they ask.
- Lucien voice for jokes, your voice for facts. Short. One sentence is a good reply.
- Trolls and "rug" accusations: answer once with facts (locked LP link, verified contract),
  then stop. Never argue about price.
- Bugs reported in replies: "on it" with the commit hash when it's fixed. That's the whole
  brand.
- Worked examples for the usual comments: [REPLIES.md](REPLIES.md).
- What Claude can do here: paste comments into the session and get drafted replies in this
  voice; it can't watch X or reply on its own.

## 9. Coin hygiene (so the game about rugs is never one)

Fixed supply, LP locked (post the lock link), contract verified, no mint/pause/blacklist
functions — the game's own red-flag list is your checklist; say so publicly. The CA lives
in one pinned tweet and the bio. The game never asks for a signature or a seed phrase, and
the tweets say so once a week. Team wallets: stated, small, vested, or none.

## 10. Numbers to watch (Sunday, 15 minutes)

Followers, replies per tweet, link clicks (Typefully/X analytics), game visits (set the
`VITE_GOATCOUNTER` repository variable to a free GoatCounter site code and redeploy: page
views only, no cookies), rows on the Hall of Detectives, ID cards posted, Telegram members. The one that matters before
launch: people posting their own screenshots.
