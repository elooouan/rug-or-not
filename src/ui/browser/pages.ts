import Phaser from 'phaser';
import { BROWSER, FONT, GAME_HEIGHT, GAME_WIDTH, UI } from '@/config/layout';
import { HEX, type PaletteKey } from '@/config/palette';
import { shortAddress, TOKEN } from '@/config/token';
import { GAME_VERSION } from '@/config/gameConfig';
import { LATE_NEWS, NEWS } from '@/data/news';
import { touchScreen } from '@/ui/lensLift';
import { audio } from '@/systems/audio';
import { gameState } from '@/systems/gameState';
import { secretUnlocked } from '@/systems/secretCase';
import { readCustomCases } from '@/systems/customCases';
import { startColdCase, startCustomCase } from '@/systems/coldCase';
import {
  leaderboard,
  postDesk,
  recentRuns,
  type DeskEntry,
  type DeskSort,
  type ScoreEntry,
} from '@/systems/leaderboard';
import { rankForScore } from '@/systems/ranks';
import { FLAG_IDS, FLAGS } from '@/data/flags';
import { makeRng } from '@/systems/rng';
import { currentStreak, localDateKey, playedStrip, weekKey } from '@/systems/dailyCase';
import { saveStore } from '@/systems/save';
import { PHANTOM_URL, wallet, walletName } from '@/systems/wallet';
import { currentBalance, currentTier, hasEntitlement, TIERS } from '@/systems/entitlements';
import { fetchPrice, formatPrice } from '@/systems/price';
import { awardBadge, badgeCount, badgeProgress } from '@/systems/badges';
import { BADGE_BY_ID, BADGES } from '@/data/badges';
import { WEATHERS } from '@/systems/settings';
import { LUCIEN_TEX, lucienSays } from '../DialogueBox';
import { LucienBubble } from '../LucienBubble';
import { PixelButton } from '../PixelButton';
import { markEscConsumed, popModal, popOverlay, pushModal, pushOverlay } from '../escGuard';
import { rect } from '../shapes';
import { isNameAllowed } from '@/systems/names';
import { renderIdCard, shareOrDownloadCanvas } from '@/systems/shareCard';
import { toast } from '../Toast';
import { StickyNote } from '../StickyNote';
import { makeText } from '../text';
import type { PageCtx } from './PageCtx';
import { ALL_PAGES, type PageId } from './PageCtx';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { itemsFor, SHOP, SHOP_SLOTS, type ShopItem, type ShopSlot } from '@/data/shop';
import {
  boughtCount,
  buy,
  buyBlocker,
  CLIPS,
  clipBalance,
  dealToday,
  earnedClips,
  holderClips,
  owns,
  priceOf,
  wear,
  worn,
} from '@/systems/clips';
import { previewTexture, redress } from '@/systems/wardrobe';

/** One line per tier on the coin page. */
const TIER_BLURB: Record<number, string> = {
  1: "gilded rim, board mark, aurora, holders' file, gold hat",
  2: 'mahogany desk, the Lucien bobblehead',
  3: "coin-gold shade, ID card title, board member's coat",
};

export const URLS: Record<PageId, string> = {
  home: 'netscope://home',
  rugscan: 'rugscan.example/token',
  coin: `coin.example/${TOKEN.symbol.replace('$', '').toLowerCase()}`,
  board: 'board.example/detectives',
  news: 'news.example/latest',
  help: 'netscope://help',
  about: 'netscope://about',
  badges: 'board.example/badges',
  market: 'market.example/desk',
  '404': 'nowhere.example/lost',
};

// ---- pages ------------------------------------------------------------------------

/** How many rows each board list held when last fetched (see the board page). */
const boardRows = new Map<string, number>();

/** Which column the detectives board is sorted by; remembered while the phone is open. */
let deskSort: DeskSort = 'total';

/** What Lucien says when something new lands on the desk. */
const BOUGHT_QUIPS: Record<ShopSlot, string[]> = {
  coat: ['New coat. The old one had opinions.', 'Same detective. Better silhouette.'],
  hat: ['A hat is a commitment.', 'The hat does the thinking. I take the credit.'],
  cat: ['Biscuit will pretend not to notice.', 'She approves. Silently. Judgingly.'],
  collar: ['She kept it on for a full minute. A record.', 'The bell is a lie. She still sneaks.'],
  ornament: ['Something to look at between files.', 'The corner needed a witness.'],
  mug: ['Same coffee. Better mug.', 'The mug holds more. Allegedly.'],
  curtains: ["Curtains. The city can't watch me work now.", 'Very cinema. Very late.'],
  radio: ['Same static, better box.', 'The numbers station approves.'],
};

/** Head to toe in coin gold: a badge and a word, once. */
function checkGilded(scene: Phaser.Scene): void {
  if (worn('hat').id === 'hat-gold' && worn('coat').id === 'coat-boardroom') {
    awardBadge(scene, 'gilded');
    LucienBubble.say(scene, 'Dressed like the board. Now read like the audit.', 4000);
  }
}

/** The market's open drawer; remembered across renders so buying doesn't jump the page. */
let marketSlot: ShopSlot = 'coat';
const SLOT_TAB: Record<ShopSlot, string> = {
  coat: 'Coat',
  hat: 'Hat',
  cat: 'Cat',
  collar: 'Collar',
  ornament: 'Ornament',
  mug: 'Mug',
  curtains: 'Curtains',
  radio: 'Radio',
};

