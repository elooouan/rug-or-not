import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { BROWSER, FONT, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { HEX, type PaletteKey } from '@/config/palette';
import { shortAddress, TOKEN } from '@/config/token';
import { GAME_VERSION } from '@/config/gameConfig';
import { LATE_NEWS, NEWS } from '@/data/news';
import { audio } from '@/systems/audio';
import { gameState } from '@/systems/gameState';
import { secretUnlocked } from '@/systems/secretCase';
import { readCustomCases } from '@/systems/customCases';
import { startCustomCase } from '@/systems/coldCase';
import type { CaseData } from '@/data/schema';
import { leaderboard, type ScoreEntry } from '@/systems/leaderboard';
import { rankForScore } from '@/systems/ranks';
import { FLAG_IDS, FLAGS } from '@/data/flags';
import { makeRng } from '@/systems/rng';
import { currentStreak, localDateKey, playedStrip, weekKey } from '@/systems/dailyCase';
import { saveStore } from '@/systems/save';
import { wallet, walletName } from '@/systems/wallet';
import { awardBadge, badgeCount, badgeProgress, noteSeen } from '@/systems/badges';
import { BADGE_BY_ID, BADGES } from '@/data/badges';
import { WEATHERS } from '@/systems/settings';
import { UNLOCKABLES } from '@/data/unlockables';
import { LUCIEN_TEX, lucienSays } from './DialogueBox';
import { PixelButton } from './PixelButton';
import { rect } from './shapes';
import { attachScroll } from './dragScroll';
import { downloadCanvas, renderIdCard } from '@/systems/shareCard';
import { toast } from './Toast';
import { StickyNote } from './StickyNote';
import { charWidth, makeText, wrapMono, type TextOpts } from './text';
import { markEscConsumed, popOverlay, pushOverlay } from './escGuard';

type PageId = 'home' | 'rugscan' | 'coin' | 'board' | 'news' | 'help' | 'badges' | 'about' | '404';
const ALL_PAGES: PageId[] = [
  'home',
  'rugscan',
  'coin',
  'board',
  'news',
  'help',
  'badges',
  'about',
  '404',
];

const URLS: Record<PageId, string> = {
  home: 'netscope://home',
  rugscan: 'rugscan.example/token',
  coin: `coin.example/${TOKEN.symbol.replace('$', '').toLowerCase()}`,
  board: 'board.example/detectives',
  news: 'news.example/latest',
  help: 'netscope://help',
  about: 'netscope://about',
  badges: 'board.example/badges',
  '404': 'nowhere.example/lost',
};

/** Helpers a page uses to lay out its content top to bottom. */
class PageCtx {
  y = 0;
  constructor(
    readonly scene: Phaser.Scene,
    readonly content: Phaser.GameObjects.Container,
    readonly width: number,
    readonly panel: BrowserPanel,
  ) {}

  heading(text: string, color: PaletteKey = 'shadow'): void {
    this.content.add(makeText(this.scene, 0, this.y, text, { size: FONT.size.body, color }));
    this.y += BROWSER.lineH + 3;
  }

  line(text: string, opts: TextOpts = {}): void {
    const cw = charWidth(this.scene, 'body', FONT.size.body);
    const lines = wrapMono(text, Math.floor(this.width / cw));
    for (const l of lines) {
      this.content.add(
        makeText(this.scene, 0, this.y, l, {
          font: 'body',
          size: FONT.size.body,
          color: 'shadow',
          ...opts,
        }),
      );
      this.y += BROWSER.lineH;
    }
  }

  small(text: string, color: PaletteKey = 'woodMid'): void {
    this.content.add(makeText(this.scene, 0, this.y, text, { size: FONT.size.tiny, color }));
    this.y += 10;
  }

  gap(n = 6): void {
    this.y += n;
  }

  button(
    label: string,
    onClick: () => void,
    opts: { x?: number; variant?: 'paper' | 'ink'; sameLine?: boolean } = {},
  ): PixelButton {
    const b = new PixelButton(this.scene, opts.x ?? 0, this.y, label, onClick, {
      variant: opts.variant ?? 'ink',
    });
    this.scene.children.remove(b);
    this.content.add(b);
    if (!opts.sameLine) this.y += b.bh + 6;
    return b;
  }

  rule(): void {
    this.content.add(rect(this.scene, 0, this.y + 2, this.width, 1, HEX.paperShadow));
    this.y += 7;
  }
}

/**
 * NetScope: the in-game browser that lives on the phone. Pages are small
 * functions that draw into a scrollable content area.
 */
export class BrowserPanel extends Phaser.GameObjects.Container {
  private content!: Phaser.GameObjects.Container;
  private urlText!: Phaser.GameObjects.Text;
  private page: PageId = 'home';
  private history: PageId[] = [];
  private scrollY = 0;
  private contentHeight = 0;
  private viewH: number;
  private unsubscribeWallet?: () => void;
  private escBinding?: { key: Phaser.Input.Keyboard.Key; fn: () => void };
  private detachScroll?: () => void;
  private static openPanel: BrowserPanel | null = null;
  /** What the RugScan page shows: the current case, the token index, or a chosen token. */
  rugscanView: 'auto' | 'index' | CaseData = 'auto';

  static get current(): BrowserPanel | null {
    return BrowserPanel.openPanel;
  }

  static toggle(scene: Phaser.Scene, page: PageId = 'home'): void {
    if (BrowserPanel.openPanel?.scene === scene) {
      BrowserPanel.openPanel.close();
      return;
    }
    BrowserPanel.openPanel = new BrowserPanel(scene, page);
  }

  constructor(scene: Phaser.Scene, page: PageId = 'home') {
    super(scene, 0, 0);
    const { x, y, w, h, titleH, toolbarH, padding } = BROWSER;
    this.viewH = h - titleH - toolbarH - padding * 2;

    // Dim everything behind and eat clicks.
    const dim = rect(scene, 0, 0, GAME_WIDTH, GAME_HEIGHT, HEX.bg, 0.55);
    dim.setInteractive({ useHandCursor: false });
    dim.on('pointerdown', () => this.close());
    this.add(dim);

    // Window chrome.
    this.add(rect(scene, x + 4, y + 5, w, h, HEX.bg, 0.6));
    this.add(rect(scene, x - 2, y - 2, w + 4, h + 4, HEX.woodDark));
    const body = rect(scene, x, y, w, h, HEX.paper);
    body.setInteractive({ useHandCursor: false });
    this.add(body);
    this.add(rect(scene, x, y, w, titleH, HEX.shadow));
    this.add(
      makeText(scene, x + 6, y + 2, 'NetScope 2.0', { size: FONT.size.small, color: 'paper' }),
    );
    for (let i = 0; i < 3; i++)
      this.add(
        rect(scene, x + w - 34 + i * 10, y + 4, 6, 6, i === 2 ? HEX.stampRed : HEX.paperShadow),
      );
    const close = scene.add
      .zone(x + w - 16, y, 16, titleH)
      .setOrigin(0)
      .setInteractive({ useHandCursor: false });
    close.on('pointerdown', () => this.close());
    this.add(close);

    // Toolbar: back, home, bookmarks, url.
    const ty = y + titleH + 2;
    this.add(rect(scene, x, y + titleH, w, toolbarH, HEX.paperShadow));
    const tb = (label: string, bx: number, fn: () => void) => {
      const b = new PixelButton(scene, bx, ty, label, fn, { variant: 'paper' });
      scene.children.remove(b);
      this.add(b);
      return b;
    };
    tb('<', x + 4, () => this.back());
    let bx = x + 30;
    const marks: [string, PageId][] = [
      ['Home', 'home'],
      ['RugScan', 'rugscan'],
      [TOKEN.symbol, 'coin'],
      ['Board', 'board'],
      ['News', 'news'],
      ['Badges', 'badges'],
      ['Help', 'help'],
    ];
    for (const [label, id] of marks) {
      const b = tb(label, bx, () => this.go(id));
      bx += b.bw + 3;
    }
    // URL lives in the title bar so the bookmarks have the toolbar to themselves.
    this.urlText = makeText(scene, x + w - 44, y + 3, '', {
      size: FONT.size.tiny,
      color: 'paperShadow',
    }).setOrigin(1, 0);
    this.add(this.urlText);

    // Content viewport with a mask for scrolling.
    this.content = scene.add.container(x + padding, y + titleH + toolbarH + padding);
    this.add(this.content);
    const maskGfx = scene.make.graphics({ x: 0, y: 0 }, false);
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(x, y + titleH + toolbarH, w, h - titleH - toolbarH);
    this.content.setMask(new Phaser.Display.Masks.GeometryMask(scene, maskGfx));

    this.setDepth(DEPTH.overlay);
    scene.add.existing(this);
    pushOverlay();
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.releaseOverlay());
    scene.events.emit('browser:open');
    audio.play('click');

    this.detachScroll = attachScroll(scene, { step: 26, onScroll: (d) => this.scrollBy(d) });
    const kb = scene.input.keyboard;
    if (kb) {
      const key = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC, false);
      const fn = () => {
        markEscConsumed();
        this.close();
      };
      key.on('down', fn);
      this.escBinding = { key, fn };
    }
    this.unsubscribeWallet = wallet.onChange(() => this.page === 'coin' && this.render());

    if (!saveStore.get().settings.reducedMotion) {
      this.setScale(0.96).setAlpha(0);
      scene.tweens.add({ targets: this, scale: 1, alpha: 1, duration: 140, ease: 'Quad.easeOut' });
    }
    lucienSays(scene, 'browser');
    this.go(page, false);
  }

  private scrollBy(delta: number): void {
    const max = Math.max(0, this.contentHeight - this.viewH);
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, max);
    this.content.setY(
      BROWSER.y + BROWSER.titleH + BROWSER.toolbarH + BROWSER.padding - this.scrollY,
    );
  }

  go(page: PageId, pushHistory = true): void {
    if (pushHistory && page !== this.page) this.history.push(this.page);
    this.page = page;
    this.scrollY = 0;
    if (noteSeen('pagesSeen', page).length >= ALL_PAGES.length)
      awardBadge(this.scene, 'power-user');
    this.content.setY(BROWSER.y + BROWSER.titleH + BROWSER.toolbarH + BROWSER.padding);
    audio.play('hover');
    this.render();
  }

  back(): void {
    const prev = this.history.pop();
    if (prev) this.go(prev, false);
  }

  render(): void {
    if (!this.scene) return;
    this.content.removeAll(true);
    this.urlText.setText(
      URLS[this.page] +
        (this.page === 'rugscan' && gameState.currentCase
          ? `/${gameState.currentCase.ticker}`
          : ''),
    );
    const ctx = new PageCtx(this.scene, this.content, BROWSER.w - BROWSER.padding * 2, this);
    PAGES[this.page](ctx);
    this.contentHeight = ctx.y;
  }

  private overlayHeld = true;

  private releaseOverlay(): void {
    if (!this.overlayHeld) return;
    this.overlayHeld = false;
    popOverlay();
  }

  close(): void {
    if (!this.scene) return;
    const scene = this.scene;
    this.detachScroll?.();
    this.escBinding?.key.off('down', this.escBinding.fn);
    this.unsubscribeWallet?.();
    if (BrowserPanel.openPanel === this) BrowserPanel.openPanel = null;
    this.releaseOverlay();
    scene.events.emit('browser:close');
    audio.play('click');
    this.destroy();
  }
}