export const PAGES: Record<PageId, (ctx: PageCtx) => void> = {
  home(ctx) {
    ctx.heading('NetScope', 'ink');
    ctx.line("The detective's browser. Slow, ad-free, mostly honest.");
    // Tonight at a glance.
    const save = saveStore.get();
    const today = localDateKey();
    const wk = `week-${weekKey()}`;
    const dailyDone = save.daily.lastPlayed === today;
    const weeklyDone = save.stats.weeklyDone.includes(wk);
    const streak = currentStreak(save.daily, today);
    ctx.line(
      `${today}  ·  daily ${dailyDone ? 'done' : 'open'}  ·  weekly cold case ${weeklyDone ? 'closed' : 'open'}${streak > 0 ? `  ·  streak ${streak}` : ''}`,
      { color: 'woodMid' },
    );
    ctx.gap();
    ctx.line('Bookmarks:', { color: 'woodMid' });
    ctx.button('RugScan explorer', () => ctx.panel.go('rugscan'));
    ctx.button(`${TOKEN.symbol} - the coin`, () => ctx.panel.go('coin'));
    ctx.button('Leaderboard', () => ctx.panel.go('board'));
    ctx.button('The news', () => ctx.panel.go('news'), { sameLine: true });
    const deal = dealToday();
    ctx.button(
      `The market  ·  ${clipBalance()} clips${owns(deal.item.id) ? '' : `  ·  today: ${deal.item.name} ${deal.price}`}`,
      () => ctx.panel.go('market'),
      { x: 82 },
    );
    ctx.button('Help', () => ctx.panel.go('help'), { sameLine: true });
    ctx.button('About', () => ctx.panel.go('about'), { x: 60 });
    ctx.button(
      'The wall (how this game was built)',
      () => {
        const scene = ctx.scene;
        ctx.panel.close();
        scene.scene.launch('HistoryScene', { returnTo: scene.scene.key });
        scene.scene.pause();
      },
      { variant: 'paper' },
    );
    ctx.gap();
    ctx.small('tip: click the lost page link if you enjoy 404s');
    ctx.button('nowhere.example', () => ctx.panel.go('404'), { variant: 'paper' });
  },

  rugscan(ctx) {
    const view = ctx.panel.rugscanView;
    const c = view === 'index' ? null : view === 'auto' ? gameState.currentCase : view;
    ctx.heading('RugScan', 'ink');
    if (!c) {
      // Token index: every file in the cabinet, open ones can be launched from here.
      const save = saveStore.get();
      const active = ctx.panel.scene.scene.key === 'InvestigationScene';
      ctx.line('Tokens on record. Open files can be launched straight from here.', {
        color: 'woodMid',
      });
      const secretOpen = secretUnlocked(save, gameState.cases);
      gameState.cases.forEach((cs, i) => {
        // The nameless file only exists here once it's open.
        if (cs.secret && !secretOpen) return;
        const unlocked = i < save.campaignUnlocked;
        const grade = save.caseResults[cs.id]?.bestGrade;
        const b = ctx.button(
          `${unlocked ? cs.ticker : '????'}${grade ? `  ${grade}` : ''}`,
          () => {
            if (!unlocked) {
              audio.play('wrong');
              return;
            }
            ctx.panel.rugscanView = cs;
            ctx.panel.go('rugscan');
          },
          { variant: unlocked ? 'ink' : 'paper', sameLine: true },
        );
        const label = makeText(ctx.scene, b.bw + 8, ctx.y + 4, unlocked ? cs.title : 'classified', {
          font: 'body',
          size: FONT.size.body,
          color: unlocked ? 'shadow' : 'paperShadow',
        });
        ctx.content.add(label);
        ctx.y += b.bh + 4;
      });
      const custom = readCustomCases();
      if (custom.length) {
        ctx.gap(4);
        ctx.line('Your files (written in the editor):', { color: 'woodMid' });
        for (const cs of custom) {
          const b = ctx.button(
            `${cs.ticker}  d${cs.difficulty}`,
            () => {
              if (active) {
                audio.play('wrong');
                return;
              }
              ctx.panel.close();
              startCustomCase(ctx.scene, cs);
            },
            { variant: 'paper', sameLine: true },
          );
          ctx.content.add(
            makeText(ctx.scene, b.bw + 8, ctx.y + 4, cs.title, {
              font: 'body',
              size: FONT.size.body,
              color: 'shadow',
            }),
          );
          ctx.y += b.bh + 4;
        }
      }
      ctx.gap();
      ctx.small(
        active
          ? 'You are mid-case: the current file is under your token.'
          : 'RugScan does not rate tokens. Neither should you, until you have read the file.',
      );
      return;
    }
    const rng = makeRng(`rugscan:${c.id}`);
    const contract = c.documents.find((d) => d.type === 'contract');
    const liq = c.documents.find((d) => d.type === 'liquidity');
    ctx.line(`${c.ticker}  ${c.title}`, { color: 'woodDark' });
    ctx.rule();
    ctx.line(`Deployed:      ${rng.int(2, 40)} days ago`);
    ctx.line(
      `Source:        ${contract?.type === 'contract' ? (contract.content.verified ? 'verified' : 'NOT verified') : 'unknown'}`,
    );
    ctx.line(`Holders:       ${rng.int(120, 9800).toLocaleString()}`);
    ctx.line(`Pool:          ${liq?.type === 'liquidity' ? liq.content.pool : 'n/a'}`);
    ctx.line(`Liquidity:     ${liq?.type === 'liquidity' ? liq.content.liquidityUsd : 'n/a'}`);
    ctx.line(
      `Socials:       ${['website, telegram', 'telegram only', 'website, discord, x', 'x only'][rng.int(0, 3)]}`,
    );
    ctx.gap();
    const asides = [
      'Lucien: "Holders" counts wallets, not people. One person, forty hats.',
      'Lucien: The socials line tells you how many places they can delete your question.',
      'Lucien: Liquidity is a number until you read who can move it.',
      'Lucien: Deployed X days ago. Ask what the deployer did the day before.',
      'Lucien: Verified source means you can read it. It does not mean you did.',
    ];
    ctx.line(asides[rng.int(0, asides.length - 1)], { color: 'ink' });
    ctx.gap(2);
    ctx.line('Community notes:', { color: 'woodMid' });
    const notes = [
      'lol',
      'wen moon',
      'dyor',
      'is the lock real?',
      'chart looks like a staircase',
      'devs are based',
      'bought the dip. and the next dip.',
      'this is a certified hood classic',
      'who is the auditor',
      'my cat could write this contract',
    ];
    for (let i = 0; i < 4; i++)
      ctx.line(
        `  ${['0x9a', 'lena', 'moonboi', 'dave', 'priya', 'gooseman'][rng.int(0, 5)]}: ${notes[rng.int(0, notes.length - 1)]}`,
        { color: 'shadow' },
      );
    ctx.gap();
    const inCase =
      gameState.currentCase?.id === c.id && ctx.panel.scene.scene.key === 'InvestigationScene';
    if (!inCase) {
      ctx.button(
        'Open this case file',
        () => {
          const idx = gameState.cases.indexOf(c);
          if (idx < 0 || idx >= saveStore.get().campaignUnlocked) return;
          gameState.mode = 'campaign';
          gameState.currentIndex = idx;
          gameState.currentCase = c;
          ctx.panel.close();
          ctx.scene.scene.start('InvestigationScene');
        },
        { sameLine: true },
      );
    }
    ctx.button(
      'All tokens',
      () => {
        ctx.panel.rugscanView = 'index';
        ctx.panel.go('rugscan');
      },
      { x: inCase ? 0 : 150, variant: 'paper' },
    );
    ctx.small('RugScan shows data, not verdicts. The evidence on your desk is what counts.');
  },

  coin(ctx) {
    const s = wallet.state;
    ctx.heading(`${TOKEN.name} (${TOKEN.symbol})`, 'ink');
    ctx.line(
      "The precinct's own coin. Holding it opens extra dressing for the office, a weekly file and an allowance of clips at the market; it changes nothing about scoring, ever, and you never need it to play.",
    );
    ctx.gap();
    if (!TOKEN.mint) {
      ctx.line('Status: not launched yet. Check back after the case files are closed.', {
        color: 'stampRed',
      });
      ctx.gap();
    } else if (TOKEN.priceUrl) {
      const priceLine = makeText(ctx.scene, 0, ctx.y, 'Price: looking...', {
        font: 'body',
        size: FONT.size.body,
        color: 'woodMid',
      });
      ctx.content.add(priceLine);
      ctx.y += BROWSER.lineH;
      void fetchPrice().then((p) => {
        if (!priceLine.active) return;
        priceLine.setText(
          p === null ? 'Price: no answer from the feed' : `Price: ${formatPrice(p)}`,
        );
      });
      ctx.gap();
    }
    ctx.rule();
    if (!s.connected) {
      // What connecting does, before the button that does it.
      ctx.line('Connecting shares your public address so the game can read balances.', {
        color: 'woodMid',
      });
      ctx.line('Nothing is signed, nothing is sent, and the game never sees a seed phrase.', {
        color: 'woodMid',
      });
      if (TOKEN.leaderboardUrl)
        ctx.line(
          'Scores you post to the shared board carry the address, so holders can be told apart.',
          {
            color: 'woodMid',
          },
        );
      ctx.gap(4);
      if (s.available) {
        ctx.line(`${walletName()} detected.`, { color: 'lampGreen' });
        ctx.button(
          s.busy ? 'Waiting for the wallet...' : `Connect ${walletName()}`,
          () => {
            if (s.busy) return;
            lucienSays(ctx.scene, 'wallet');
            void wallet.connect();
          },
          { icon: walletName() === 'Phantom' ? TEX.iconPhantom : undefined },
        );
      } else {
        ctx.line('No Solana wallet in this browser.', { color: 'woodMid' });
        if (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches)
          ctx.line("On a phone, open this page inside the Phantom app's own browser.", {
            color: 'woodMid',
          });
        const get = ctx.button(
          'Get Phantom (new tab)',
          () => window.open(PHANTOM_URL, '_blank', 'noopener'),
          { variant: 'paper', sameLine: true, icon: TEX.iconPhantom },
        );
        ctx.button(
          'Check again',
          () => {
            void wallet.connect();
            ctx.panel.render();
          },
          { x: get.bw + 8, variant: 'paper' },
        );
      }
    } else {
      ctx.line(`Connected: ${shortAddress(s.address ?? '')}`, { color: 'lampGreen' });
      ctx.line(`SOL balance:   ${s.sol === null ? '...' : s.sol.toFixed(3)}`);
      ctx.line(
        `${TOKEN.symbol} balance: ${TOKEN.mint ? (s.token === null ? '...' : s.token.toLocaleString()) : 'n/a (no mint configured)'}`,
      );
      if (s.networkWarning) ctx.line(s.networkWarning, { color: 'stampRed' });
      const tier = currentTier();
      ctx.line(
        `Holder tier:   ${tier ? `${tier.level} · ${tier.name}` : `none yet (${TIERS[0].min.toLocaleString()}+ ${TOKEN.symbol} for the first)`}`,
        { color: tier ? 'lampGreen' : 'woodMid' },
      );
      if (tier) {
        awardBadge(ctx.scene, 'shareholder');
        lucienSays(ctx.scene, 'holder');
      }
      ctx.button(s.busy ? 'Refreshing...' : 'Refresh balances', () => void wallet.refresh(true), {
        sameLine: true,
      });
      ctx.button('Disconnect', () => void wallet.disconnect(), { x: 130, variant: 'paper' });
    }
    if (s.error) ctx.line(s.error, { color: 'stampRed' });
    ctx.gap(4);
    ctx.line('What holding opens:', { color: 'woodMid' });
    const bal = currentBalance();
    for (const t of TIERS) {
      const got = bal >= t.min;
      ctx.line(
        `${got ? '[x]' : '[ ]'} Tier ${t.level} · ${t.name.padEnd(12)} ${t.min.toLocaleString()}+  ${TIER_BLURB[t.level]}`,
        { color: got ? 'lampGreen' : 'shadow' },
      );
    }
    // The allowance follows the balance rather than a tier: every coin counts a little;
    // any tier halves the market's daily deal.
    const allowance = holderClips();
    ctx.line(
      allowance > 0
        ? `[x] Market allowance · ${allowance} clips for the ${Math.round(bal).toLocaleString()} held (${Math.round(CLIPS.perToken * TOKEN.holderMin)} per ${TOKEN.holderMin.toLocaleString()}, up to ${CLIPS.holderCap.toLocaleString()})`
        : `[ ] Market allowance · ${Math.round(CLIPS.perToken * TOKEN.holderMin)} clips per ${TOKEN.holderMin.toLocaleString()} held, up to ${CLIPS.holderCap.toLocaleString()}`,
      { color: allowance > 0 ? 'lampGreen' : 'shadow' },
    );
    ctx.line(`${currentTier() ? '[x]' : '[ ]'} Any tier · the market's daily deal at half price`, {
      color: currentTier() ? 'lampGreen' : 'shadow',
    });
    // The weekly holders' file: extra content, never a scoring edge.
    ctx.gap(4);
    const wk = weekKey();
    const done = saveStore.get().stats.weeklyDone.includes(`holders-${wk}`);
    if (hasEntitlement('holders-file')) {
      ctx.button(
        done
          ? `Holders' file ${wk} · closed (play again)`
          : `Open this week's holders' file (${wk})`,
        () => {
          ctx.panel.close();
          startColdCase(ctx.scene, `holders-${wk}`);
        },
      );
    } else {
      ctx.small(`Holders' file ${wk}: a second weekly cold case, for tier 1 and up.`);
    }
    if (TOKEN.mockBalance > 0)
      ctx.small(
        `dev: VITE_TOKEN_MOCK_BALANCE pretends you hold ${TOKEN.mockBalance.toLocaleString()}.`,
      );
    if (TOKEN.buyUrl) {
      ctx.gap();
      ctx.button(
        `Get ${TOKEN.symbol} (opens a new tab)`,
        () => window.open(TOKEN.buyUrl, '_blank', 'noopener'),
        { variant: 'paper' },
      );
    }
    ctx.gap();
    ctx.small(
      'Read-only: the game never asks you to sign or send anything. If something in here does, it is a bug, report it.',
    );
    ctx.small('All in-game tokens and cases are fictional. This is not financial advice.');
  },

  board(ctx) {
    // Rows to leave for a list that hasn't loaded yet: what it held last time (a fresh
    // board reserves one line, so the sections below aren't pushed off the screen).
    const rows = (key: string, max: number) => Math.max(1, Math.min(max, boardRows.get(key) ?? 1));
    const settle = (key: string, n: number, max: number) => {
      const shown = Math.max(1, Math.min(max, n));
      if (boardRows.get(key) === shown) return false;
      boardRows.set(key, shown);
      ctx.panel.render();
      return true;
    };
    const save = saveStore.get();
    ctx.heading('Hall of Detectives', 'ink');
    ctx.line(
      `You: ${save.detectiveName}  ·  ${rankForScore(save.totalScore)}  ·  ${save.totalScore} pts total`,
      { color: 'woodDark' },
    );
    ctx.button(
      'Change name',
      () =>
        ctx.panel.scene &&
        new NamePicker(ctx.scene, () => {
          void postDesk(); // the board row carries the name
          ctx.panel.render();
        }),
      { variant: 'paper', sameLine: true },
    );
    ctx.button(
      'Save ID card',
      () => {
        const badges = badgeCount();
        const mascot = ctx.scene.textures.exists(LUCIEN_TEX)
          ? (ctx.scene.textures.get(LUCIEN_TEX).getSourceImage() as HTMLImageElement)
          : null;
        const st = save.stats;
        const canvas = renderIdCard({
          detective: save.detectiveName,
          rank: rankForScore(save.totalScore),
          score: save.totalScore,
          casesSolved: Object.values(save.caseResults).filter((r) => r.solved).length,
          casesTotal: gameState.cases.length,
          badges: badges.earned,
          badgesTotal: badges.total,
          streak: currentStreak(save.daily, localDateKey()),
          rushBest: st.rushBest,
          coldBest: st.coldBest,
          clips: save.clips.earned + holderClips(),
          badgeNames: save.badges
            .map((id) => BADGE_BY_ID[id]?.name)
            .filter((n): n is string => !!n)
            .slice(0, 4),
          url: `${location.host}${location.pathname}`.replace(/\/$/, ''),
          mascot,
          tierTitle: hasEntitlement('board-title') ? currentTier()?.name : undefined,
        });
        void shareOrDownloadCanvas(
          canvas,
          `rug-or-not-detective-${save.detectiveName.toLowerCase()}.png`,
          `${save.detectiveName}, ${rankForScore(save.totalScore)}. Rug or Not?${TOKEN.xHandle ? ` @${TOKEN.xHandle}` : ''}`,
        ).then((res) => {
          if (res === 'cancelled' || !ctx.scene.scene.isActive()) return;
          const ok = res !== 'failed';
          audio.play(ok ? 'stamp' : 'wrong');
          toast(
            ctx.scene,
            res === 'shared' ? 'CARD SHARED' : ok ? 'CARD SAVED' : 'NO LUCK',
            ok ? 'your detective ID' : 'this browser blocks downloads',
          );
        });
      },
      { x: 110, variant: 'paper' },
    );
    // Daily strip: the last two weeks, filled squares are days played.
    const today = localDateKey();
    const strip = playedStrip(save.daily, today, 14);
    ctx.line(
      `Daily streak: ${currentStreak(save.daily, today)}  ·  best ${save.daily.bestStreak}${save.daily.freezes > 0 ? `  ·  ${save.daily.freezes} freeze${save.daily.freezes > 1 ? 's' : ''} in hand` : ''}`,
      { color: 'woodMid' },
    );
    strip.forEach((on, i) => {
      ctx.content.add(
        rect(ctx.scene, i * 12, ctx.y + 1, 9, 9, on ? HEX.stampGreen : HEX.paperShadow),
      );
      if (!on) ctx.content.add(rect(ctx.scene, i * 12 + 3, ctx.y + 4, 3, 3, HEX.paper));
    });
    ctx.content.add(
      makeText(ctx.scene, 14 * 12 + 4, ctx.y, 'last 14 days', {
        size: FONT.size.tiny,
        color: 'woodMid',
      }),
    );
    ctx.y += 14;
    const st = save.stats;
    const acc = st.runs > 0 ? Math.round((st.correct / st.runs) * 100) : 0;
    const missed = Object.entries(st.flagMisses).sort((a, b) => b[1] - a[1])[0];
    ctx.line(
      `Record: ${st.runs} runs  ·  ${acc}% verdict accuracy  ·  badges ${save.badges.length}`,
      { color: 'woodMid' },
    );
    if (missed)
      ctx.line(
        `Most missed flag: ${FLAGS[missed[0] as keyof typeof FLAGS]?.title ?? missed[0]} (${missed[1]}x)`,
        { color: 'stampRed' },
      );
    // The detectives board: one row per desk, the career rather than a run. Yours goes up
    // (or is refreshed) whenever the page opens.
    void postDesk(60_000);
    ctx.rule();
    const sort = deskSort;
    ctx.line(
      `Detectives (${leaderboard.kind === 'remote' ? 'precinct server' : 'this device'}), by ${sort === 'total' ? 'career score' : 'clips earned'}:`,
      { color: 'woodMid' },
    );
    ctx.button(
      sort === 'total' ? 'Sort by clips' : 'Sort by score',
      () => {
        deskSort = sort === 'total' ? 'clips' : 'total';
        ctx.panel.render();
      },
      { variant: 'paper' },
    );
    const deskY = ctx.y;
    void leaderboard.desks(10, sort).then((desks: DeskEntry[]) => {
      if (!ctx.content.active) return;
      if (settle(`desks:${sort}`, desks.length, 10)) return;
      if (desks.length === 0) {
        ctx.content.add(
          makeText(ctx.scene, 0, deskY, 'No desks on record yet. Close a file and yours goes up.', {
            font: 'body',
            size: FONT.size.body,
            color: 'woodMid',
          }),
        );
        return;
      }
      const mine = saveStore.get().id;
      desks.forEach((d, i) => {
        const line = `${String(i + 1).padStart(2, ' ')}. ${(d.name + (d.holder ? '$' : '')).padEnd(13)} ${String(d.total).padStart(5)} pts  ${d.rank.padEnd(9).slice(0, 9)} ${String(d.clips).padStart(5)} clips  ${d.solved} solved`;
        ctx.content.add(
          makeText(ctx.scene, 0, deskY + i * BROWSER.lineH, line, {
            font: 'body',
            size: FONT.size.body,
            color: i === 0 ? 'amber' : d.id === mine ? 'ink' : 'shadow',
          }),
        );
      });
    });
    ctx.y += BROWSER.lineH * rows(`desks:${sort}`, 10);
    // The desk's own log: the last few files, newest first, whatever the board is.
    const recent = recentRuns(6);
    if (recent.length) {
      ctx.rule();
      ctx.line('Recent files on this desk:', { color: 'woodMid' });
      for (const e of recent) {
        const kind = e.mode === 'rush' ? 'rush' : e.mode === 'cold' ? 'cold' : 'case';
        const name = e.caseId.replace(/^cold-/, '');
        ctx.line(
          `${e.date.slice(5, 10)}  ${kind.padEnd(5)} ${name.padEnd(14).slice(0, 14)} ${String(e.score).padStart(4)}  ${e.grade}`,
          { color: 'shadow' },
        );
      }
    }
    ctx.rule();
    ctx.line(
      `Best runs (${leaderboard.kind === 'remote' ? 'precinct server' : 'this device'})${ctx.panel.holdersOnly ? ', holders only' : ''}:`,
      { color: 'woodMid' },
    );
    if (TOKEN.mint) {
      ctx.button(
        ctx.panel.holdersOnly ? 'Everyone' : `${TOKEN.symbol} holders only`,
        () => {
          ctx.panel.holdersOnly = !ctx.panel.holdersOnly;
          ctx.panel.render();
        },
        { variant: 'paper' },
      );
    }
    const holdersOnly = ctx.panel.holdersOnly;
    const placeholder = makeText(ctx.scene, 0, ctx.y, 'loading...', {
      font: 'body',
      size: FONT.size.body,
      color: 'woodMid',
    });
    ctx.content.add(placeholder);
    const startY = ctx.y;
    void leaderboard.list(holdersOnly ? 50 : 10).then((all: ScoreEntry[]) => {
      if (!placeholder.active) return;
      placeholder.destroy();
      let y = startY;
      const entries = (holdersOnly ? all.filter((e) => e.holder) : all).slice(0, 10);
      if (settle(`case:${holdersOnly}`, entries.length, 10)) return;
      if (entries.length === 0) {
        ctx.content.add(
          makeText(
            ctx.scene,
            0,
            y,
            holdersOnly ? 'No holder runs yet.' : 'No runs yet. Close a case and come back.',
            {
              font: 'body',
              size: FONT.size.body,
              color: 'woodMid',
            },
          ),
        );
        return;
      }
      entries.forEach((e, i) => {
        const line = `${String(i + 1).padStart(2, ' ')}. ${(e.name + (e.holder ? '$' : '')).padEnd(13)} ${String(e.score).padStart(4)}${e.hard ? '*' : ' '} ${e.grade}  ${e.caseId.padEnd(10)} ${e.date.slice(0, 10)}`;
        ctx.content.add(
          makeText(ctx.scene, 0, y, line, {
            font: 'body',
            size: FONT.size.body,
            color: i === 0 ? 'amber' : 'shadow',
          }),
        );
        y += BROWSER.lineH;
      });
    });
    ctx.y += BROWSER.lineH * (rows(`case:${holdersOnly}`, 10) + 1);
    ctx.rule();
    ctx.line(
      `Red Flag Rush: best ${st.rushBest}  ·  longest streak ${st.rushBestStreak}  ·  ${st.rushRuns} runs`,
      { color: 'woodMid' },
    );
    const rushY = ctx.y;
    void leaderboard.list(5, 'rush').then((entries: ScoreEntry[]) => {
      if (!ctx.content.active) return;
      if (settle('rush', entries.length, 5)) return;
      if (entries.length === 0) {
        ctx.content.add(
          makeText(ctx.scene, 0, rushY, 'No rush runs yet. Sixty seconds, one page at a time.', {
            font: 'body',
            size: FONT.size.body,
            color: 'woodMid',
          }),
        );
        return;
      }
      entries.forEach((e, i) => {
        const line = `${String(i + 1).padStart(2, ' ')}. ${(e.name + (e.holder ? '$' : '')).padEnd(13)} ${String(e.score).padStart(4)}  ${e.grade}  ${e.date.slice(0, 10)}`;
        ctx.content.add(
          makeText(ctx.scene, 0, rushY + i * BROWSER.lineH, line, {
            font: 'body',
            size: FONT.size.body,
            color: i === 0 ? 'amber' : 'shadow',
          }),
        );
      });
    });
    ctx.y += BROWSER.lineH * rows('rush', 5);
    ctx.rule();
    ctx.line(
      `Cold cases: ${st.coldRuns} closed  ·  ${st.coldCorrect} called right  ·  best ${st.coldBest}`,
      { color: 'woodMid' },
    );
    const coldY = ctx.y;
    void leaderboard.list(5, 'cold').then((entries: ScoreEntry[]) => {
      if (!ctx.content.active) return;
      if (settle('cold', entries.length, 5)) return;
      if (entries.length === 0) {
        ctx.content.add(
          makeText(ctx.scene, 0, coldY, 'No cold cases yet. The pile never ends.', {
            font: 'body',
            size: FONT.size.body,
            color: 'woodMid',
          }),
        );
        return;
      }
      entries.forEach((e, i) => {
        const line = `${String(i + 1).padStart(2, ' ')}. ${(e.name + (e.holder ? '$' : '')).padEnd(13)} ${String(e.score).padStart(4)}${e.hard ? '*' : ' '} ${e.grade}  ${e.caseId.replace(/^cold-/, '').padEnd(8)} ${e.date.slice(0, 10)}`;
        ctx.content.add(
          makeText(ctx.scene, 0, coldY + i * BROWSER.lineH, line, {
            font: 'body',
            size: FONT.size.body,
            color: i === 0 ? 'amber' : 'shadow',
          }),
        );
      });
    });
    ctx.y += BROWSER.lineH * rows('cold', 5);
    // This week's file: everyone gets the same generated case, so the scores compare.
    ctx.rule();
    const wk = `cold-week-${weekKey()}`;
    ctx.line(`This week's file (${weekKey()}):`, { color: 'woodMid' });
    const weekY = ctx.y;
    void leaderboard.list(5, 'cold', wk).then((week: ScoreEntry[]) => {
      if (!ctx.content.active) return;
      if (settle('week', week.length, 5)) return;
      if (week.length === 0) {
        ctx.content.add(
          makeText(
            ctx.scene,
            0,
            weekY,
            'Nobody has closed it yet. The WEEKLY folder is in the drawer.',
            {
              font: 'body',
              size: FONT.size.body,
              color: 'woodMid',
            },
          ),
        );
        return;
      }
      week.forEach((e, i) => {
        const line = `${String(i + 1).padStart(2, ' ')}. ${(e.name + (e.holder ? '$' : '')).padEnd(13)} ${String(e.score).padStart(4)}${e.hard ? '*' : ' '} ${e.grade}  ${e.date.slice(0, 10)}`;
        ctx.content.add(
          makeText(ctx.scene, 0, weekY + i * BROWSER.lineH, line, {
            font: 'body',
            size: FONT.size.body,
            color: i === 0 ? 'amber' : 'shadow',
          }),
        );
      });
    });
    ctx.y += BROWSER.lineH * rows('week', 5);
    lucienSays(ctx.scene, 'leaderboard');
  },

  news(ctx) {
    ctx.heading('The Ledger - Late Edition', 'ink');
    const rng = makeRng(new Date().toDateString());
    const seen = new Set(saveStore.get().seenHints);
    const late = LATE_NEWS.filter((n) => seen.has(n.after)).map((n) => n.headline);
    const picks = [...late, ...[...NEWS].sort(() => rng.next() - 0.5)].slice(0, 6);
    for (const h of picks) {
      const t = makeText(ctx.scene, 0, ctx.y, `> ${h.title}`, {
        font: 'body',
        size: FONT.size.body,
        color: 'ink',
        wrap: ctx.width,
      });
      t.setInteractive({ useHandCursor: false });
      t.on(
        'pointerdown',
        () =>
          new StickyNote(
            ctx.scene,
            BROWSER.x + 40,
            BROWSER.y + 80,
            h.title.slice(0, 40),
            h.body,
            300,
          ),
      );
      ctx.content.add(t);
      ctx.y += Math.ceil(t.height) + 4;
    }
    ctx.gap();
    ctx.small(
      'All headlines are fictional. Any resemblance to real projects is a coincidence, and a lesson.',
    );
  },

  badges(ctx) {
    const earned = new Set(saveStore.get().badges);
    const totals = {
      cases: gameState.cases.length,
      rugs: gameState.cases.filter((c) => c.verdict === 'rug').length,
      pages: ALL_PAGES.length,
      flags: FLAG_IDS.length,
      weathers: WEATHERS.length,
    };
    ctx.heading(`Badges  ${[...earned].length}/${BADGES.length}`, 'ink');
    for (const b of BADGES) {
      const has = earned.has(b.id);
      const name = has || !b.secret ? b.name : '? ? ?';
      const desc = has || !b.secret ? b.description : 'secret';
      // Counter badges show how far along you are, once you know what they are.
      const p = !has && (!b.secret || earned.has(b.id)) ? badgeProgress(b.id, totals) : null;
      const progress = p && p.n > 0 ? `  (${p.n}/${p.of})` : '';
      ctx.line(`${has ? '[x]' : '[ ]'} ${name.padEnd(24)} ${desc}${progress}`, {
        color: has ? 'shadow' : p && p.n > 0 ? 'woodMid' : 'paperShadow',
      });
    }
    ctx.gap();
    ctx.small('Badges are for bragging. They change nothing about scoring.');
  },

  market(ctx) {
    const scene = ctx.scene;
    lucienSays(scene, 'market');
    const holder = holderClips();
    const spent = saveStore.get().clips.spent;
    ctx.heading(`The market  ·  ${clipBalance()} clips to spend`, 'ink');
    ctx.line('Dressing for the desk, paid in paper clips. Nothing here changes a score.');
    ctx.line(
      `${earnedClips()} earned from files${holder ? `  ·  ${holder} holder allowance` : ''}${spent ? `  ·  ${spent} spent` : ''}  ·  ${SHOP.filter((i) => owns(i.id)).length}/${SHOP.length} in the collection`,
      { color: 'woodMid' },
    );
    if (!holder) {
      ctx.small(
        `Holding ${TOKEN.symbol} adds an allowance${TOKEN.mint ? '' : ' once it launches'}: ${Math.round(CLIPS.perToken * TOKEN.holderMin)} clips per ${TOKEN.holderMin.toLocaleString()} coins, up to ${CLIPS.holderCap.toLocaleString()}.`,
      );
      ctx.small('Read-only: nothing is ever spent from the wallet.');
    }
    const deal = dealToday();
    if (!owns(deal.item.id))
      ctx.line(
        `Today's deal: ${deal.item.name}, ${deal.price} clips instead of ${deal.item.price} (${SLOT_TAB[deal.item.style.slot]} drawer${deal.holder ? ", holders' price" : ''}). Until midnight.`,
        { color: 'stampRed' },
      );
    ctx.gap(4);

    // Your desk as it stands: the props at their real size, Lucien to scale. Hovering a
    // row below tries that item on here.
    const strip = ctx.y + 62;
    let px = 4;
    const stripImg: Partial<Record<ShopSlot, Phaser.GameObjects.Image>> = {};
    const show = (key: string, slot: ShopSlot, h?: number) => {
      const img = scene.make
        .image({ x: px, y: strip, key: scene.textures.exists(key) ? key : TEX.pixel }, false)
        .setOrigin(0, 1)
        .setVisible(scene.textures.exists(key));
      if (h) img.setDisplaySize(Math.round(img.width * (h / img.height)), h);
      ctx.content.add(img);
      stripImg[slot] = img;
      px += (img.visible ? img.displayWidth : 28) + 12;
    };
    show(LUCIEN_TEX, 'coat', 60);
    stripImg.hat = stripImg.coat;
    show(`${TEX.cat}-0`, 'cat');
    stripImg.collar = stripImg.cat;
    show(TEX.mug, 'mug');
    show(TEX.radio, 'radio');
    show(TEX.ornament, 'ornament');
    // The window, small: night sky, sill, and the curtains in the colour being tried.
    const win = scene.make.graphics({ x: px, y: strip - 26 }, false);
    ctx.content.add(win);
    const drawWindow = (color: PaletteKey | null) => {
      win.clear();
      win.fillStyle(HEX.shadow, 1).fillRect(0, 0, 44, 26);
      win.fillStyle(HEX.bg, 1).fillRect(2, 2, 40, 20);
      win.fillStyle(HEX.paperShadow, 0.8);
      for (const [wx, wy] of [
        [8, 8],
        [15, 12],
        [24, 6],
        [31, 14],
        [36, 9],
      ])
        win.fillRect(wx, wy, 1, 1);
      win.fillStyle(HEX.woodMid, 1).fillRect(0, 22, 44, 4);
      if (!color) return;
      win
        .fillStyle(HEX[color], 1)
        .fillRect(2, 2, 8, 20)
        .fillRect(34, 2, 8, 20)
        .fillRect(2, 2, 40, 3);
      win.fillStyle(HEX.bg, 0.35).fillRect(5, 2, 2, 20).fillRect(37, 2, 2, 20);
    };
    const wornCurtain = worn('curtains').style;
    drawWindow(wornCurtain.slot === 'curtains' ? wornCurtain.color : null);
    ctx.y = strip + 6;
    /** Put `item` on the strip, or (with null) whatever the desk really wears. */
    const tryOn = (item: ShopItem | null, slot: ShopSlot) => {
      if (slot === 'curtains') {
        const st = item?.style ?? wornCurtain;
        drawWindow(st.slot === 'curtains' ? st.color : null);
        return;
      }
      const img = stripImg[slot];
      if (!img?.active) return;
      const realKey =
        slot === 'coat' || slot === 'hat'
          ? LUCIEN_TEX
          : slot === 'cat' || slot === 'collar'
            ? `${TEX.cat}-0`
            : slot === 'ornament'
              ? TEX.ornament
              : slot === 'mug'
                ? TEX.mug
                : TEX.radio;
      const key = item ? previewTexture(scene, item) : realKey;
      const shown = key && scene.textures.exists(key) ? key : null;
      img.setVisible(!!shown);
      if (!shown) return;
      const h = slot === 'coat' || slot === 'hat' ? 60 : undefined;
      img.setTexture(shown);
      if (h) img.setDisplaySize(Math.round(img.width * (h / img.height)), h);
      else img.setDisplaySize(img.width, img.height);
    };

    // One drawer per slot.
    let tx = 0;
    for (const slot of SHOP_SLOTS) {
      const open = slot.id === marketSlot;
      const b = ctx.button(
        SLOT_TAB[slot.id],
        () => {
          if (marketSlot === slot.id) return;
          marketSlot = slot.id;
          audio.play('paper');
          ctx.panel.render();
        },
        { x: tx, sameLine: true, variant: open ? 'ink' : 'paper' },
      );
      tx += b.bw + 3;
    }
    ctx.y += UI.buttonH + 8;

    const slotName = SHOP_SLOTS.find((s) => s.id === marketSlot)?.name ?? '';
    ctx.line(
      `${slotName}  ·  wearing ${worn(marketSlot).name}${touchScreen() ? '' : '  ·  hover a row to try it on'}`,
      { color: 'woodMid' },
    );
    ctx.gap(2);
    for (const item of itemsFor(marketSlot)) {
      const rowY = ctx.y;
      const inUse = worn(marketSlot).id === item.id;
      const has = owns(item.id);
      const tierShort = !!item.tier && (currentTier()?.level ?? 0) < item.tier;
      const blocker = has ? null : buyBlocker(item);
      let rowButton: PixelButton | null = null;
      if (inUse) {
        ctx.content.add(
          makeText(scene, 4, rowY + 3, 'in use', { size: FONT.size.tiny, color: 'stampGreen' }),
        );
      } else if (has) {
        rowButton = ctx.button(
          'Wear',
          () => {
            if (!wear(item.id)) return;
            redress(scene, item.style.slot);
            audio.play('click');
            checkGilded(scene);
            ctx.panel.render();
          },
          { sameLine: true, width: 64 },
        );
      } else if (tierShort) {
        rowButton = ctx.button(
          `Tier ${item.tier}`,
          () =>
            toast(
              scene,
              'HOLDERS ONLY',
              `${item.name} takes holder tier ${item.tier} · the ${TOKEN.symbol} page has the numbers`,
            ),
          { sameLine: true, width: 64, variant: 'paper' },
        );
      } else {
        rowButton = ctx.button(
          `Buy ${priceOf(item)}`,
          () => {
            if (!buy(item.id)) {
              audio.play('wrong');
              toast(scene, 'NOT YET', buyBlocker(item) ?? 'something got in the way');
              return;
            }
            redress(scene, item.style.slot);
            audio.play('buy');
            toast(scene, 'BOUGHT', `${item.name} · ${clipBalance()} clips left`);
            const quips = BOUGHT_QUIPS[item.style.slot];
            LucienBubble.say(scene, quips[Phaser.Math.Between(0, quips.length - 1)]);
            if (boughtCount() >= 5) awardBadge(scene, 'collector');
            checkGilded(scene);
            ctx.panel.render();
          },
          // Short of clips: still pressable, so the press can say how many are missing.
          { sameLine: true, width: 64, variant: blocker ? 'paper' : 'ink' },
        );
      }
      if (rowButton && !inUse) {
        rowButton.on('pointerover', () => tryOn(item, item.style.slot));
        rowButton.on('pointerout', () => tryOn(null, item.style.slot));
      }
      const onDeal = !has && deal.item.id === item.id;
      const price = onDeal
        ? `${deal.price} clips today (was ${item.price})`
        : item.price
          ? `${item.price} clips`
          : 'free';
      ctx.content.add(
        makeText(scene, 72, rowY + 2, `${item.name}  ·  ${price}`, {
          font: 'body',
          size: FONT.size.body,
          color: onDeal ? 'stampRed' : has || !blocker ? 'shadow' : 'woodMid',
        }),
      );
      ctx.content.add(
        makeText(scene, 72, rowY + 13, item.blurb, { size: FONT.size.tiny, color: 'woodMid' }),
      );
      ctx.y = rowY + 26;
    }
    ctx.gap();
    ctx.small(
      `Files pay ${CLIPS.file} clips (+${CLIPS.firstSolve} for a first solve, +${CLIPS.sGrade} for an S, +${CLIPS.daily} for the daily, +${CLIPS.weekly} for the weekly; ${CLIPS.wornFile} after three replays); a rush pays ${CLIPS.rushPerThousand} per 1,000 points.`,
    );
  },

  help(ctx) {
    ctx.heading('Help', 'ink');
    // The long version lives in the notebook; it opens over a case like the wall does.
    ctx.button(
      'Open the handbook (the notebook, chapter four)',
      () => {
        const scene = ctx.scene;
        ctx.panel.close();
        const at = { chapter: 'handbook', id: 'desk' };
        if (scene.scene.key === 'TitleScene') {
          scene.scene.start('NotebookScene', at);
          return;
        }
        scene.scene.launch('NotebookScene', { overlay: true, returnTo: scene.scene.key, ...at });
        scene.scene.pause();
      },
      { variant: 'paper' },
    );
    if (touchScreen()) {
      ctx.line(
        'Press the paper and slide: the lens floats above your finger. Fine print only shows through it.',
      );
      ctx.line(
        'Tap a suspicious line to pin it. Tap again to unpin. Drag a stamp onto the paper for the verdict.',
      );
      ctx.line('Herring pins cost points. Long pages scroll with a drag.');
      ctx.line(
        'On a phone, add this page to the home screen: the desk then opens without the browser around it.',
      );
    } else {
      ctx.line('Hover evidence with the lens. Fine print only shows through it.');
      ctx.line('Click a suspicious line to pin it. Click again to unpin.');
      ctx.line('Stamp RUG (R) or LEGIT (L). Herring pins cost points.');
      ctx.line('Tab / arrows cycle clue spots, Enter pins, 1-6 switch tabs, wheel scrolls.');
      ctx.line('Esc pauses. F toggles fullscreen. M mutes.');
    }
    ctx.line(
      "Missed something? The report offers a second look: the file again, read-only, misses in amber. The grade sticker in the drawer reopens a file's last report.",
    );
    ctx.line(
      'Red Flag Rush: sixty seconds, one page at a time. Click the red flag to clear the page; herrings and blank paper cost seconds.',
    );
    ctx.line(
      'Cold cases: files the printer makes up on the spot, endless. Same rules, their own board; the seed in the share link brings the same file back.',
    );
    ctx.line(
      'The WEEKLY folder is the same cold case for everyone this week. Every other daily is a generated file too.',
    );
    ctx.line(
      'Drills: every red-flag page in the notebook can print five pages that hide that flag. Clear them all to log it.',
    );
    ctx.line(
      'Your own files: write one in the editor (About page) and it shows up under RugScan > Your files.',
    );
    ctx.line(
      `Wallet: the chip on the title opens the ${TOKEN.symbol} page. Optional, read-only; the game never asks you to sign anything.`,
    );
    ctx.gap();
    ctx.line(
      'Desk: hover the coffee, click the lamp, the window, the moon, the cat, the corkboard, the folders, the ink pad, the clock, the radio (four stations), the safe.',
      { color: 'woodMid' },
    );
    ctx.gap();
    ctx.small(`NetScope v2.0  ·  ${gameState.cases.length} cases loaded`);
  },

  about(ctx) {
    ctx.heading(`Rug or Not?  ${GAME_VERSION}`, 'ink');
    ctx.line(
      'A pixel-noir detective game about reading before buying. Every case, token, person and',
    );
    ctx.line('project in it is fictional. Nothing here is financial advice.');
    ctx.gap();
    ctx.line('Made with Phaser 3 and a lot of coffee. Fonts: Pixelify Sans and VT323 (SIL OFL).', {
      color: 'woodMid',
    });
    ctx.line('Mascot: Detective Lucien. Biscuit the cat: unpaid, unbothered.', {
      color: 'woodMid',
    });
    ctx.line('Music, sound effects and every texture are generated in code; no samples.', {
      color: 'woodMid',
    });
    ctx.gap();
    ctx.line('The wall behind the corkboard polaroid is the making-of. The safe under the desk', {
      color: 'woodMid',
    });
    ctx.line('holds the full changelog, if you can open it.', { color: 'woodMid' });
    ctx.gap();
    if (TOKEN.xHandle)
      ctx.button(`@${TOKEN.xHandle} on X (opens a new tab)`, () => {
        window.open(`https://x.com/${TOKEN.xHandle}`, '_blank', 'noopener');
      });
    if (TOKEN.communityUrl)
      ctx.button(
        `${/t\.me|telegram/i.test(TOKEN.communityUrl) ? 'Telegram' : /discord/i.test(TOKEN.communityUrl) ? 'Discord' : 'The community'} (opens a new tab)`,
        () => window.open(TOKEN.communityUrl, '_blank', 'noopener'),
      );
    ctx.button(
      'Source on GitHub (opens a new tab)',
      () => {
        window.open('https://github.com/elooouan/rug-or-not', '_blank', 'noopener');
      },
      { variant: 'paper' },
    );
    ctx.button(
      'Something broke? Report it (new tab)',
      () => window.open('https://github.com/elooouan/rug-or-not/issues', '_blank', 'noopener'),
      { variant: 'paper' },
    );
    ctx.button(
      'Case editor (opens a new tab)',
      () => {
        window.open('./editor.html', '_blank', 'noopener');
      },
      { variant: 'paper' },
    );
    ctx.small('Write your own file in the editor; it shows up under RugScan > Your files.');
    ctx.small('Wallet features are read-only. The game never asks you to sign or send anything.');
  },

  '404'(ctx) {
    ctx.heading('404 - page not found', 'stampRed');
    ctx.line('You followed a link from a stranger on the internet. This is how it starts.');
    ctx.gap();
    const cat = ctx.scene.make.image({ x: 0, y: ctx.y, key: `${TEX.cat}-0` }, false).setOrigin(0);
    ctx.content.add(cat);
    ctx.y += 24;
    ctx.line('Biscuit found this page. She is not impressed.');
    ctx.button('Go home', () => ctx.panel.go('home'));
  },
};