// ---- pages ------------------------------------------------------------------------

const PAGES: Record<PageId, (ctx: PageCtx) => void> = {
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
    ctx.button('The news', () => ctx.panel.go('news'));
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
      "The precinct's own coin. Holding it unlocks cosmetic gear in the office. It changes nothing about scoring, ever.",
    );
    ctx.gap();
    if (!TOKEN.mint) {
      ctx.line('Status: not launched yet. Check back after the case files are closed.', {
        color: 'stampRed',
      });
      ctx.gap();
    }
    ctx.rule();
    if (!s.connected) {
      ctx.line(
        s.available
          ? `${walletName()} detected.`
          : 'No Solana wallet detected in this browser (Phantom, Solflare, Backpack).',
        {
          color: s.available ? 'lampGreen' : 'woodMid',
        },
      );
      ctx.button(s.busy ? 'Connecting...' : `Connect ${walletName()}`, () => {
        lucienSays(ctx.scene, 'wallet');
        void wallet.connect();
      });
    } else {
      ctx.line(`Connected: ${shortAddress(s.address ?? '')}`, { color: 'lampGreen' });
      ctx.line(`SOL balance:   ${s.sol === null ? '...' : s.sol.toFixed(3)}`);
      ctx.line(
        `${TOKEN.symbol} balance: ${TOKEN.mint ? (s.token === null ? '...' : s.token.toLocaleString()) : 'n/a (no mint configured)'}`,
      );
      const holder = wallet.isHolder;
      ctx.line(
        `Holder perks:  ${holder ? 'unlocked' : `need ${TOKEN.holderMin.toLocaleString()}+ ${TOKEN.symbol}`}`,
        { color: holder ? 'lampGreen' : 'woodMid' },
      );
      ctx.small(
        'Perks: the aurora over the city on clear nights, a $ after your name on the board, the cosmetics below.',
      );
      // Remember the snapshot so the unlock survives reloads.
      saveStore.update(
        (d) =>
          (d.wallet = { address: s.address, token: s.token, checkedAt: new Date().toISOString() }),
      );
      if (holder) {
        awardBadge(ctx.scene, 'shareholder');
        lucienSays(ctx.scene, 'holder');
      }
      ctx.gap(4);
      ctx.line('Holder tiers:', { color: 'woodMid' });
      for (const u of UNLOCKABLES.filter((x) => x.source.type === 'holder')) {
        const need = u.source.type === 'holder' ? u.source.value : 0;
        const got = (s.token ?? 0) >= need;
        ctx.line(
          `${got ? '[x]' : '[ ]'} ${u.name.padEnd(16)} ${need.toLocaleString()}+ ${TOKEN.symbol}`,
          { color: got ? 'lampGreen' : 'shadow' },
        );
      }
      ctx.button('Refresh balances', () => void wallet.refresh(), { sameLine: true });
      ctx.button('Disconnect', () => void wallet.disconnect(), { x: 130, variant: 'paper' });
    }
    if (s.error) ctx.line(s.error, { color: 'stampRed' });
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
    const save = saveStore.get();
    ctx.heading('Hall of Detectives', 'ink');
    ctx.line(
      `You: ${save.detectiveName}  ·  ${rankForScore(save.totalScore)}  ·  ${save.totalScore} pts total`,
      { color: 'woodDark' },
    );
    ctx.button(
      'Change name',
      () => ctx.panel.scene && new NamePicker(ctx.scene, () => ctx.panel.render()),
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
          badgeNames: save.badges
            .map((id) => BADGE_BY_ID[id]?.name)
            .filter((n): n is string => !!n)
            .slice(0, 4),
          url: `${location.host}${location.pathname}`.replace(/\/$/, ''),
          mascot,
        });
        const ok = downloadCanvas(
          canvas,
          `rug-or-not-detective-${save.detectiveName.toLowerCase()}.png`,
        );
        audio.play(ok ? 'stamp' : 'wrong');
        toast(
          ctx.scene,
          ok ? 'CARD SAVED' : 'NO LUCK',
          ok ? 'your detective ID' : 'this browser blocks downloads',
        );
      },
      { x: 110, variant: 'paper' },
    );
    // Daily strip: the last two weeks, filled squares are days played.
    const today = localDateKey();
    const strip = playedStrip(save.daily, today, 14);
    ctx.line(
      `Daily streak: ${currentStreak(save.daily, today)}  ·  best ${save.daily.bestStreak}`,
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
    ctx.rule();
    ctx.line(`Best runs (${leaderboard.kind === 'remote' ? 'precinct server' : 'this device'}):`, {
      color: 'woodMid',
    });
    const placeholder = makeText(ctx.scene, 0, ctx.y, 'loading...', {
      font: 'body',
      size: FONT.size.body,
      color: 'paperShadow',
    });
    ctx.content.add(placeholder);
    const startY = ctx.y;
    void leaderboard.list(10).then((entries: ScoreEntry[]) => {
      if (!placeholder.active) return;
      placeholder.destroy();
      let y = startY;
      if (entries.length === 0) {
        ctx.content.add(
          makeText(ctx.scene, 0, y, 'No runs yet. Close a case and come back.', {
            font: 'body',
            size: FONT.size.body,
            color: 'paperShadow',
          }),
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
    ctx.y += BROWSER.lineH * 11;
    ctx.rule();
    ctx.line(
      `Red Flag Rush: best ${st.rushBest}  ·  longest streak ${st.rushBestStreak}  ·  ${st.rushRuns} runs`,
      { color: 'woodMid' },
    );
    const rushY = ctx.y;
    void leaderboard.list(5, 'rush').then((entries: ScoreEntry[]) => {
      if (!ctx.content.active) return;
      if (entries.length === 0) {
        ctx.content.add(
          makeText(ctx.scene, 0, rushY, 'No rush runs yet. Sixty seconds, one page at a time.', {
            font: 'body',
            size: FONT.size.body,
            color: 'paperShadow',
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
    ctx.y += BROWSER.lineH * 5;
    ctx.rule();
    ctx.line(
      `Cold cases: ${st.coldRuns} closed  ·  ${st.coldCorrect} called right  ·  best ${st.coldBest}`,
      { color: 'woodMid' },
    );
    const coldY = ctx.y;
    void leaderboard.list(5, 'cold').then((entries: ScoreEntry[]) => {
      if (!ctx.content.active) return;
      if (entries.length === 0) {
        ctx.content.add(
          makeText(ctx.scene, 0, coldY, 'No cold cases yet. The pile never ends.', {
            font: 'body',
            size: FONT.size.body,
            color: 'paperShadow',
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
    ctx.y += BROWSER.lineH * 5;
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

  help(ctx) {
    ctx.heading('Help', 'ink');
    ctx.line('Hover evidence with the lens. Fine print only shows through it.');
    ctx.line('Click a suspicious line to pin it. Click again to unpin.');
    ctx.line('Stamp RUG (R) or LEGIT (L). Herring pins cost points.');
    ctx.line('Tab / arrows cycle clue spots, Enter pins, 1-6 switch tabs, wheel scrolls.');
    ctx.line('Esc pauses. F toggles fullscreen.');
    ctx.line(
      'Red Flag Rush: sixty seconds, one page at a time. Click the red flag to clear the page; herrings and blank paper cost seconds.',
    );
    ctx.line(
      'Cold cases: files the printer makes up on the spot, endless. Same rules, their own board; the seed in the share link brings the same file back.',
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
    ctx.button('Source on GitHub (opens a new tab)', () => {
      window.open('https://github.com/elooouan/rug-or-not', '_blank', 'noopener');
    });
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
class NamePicker extends Phaser.GameObjects.Container {
  private static readonly CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_';
  private slots: number[];
  private letters: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, onDone: () => void) {
    super(scene, 0, 0);
    const current = saveStore.get().detectiveName.toUpperCase().padEnd(6, '_').slice(0, 6);
    this.slots = [...current].map((ch) => Math.max(0, NamePicker.CHARS.indexOf(ch)));
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
    const ok = new PixelButton(
      scene,
      x + w / 2 - 24,
      y + h - 20,
      'OK',
      () => {
        const name =
          this.slots
            .map((s) => NamePicker.CHARS[s])
            .join('')
            .replace(/_+$/, '') || 'ANON';
        saveStore.update((d) => (d.detectiveName = name));
        audio.play('correct');
        this.destroy();
        onDone();
      },
      { width: 48 },
    );
    scene.children.remove(ok);
    this.add(ok);
    this.refresh();
    this.setDepth(DEPTH.toast);
    scene.add.existing(this);
  }

  private bump(i: number, d: number): void {
    const n = NamePicker.CHARS.length;
    this.slots[i] = (this.slots[i] + d + n) % n;
    audio.play('tick');
    this.refresh();
  }

  private refresh(): void {
    this.letters.forEach((t, i) => t.setText(NamePicker.CHARS[this.slots[i]]));
  }
}