/** Arcade-style 3-to-8 letter handle picker. */
export class NamePicker extends Phaser.GameObjects.Container {
  private static readonly CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
  private slots: number[];
  private letters: Phaser.GameObjects.Text[] = [];
  /** The slot the keyboard writes into; shown as an underline. */
  private cursor = 0;
  private fresh = true;
  private caret!: Phaser.GameObjects.Rectangle;
  private slotX: number[] = [];

  constructor(scene: Phaser.Scene, onDone: () => void) {
    super(scene, 0, 0);
    const current = saveStore.get().detectiveName.toUpperCase().padEnd(6, '_').slice(0, 6);
    this.slots = [...current].map((ch) => Math.max(0, NamePicker.CHARS.indexOf(ch)));
    this.cursor = Math.min(5, current.replace(/_+$/, '').length);
    const w = 220;
    const h = 96;
    const x = (GAME_WIDTH - w) / 2;
    const y = (GAME_HEIGHT - h) / 2;
    const dim = rect(scene, 0, 0, GAME_WIDTH, GAME_HEIGHT, HEX.bg, 0.4);
    dim.setInteractive();
    this.add(dim);
    this.add(rect(scene, x + 3, y + 4, w, h, HEX.bg, 0.5));
    this.add(rect(scene, x - 2, y - 2, w + 4, h + 4, HEX.woodDark));
    this.add(rect(scene, x, y, w, h, HEX.paper));
    this.add(
      makeText(scene, x + w / 2, y + 6, 'DETECTIVE NAME', {
        size: FONT.size.small,
        color: 'shadow',
      }).setOrigin(0.5, 0),
    );
    const slotW = 26;
    const sx = x + (w - slotW * 6) / 2;
    this.slots.forEach((_, i) => {
      const cx = sx + i * slotW + slotW / 2;
      this.slotX.push(cx);
      const up = new PixelButton(scene, cx - 9, y + 20, '+', () => this.bump(i, 1), {
        variant: 'paper',
      });
      const down = new PixelButton(scene, cx - 9, y + 58, '-', () => this.bump(i, -1), {
        variant: 'paper',
      });
      scene.children.remove(up);
      scene.children.remove(down);
      const letter = makeText(scene, cx, y + 47, '', {
        size: FONT.size.heading,
        color: 'ink',
      }).setOrigin(0.5);
      this.letters.push(letter);
      this.add([up, down, letter]);
    });
    this.caret = rect(scene, sx, y + 56, slotW - 8, 1, HEX.ink);
    this.add(this.caret);
    this.add(
      makeText(scene, x + w / 2, y + h - 30, 'type it, or use the arrows  ·  Enter saves', {
        size: FONT.size.tiny,
        color: 'woodMid',
      }).setOrigin(0.5, 0),
    );
    const confirm = () => {
      const name =
        this.slots
          .map((s) => NamePicker.CHARS[s])
          .join('')
          .replace(/_+$/, '') || 'ANON';
      if (!isNameAllowed(name)) {
        audio.play('wrong');
        toast(scene, 'NOT THAT ONE', 'pick a handle fit for the board');
        return;
      }
      saveStore.update((d) => (d.detectiveName = name));
      audio.play('correct');
      this.destroy();
      onDone();
    };
    const ok = new PixelButton(scene, x + w / 2 - 24, y + h - 20, 'OK', confirm, { width: 48 });
    scene.children.remove(ok);
    this.add(ok);
    // Typing beats clicking plus and minus eighteen times.
    const kb = scene.input.keyboard;
    const onKey = (e: KeyboardEvent) => {
      const n = NamePicker.CHARS.length;
      if (e.key === 'Enter') confirm();
      else if (e.key === 'Escape') {
        markEscConsumed();
        this.destroy();
      } else if (e.key === 'Backspace') {
        this.cursor = Math.max(0, this.cursor - 1);
        this.slots[this.cursor] = n - 1;
        audio.play('tick');
      } else if (e.key === 'ArrowLeft') this.cursor = Math.max(0, this.cursor - 1);
      else if (e.key === 'ArrowRight') this.cursor = Math.min(5, this.cursor + 1);
      else if (e.key === 'ArrowUp') this.bump(this.cursor, 1);
      else if (e.key === 'ArrowDown') this.bump(this.cursor, -1);
      else if (e.key.length === 1 && NamePicker.CHARS.includes(e.key.toUpperCase())) {
        // The first letter typed starts a new name; the old one was only a suggestion.
        if (this.fresh) {
          this.slots = this.slots.map(() => n - 1);
          this.cursor = 0;
        }
        this.slots[this.cursor] = NamePicker.CHARS.indexOf(e.key.toUpperCase());
        this.cursor = Math.min(5, this.cursor + 1);
        audio.play('tick');
      } else return;
      this.fresh = false;
      this.refresh();
    };
    kb?.on('keydown', onKey);
    pushOverlay(this);
    pushModal();
    this.once(Phaser.GameObjects.Events.DESTROY, () => {
      kb?.off('keydown', onKey);
      popOverlay(this);
      popModal();
    });
    this.refresh();
    this.setDepth(DEPTH.toast);
    scene.add.existing(this);
  }

  private bump(i: number, d: number): void {
    this.fresh = false;
    const n = NamePicker.CHARS.length;
    this.slots[i] = (this.slots[i] + d + n) % n;
    audio.play('tick');
    this.refresh();
  }

  private refresh(): void {
    this.letters.forEach((t, i) => t.setText(NamePicker.CHARS[this.slots[i]]));
    this.caret.setX(this.slotX[this.cursor] - 9);
  }
}
