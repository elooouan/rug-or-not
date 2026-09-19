import Phaser from 'phaser';
import { DEPTH } from '@/config/depth';
import { RUSH } from '@/config/gameConfig';
import { DESK, FONT, GAME_HEIGHT, GAME_WIDTH, NOTEBOOK, PAPER } from '@/config/layout';
import { HEX, PALETTE } from '@/config/palette';
import { HERRINGS, isFlagClue, type Clue } from '@/data/schema';
import { FLAG_IDS, FLAGS, isFlagId, type FlagId, type HerringId } from '@/data/flags';
import { audio } from '@/systems/audio';
import { awardBadge } from '@/systems/badges';
import { gameState } from '@/systems/gameState';
import { playableCases } from '@/systems/secretCase';
import { generateCase } from '@/systems/caseGen';
import { localDateKey } from '@/systems/dailyCase';
import { leaderboard } from '@/systems/leaderboard';
import {
  applyFlag,
  applyHerring,
  applyStray,
  freshRush,
  rushGrade,
  rushMultiplier,
  rushPages,
  shuffle,
  type RushPage,
  type RushState,
} from '@/systems/rush';
import { saveStore } from '@/systems/save';
import { holderPerks, wallet } from '@/systems/wallet';
import { DeskBackground, floatText } from '@/ui/DeskBackground';
import { DeskClock } from '@/ui/DeskClock';
import { lucienSays, type DialogueBox } from '@/ui/DialogueBox';
import type { DocumentView } from '@/ui/DocumentView';
import { createDocumentView } from '@/ui/documents';
import { escTaken } from '@/ui/escGuard';
import { LucienBubble } from '@/ui/LucienBubble';
import { toast } from '@/ui/Toast';
import { PixelButton } from '@/ui/PixelButton';
import { rect } from '@/ui/shapes';
import { SharePopover } from '@/ui/SharePopover';
import { addText, charWidth, makeText, wrapMono } from '@/ui/text';
import { backChip, goTo, setupScene } from './sceneUtil';
import { touchScreen } from '@/ui/lensLift';

type Phase = 'intro' | 'countdown' | 'playing' | 'over';

/**
 * Red Flag Rush: sixty seconds, one evidence page at a time. Click the red
 * flag to clear the page; herrings and blank paper cost seconds.
 */
export class RushScene extends Phaser.Scene {
  static readonly KEY = 'RushScene';
  private phase: Phase = 'intro';
  private state: RushState = freshRush();
  private deck: RushPage[] = [];
  private page?: RushPage;
  private doc?: DocumentView;
  private clock!: DeskClock;
  private dialogue: DialogueBox | null = null;
  private locked = false;
  /** When Esc was last pressed mid-run (a second press within a moment quits). */
  private escAt = -10000;
  /** The window lost focus mid-run: the clock waits until it comes back. */
  private held = false;
  private strayCount = 0;
  private lastTickSecond = -1;
  /** Herrings pinned this run (flags, on a hunt), for the debrief on the results card. */
  private herringsHit: string[] = [];
  private flagsHit: string[] = [];
  private hud!: {
    score: Phaser.GameObjects.Text;
    mult: Phaser.GameObjects.Text;
    streak: Phaser.GameObjects.Text;
    pages: Phaser.GameObjects.Text;
    best: Phaser.GameObjects.Text;
  };

  /** When set, this is a drill: five pages that all carry this red flag, no board. */
  private drill: FlagId | null = null;
  /** Or a hunt: five pages that all carry this yellow herring, and the herring is the target. */
  private hunt: HerringId | null = null;
  private drillPagesLeft = 0;

  /** Drills and hunts are practice: a fixed deck, a gentler clock, no board. */
  private get practice(): boolean {
    return this.drill !== null || this.hunt !== null;
  }

  /** What counts as a hit tonight: red flags, or the herrings on a hunt. */
  private isHit(clue: Clue): boolean {
    return this.hunt ? !isFlagClue(clue) : isFlagClue(clue);
  }

  constructor() {
    super(RushScene.KEY);
  }

  init(data: { drill?: FlagId; hunt?: HerringId } | undefined): void {
    this.drill = data?.drill && isFlagId(data.drill) ? data.drill : null;
    this.hunt = data?.hunt && data.hunt in HERRINGS ? data.hunt : null;
  }

  create(): void {
    setupScene(this);
    this.phase = 'intro';
    this.state = freshRush();
    this.locked = false;
    this.strayCount = 0;
    this.lastTickSecond = -1;
    this.herringsHit = [];
    this.flagsHit = [];
    this.doc = undefined;
    this.page = undefined;
    this.deck = this.drill
      ? this.drillDeck(this.drill)
      : this.hunt
        ? this.huntDeck(this.hunt)
        : shuffle(rushPages(this.rushCases()));
    this.drillPagesLeft = this.practice ? this.deck.length : 0;

    new DeskBackground(this, { props: true, stamps: false });
    addText(
      this,
      DESK.caseHeader.x,
      DESK.caseHeader.y,
      this.drill
        ? `DRILL  ·  ${FLAGS[this.drill].title}`
        : this.hunt
          ? `HERRING HUNT  ·  ${HERRINGS[this.hunt].title}`
          : 'RED FLAG RUSH  ·  one page at a time',
      { size: 10, color: 'paperShadow' },
    )
      .setOrigin(1, 0)
      .setDepth(DEPTH.hud);

    this.buildHud();
    this.clock = new DeskClock(this);
    this.clock.setDepth(DEPTH.deskProps);
    this.clock.start(this.practice ? RUSH.drillTimeSec : RUSH.timeSec);
    this.clock.pause(true);

    addText(
      this,
      GAME_WIDTH - 96,
      GAME_HEIGHT - 12,
      `${touchScreen() ? 'tap' : 'click'} the ${this.hunt ? 'yellow herring  ·  red flag' : 'red flag  ·  herring'}: -5s  ·  blank paper: -2s${touchScreen() ? '' : '  ·  Tab/Enter works too'}`,
      { size: 10, color: 'paperShadow' },
    )
      .setOrigin(1, 0)
      .setDepth(DEPTH.hud);
    const quit = new PixelButton(
      this,
      0,
      GAME_HEIGHT - 22,
      'Quit [Esc]',
      () => this.askThenQuit('press again to leave'),
      { variant: 'ink' },
    );
    quit.setDepth(DEPTH.hud).setX(GAME_WIDTH - quit.bw - 6);
    backChip(this, () => this.askThenQuit('press again to leave'), 'quit');

    this.bindKeys();
    audio.setTension(false);
    audio.setTempo(audio.baseTempo + RUSH.musicBpmBoost);
    // Alt-tabbing mid-run holds the clock; it picks up again when the window is back.
    const onBlur = () => {
      if (this.phase !== 'playing' || this.held) return;
      this.held = true;
      this.clock.pause(true);
      LucienBubble.say(this, "I'll hold the clock. It runs again when you're back.", 3000);
    };
    const onFocus = () => {
      if (!this.held) return;
      this.held = false;
      if (this.phase === 'playing') this.clock.pause(false);
    };
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    this.game.events.on(Phaser.Core.Events.FOCUS, onFocus);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, onBlur);
      this.game.events.off(Phaser.Core.Events.FOCUS, onFocus);
      audio.setTension(false);
      audio.setTempo();
    });

    // Lucien explains the rules once, then a short countdown. Drills skip the talk.
    if (this.drill) {
      LucienBubble.say(
        this,
        `Five pages. Every one hides "${FLAGS[this.drill].title}". Find it.`,
        4000,
      );
      this.countdown();
      return;
    }
    if (this.hunt) {
      LucienBubble.say(
        this,
        `Five pages. Every one has "${HERRINGS[this.hunt].title}": looks bad, is fine. Click the thing that is fine.`,
        4500,
      );
      this.countdown();
      return;
    }
    this.dialogue = lucienSays(this, 'first-rush', {
      onDone: () => {
        this.dialogue = null;
        this.countdown();
      },
    });
    if (!this.dialogue) this.countdown();
  }

  /** Five generated pages that each carry the drilled flag. */
  private drillDeck(flag: FlagId): RushPage[] {
    const pages: RushPage[] = [];
    for (let i = 0; pages.length < RUSH.drillPages && i < 12; i++) {
      const c = generateCase(`drill-${flag}-${Date.now().toString(36)}-${i}`, {
        forceFlags: [flag],
        difficulty: 1 + (i % 3),
      });
      const doc = c.documents.find((d) =>
        d.clues.some((cl) => isFlagClue(cl) && cl.flagId === flag),
      );
      if (doc) pages.push({ caseId: c.id, doc });
    }
    return pages;
  }

  /** Five generated pages that each carry the hunted herring (rugs among them keep it honest). */
  private huntDeck(herring: HerringId): RushPage[] {
    const pages: RushPage[] = [];
    for (let i = 0; pages.length < RUSH.drillPages && i < 14; i++) {
      const c = generateCase(`hunt-${herring}-${Date.now().toString(36)}-${i}`, {
        forceHerrings: [herring],
        difficulty: 1 + (i % 3),
      });
      const doc = c.documents.find((d) =>
        d.clues.some((cl) => !isFlagClue(cl) && cl.herringId === herring),
      );
      if (doc) pages.push({ caseId: c.id, doc });
    }
    return pages;
  }

  // ---- HUD -----------------------------------------------------------------

  /** The handcrafted files plus a few generated ones, so the pages change day to day. */
  private rushCases() {
    const day = localDateKey();
    const generated = Array.from({ length: 4 }, (_, i) =>
      generateCase(`rush-${day}-${i}`, { verdict: 'rug', difficulty: 1 + (i % 3) }),
    );
    return [...playableCases(saveStore.get(), gameState.cases), ...generated];
  }

  private buildHud(): void {
    const { x, y, w, h, padding } = NOTEBOOK;
    const c = this.add.container(x, y).setDepth(DEPTH.notebook);
    c.add(rect(this, 3, 4, w, h, HEX.bg, 0.5));
    c.add(rect(this, -4, -3, w + 8, h + 6, HEX.woodDark));
    c.add(rect(this, 0, 0, w, h, HEX.paper));
    for (let rx = 10; rx < w - 6; rx += 12) c.add(rect(this, rx, -6, 3, 8, HEX.paperShadow));
    c.add(rect(this, padding + 8, 4, 1, h - 8, HEX.stampRed, 0.35));
    c.add(
      makeText(this, padding, padding - 2, this.drill ? 'DRILL' : this.hunt ? 'HUNT' : 'RUSH', {
        size: FONT.size.small,
        color: 'woodDark',
      }),
    );
    const score = makeText(this, w / 2, padding + 14, '0', {
      size: FONT.size.title,
      color: 'shadow',
    }).setOrigin(0.5, 0);
    const mult = makeText(this, w / 2, padding + 52, 'x1.0', {
      size: FONT.size.bodyLarge,
      color: 'woodMid',
    }).setOrigin(0.5, 0);
    const mk = (row: number, text: string) =>
      makeText(this, padding + 12, padding + 84 + row * 14, text, {
        font: 'body',
        size: FONT.size.body,
        color: 'shadow',
      });
    const streak = mk(0, 'streak  0');
    const pages = mk(1, 'pages   0');
    const best = mk(
      2,
      this.practice
        ? `pages   ${RUSH.drillPages} to go`
        : `best    ${saveStore.get().stats.rushBest}`,
    );
    c.add([score, mult, streak, pages, best]);
    c.add(
      makeText(this, padding, h - padding - 6, 'hits buy 3s', {
        size: FONT.size.tiny,
        color: 'woodMid',
      }),
    );
    this.hud = { score, mult, streak, pages, best };
  }

  private refreshHud(): void {
    const s = this.state;
    if (this.hud.score.text !== String(s.score) && !saveStore.get().settings.reducedMotion) {
      // The score pops when it changes; origin is centred so it grows in place.
      this.hud.score.setScale(1.3);
      this.tweens.add({ targets: this.hud.score, scale: 1, duration: 160, ease: 'Back.easeOut' });
    }
    this.hud.score.setText(String(s.score));
    const m = rushMultiplier(s.streak);
    this.hud.mult.setText(`x${m.toFixed(2).replace(/0$/, '')}`);
    this.hud.mult.setColor(
      m >= RUSH.maxMultiplier ? PALETTE.stampRed : m > 1 ? PALETTE.amber : PALETTE.woodMid,
    );
    this.hud.streak.setText(`streak  ${s.streak}`);
    this.hud.pages.setText(`pages   ${s.rounds}`);
    if (this.practice)
      this.hud.best.setText(`pages   ${Math.max(0, this.drillPagesLeft - s.rounds)} to go`);
  }

  // ---- flow ----------------------------------------------------------------

  private countdown(): void {
    if (this.phase !== 'intro') return;
    this.phase = 'countdown';
    const steps = ['3', '2', '1', 'GO'];
    const reduced = saveStore.get().settings.reducedMotion;
    steps.forEach((label, i) => {
      this.time.delayedCall(i * 450, () => {
        if (this.phase !== 'countdown') return;
        audio.play(label === 'GO' ? 'correct' : 'tick');
        const t = addText(this, PAPER.x + PAPER.w / 2, PAPER.y + PAPER.h / 2, label, {
          size: FONT.size.title,
          color: label === 'GO' ? 'amber' : 'paper',
        })
          .setOrigin(0.5)
          .setDepth(DEPTH.toast);
        if (reduced) this.time.delayedCall(400, () => t.destroy());
        else
          this.tweens.add({
            targets: t,
            scale: 1.6,
            alpha: 0,
            duration: 420,
            ease: 'Quad.easeOut',
            onComplete: () => t.destroy(),
          });
        if (label === 'GO') this.start();
      });
    });
  }

  private start(): void {
    this.phase = 'playing';
    this.clock.pause(false);
    this.dealPage();
  }

  private dealPage(): void {
    if (this.practice && this.deck.length === 0) {
      this.end();
      return;
    }
    if (this.deck.length === 0) this.deck = shuffle(rushPages(this.rushCases()));
    // Never deal the same page twice in a row when there's a choice.
    let next = this.deck.pop() as RushPage;
    if (this.page && next.doc === this.page.doc && this.deck.length > 0) {
      const swap = this.deck.pop() as RushPage;
      this.deck.push(next);
      next = swap;
    }
    this.page = next;
    const ctx = {
      // Fine print inline: there's no time for the lens tonight.
      noMagnifier: true,
      registerFinePrint: () => {},
      onPinToggle: (clue: Clue, pinned: boolean) => this.onPin(clue, pinned),
      onStrayChange: (count: number) => this.onStray(count),
      onHoverSpot: () => {},
    };
    const doc = createDocumentView(this, next.doc, ctx).setDepth(DEPTH.documents);
    // Make sure a target is on the page without scrolling.
    let guard = 0;
    while (!doc.visibleSpots().some((s) => this.isHit(s.clue)) && doc.scroll(1) && guard++ < 20);
    this.doc = doc;
    this.strayCount = 0;
    this.locked = false;
    audio.play('paper');
    if (!saveStore.get().settings.reducedMotion) {
      doc.setX(PAPER.x + 40).setAlpha(0);
      this.tweens.add({ targets: doc, x: PAPER.x, alpha: 1, duration: 150, ease: 'Quad.easeOut' });
    }
  }

  private onPin(clue: Clue, pinned: boolean): void {
    if (this.phase !== 'playing' || this.locked || this.held || !pinned || !this.doc) return;
    if (this.isHit(clue)) {
      this.locked = true;
      const next = applyFlag(this.state);
      this.state = next;
      this.clock.addTime(next.timeDelta);
      this.refreshHud();
      audio.play('correct');
      const m = rushMultiplier(next.streak - 1);
      floatText(
        this,
        PAPER.x + PAPER.w / 2,
        PAPER.y + 40,
        `+${next.gained}${m > 1 ? `  (x${m.toFixed(2).replace(/0$/, '')})` : ''}  +${RUSH.flagTimeBonus}s`,
        'amber',
      );
      // Name the tell as it goes by: the arcade is still a lesson.
      floatText(
        this,
        PAPER.x + PAPER.w / 2,
        PAPER.y + 58,
        isFlagClue(clue) ? FLAGS[clue.flagId].title : HERRINGS[clue.herringId].title,
        'stampGreen',
      );
      if (next.streak === 5)
        LucienBubble.say(this, 'Five in a row. Keep that pencil moving.', 2200);
      if (next.streak === 10) {
        awardBadge(this, 'hot-streak');
        LucienBubble.say(this, 'Ten. You could do this in your sleep.', 2200);
      }
      const old = this.doc;
      this.doc = undefined;
      const done = () => {
        old.destroy();
        if (this.phase === 'playing') this.dealPage();
      };
      if (saveStore.get().settings.reducedMotion) this.time.delayedCall(120, done);
      else
        this.tweens.add({
          targets: old,
          x: PAPER.x - 60,
          alpha: 0,
          duration: 180,
          delay: 140,
          ease: 'Quad.easeIn',
          onComplete: done,
        });
      return;
    }
    // The wrong kind of thing: the pin stays in as a reminder, the clock pays for it.
    // (A herring in the rush, a red flag on a hunt.)
    if (!isFlagClue(clue) && !this.herringsHit.includes(clue.herringId))
      this.herringsHit.push(clue.herringId);
    if (isFlagClue(clue) && !this.flagsHit.includes(clue.flagId)) this.flagsHit.push(clue.flagId);
    this.state = applyHerring(this.state);
    this.penalty(this.state.timeDelta, this.hunt ? 'red flag' : 'herring');
  }

  private onStray(count: number): void {
    if (this.phase !== 'playing' || this.locked || this.held) return;
    if (count <= this.strayCount) {
      this.strayCount = count;
      return;
    }
    this.strayCount = count;
    this.state = applyStray(this.state);
    this.penalty(this.state.timeDelta, 'blank paper');
  }

  private penalty(sec: number, why: string): void {
    this.clock.addTime(sec);
    this.refreshHud();
    audio.play('wrong');
    floatText(this, PAPER.x + PAPER.w / 2, PAPER.y + 40, `${sec}s  ${why}`, 'stampRed');
    if (!saveStore.get().settings.reducedMotion) this.cameras.main.shake(90, 0.003);
    if (this.clock.timeLeft === 0) this.end();
  }

  private end(): void {
    if (this.phase === 'over') return;
    this.phase = 'over';
    this.locked = true;
    audio.setTension(false);
    LucienBubble.dismiss();
    this.doc?.destroy();
    this.doc = undefined;
    const s = this.state;
    const grade = rushGrade(s.score);
    let improved = false;
    if (this.practice) {
      // Practice counts when every page was cleared; it never touches the board.
      const done = s.rounds >= this.drillPagesLeft;
      if (done)
        saveStore.update((d) => {
          if (this.drill && !d.stats.drilled.includes(this.drill)) d.stats.drilled.push(this.drill);
          if (this.hunt && !d.stats.hunted.includes(this.hunt)) d.stats.hunted.push(this.hunt);
        });
      if (saveStore.get().stats.drilled.length >= FLAG_IDS.length)
        awardBadge(this, 'drill-sergeant');
      if (saveStore.get().stats.hunted.length >= Object.keys(HERRINGS).length)
        awardBadge(this, 'herring-hunter');
      audio.play(done ? 'caseClosed' : 'stamp');
      this.showResults(grade, false, done);
      return;
    }
    saveStore.update((d) => {
      d.stats.rushRuns++;
      if (s.score > d.stats.rushBest) {
        d.stats.rushBest = s.score;
        improved = s.score > 0;
      }
      d.stats.rushBestStreak = Math.max(d.stats.rushBestStreak, s.bestStreak);
    });
    void leaderboard.submit({
      name: saveStore.get().detectiveName,
      score: s.score,
      caseId: 'rush',
      grade,
      date: new Date().toISOString(),
      wallet: wallet.state.address ?? undefined,
      mode: 'rush',
      holder: holderPerks() || undefined,
    });
    awardBadge(this, 'rush-hour');
    if (s.score >= 2000) awardBadge(this, 'speed-reader');
    this.hud.best.setText(`best    ${saveStore.get().stats.rushBest}`);
    audio.play('stamp');
    this.showResults(grade, improved);
  }

  private showResults(grade: string, improved: boolean, drillDone = false): void {
    const s = this.state;
    const lessons = (this.hunt ? this.flagsHit : this.herringsHit).slice(0, 2);
    const w = 270;
    const h = 170 + (lessons.length ? 18 + lessons.length * 36 : 0);
    const x = PAPER.x + (PAPER.w - w) / 2;
    const y = PAPER.y + (PAPER.h - h) / 2 - 10;
    const c = this.add.container(0, 0).setDepth(DEPTH.overlay);
    c.add(rect(this, x + 4, y + 5, w, h, HEX.bg, 0.6));
    c.add(rect(this, x, y, w, h, HEX.paper));
    c.add(rect(this, x + 3, y + 3, w - 6, h - 6).setStrokeStyle(1, HEX.paperShadow));
    c.add(
      makeText(
        this,
        x + w / 2,
        y + 10,
        drillDone ? (this.hunt ? 'HUNT DONE' : 'DRILL DONE') : "TIME'S UP",
        {
          size: FONT.size.heading,
          color: 'shadow',
        },
      ).setOrigin(0.5, 0),
    );
    c.add(
      makeText(this, x + w / 2, y + 36, String(s.score), {
        size: FONT.size.title,
        color: 'ink',
      }).setOrigin(0.5, 0),
    );
    const rows = [
      `pages cleared   ${s.rounds}`,
      `best streak     ${s.bestStreak}  ·  peak x${rushMultiplier(s.bestStreak).toFixed(2).replace(/0$/, '')}`,
      this.practice
        ? drillDone
          ? 'the notebook remembers this'
          : `clear all ${this.drillPagesLeft} pages to log the ${this.hunt ? 'hunt' : 'drill'}`
        : improved
          ? 'personal best!'
          : `personal best   ${saveStore.get().stats.rushBest}`,
    ];
    rows.forEach((r, i) =>
      c.add(
        makeText(this, x + 16, y + 78 + i * 13, r, {
          font: 'body',
          size: FONT.size.body,
          color: improved && i === 2 ? 'stampRed' : 'shadow',
        }),
      ),
    );
    // The herrings that cost you seconds and why they were fine; on a hunt, the red flags
    // mistaken for harmless and what they are.
    if (lessons.length) {
      const cw = charWidth(this, 'body', FONT.size.body);
      const maxChars = Math.floor((w - 32) / cw);
      c.add(
        makeText(
          this,
          x + 16,
          y + 120,
          this.hunt ? 'looked fine, was not:' : 'looked scary, was fine:',
          {
            size: FONT.size.tiny,
            color: 'woodMid',
          },
        ),
      );
      lessons.forEach((id, i) => {
        const hr = this.hunt ? FLAGS[id as FlagId] : HERRINGS[id as keyof typeof HERRINGS];
        if (!hr) return;
        const ly = y + 132 + i * 36;
        c.add(
          makeText(this, x + 16, ly, hr.title, {
            font: 'body',
            size: FONT.size.body,
            color: this.hunt ? 'stampRed' : 'stampGreen',
          }),
        );
        wrapMono('reassurance' in hr ? hr.reassurance : hr.explanation, maxChars)
          .slice(0, 2)
          .forEach((l, k) =>
            c.add(
              makeText(this, x + 16, ly + 11 + k * 11, l, {
                font: 'body',
                size: FONT.size.body,
                color: 'woodMid',
              }),
            ),
          );
      });
    }
    // Grade stamp in the corner (practice has no grade).
    if (!this.practice) {
      const mark = this.add.container(x + w - 34, y + 46).setAngle(-12);
      mark.add(rect(this, 0, 0, 30, 30).setStrokeStyle(2, HEX.stampRed).setOrigin(0.5));
      mark.add(
        makeText(this, 0, 0, grade, { size: FONT.size.heading, color: 'stampRed' }).setOrigin(0.5),
      );
      this.children.remove(mark);
      c.add(mark);
    }
    const bw = 66;
    const again = new PixelButton(
      this,
      x + 12,
      y + h - 42,
      'Again',
      () =>
        this.scene.restart(
          this.drill ? { drill: this.drill } : this.hunt ? { hunt: this.hunt } : {},
        ),
      { width: bw, hotkey: 'ENTER' },
    );
    const share = this.practice
      ? null
      : new PixelButton(
          this,
          x + 12 + bw + 6,
          y + h - 42,
          'Share',
          () =>
            SharePopover.toggle(this, x + 12 + bw + 6, y + h - 42, {
              lines: () => this.shareLines(),
            }),
          { width: bw },
        );
    const menu = new PixelButton(
      this,
      x + w - 12 - bw,
      y + h - 42,
      this.practice ? 'Notebook' : 'Menu',
      () => this.quit(),
      { width: bw, variant: 'ink' },
    );
    this.children.remove(again);
    if (share) this.children.remove(share);
    this.children.remove(menu);
    c.add(share ? [again, share, menu] : [again, menu]);
    c.add(
      makeText(this, x + w / 2, y + h - 10, touchScreen() ? '' : 'Enter: again  ·  Esc: menu', {
        size: FONT.size.tiny,
        color: 'woodMid',
      }).setOrigin(0.5, 1),
    );
    if (!saveStore.get().settings.reducedMotion) {
      c.setScale(0.9).setAlpha(0);
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' });
    }
    const line = this.hunt
      ? drillDone
        ? "That's what fine looks like. Now you won't pin it in a real file."
        : 'Not every page cleared. Looks bad is not the same as is bad. Once more.'
      : this.drill
        ? drillDone
          ? "That's the pattern. You'll see it before they finish the pitch."
          : 'Not every page cleared. Once more, slower.'
        : s.score === 0
          ? "Nothing on the board. The flags don't find themselves."
          : grade === 'S'
            ? 'That was a rush. Coffee is on me.'
            : s.bestStreak >= 5
              ? 'Good eye. The streak is where the points live.'
              : 'Not bad. Faster next time, and skip the herrings.';
    this.time.delayedCall(
      500,
      () => this.phase === 'over' && LucienBubble.say(this, line, 4000, 14),
    );
  }

  /** Mid-run, one press is a question and the second is the answer. */
  private askThenQuit(again: string): void {
    if (this.phase === 'playing' && this.time.now - this.escAt > 2500) {
      this.escAt = this.time.now;
      toast(this, 'QUIT THE RUN?', again);
      return;
    }
    this.quit();
  }

  private quit(): void {
    goTo(
      this,
      this.drill ? 'NotebookScene' : 'TitleScene',
      this.drill ? undefined : this.hunt ? { chapter: 'herrings', id: this.hunt } : undefined,
    );
  }

  /** Result text for the clipboard, with a fallback note. */
  private shareLines(): string[] {
    const s = this.state;
    return [
      `Rug or Not? Red Flag Rush: ${s.score} pts, ${s.rounds} pages, best streak ${s.bestStreak}, grade ${rushGrade(s.score)}`,
      `${location.origin}${location.pathname}#rush`,
      '#RugOrNot',
    ];
  }

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.addCapture(['TAB', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'PAGE_UP', 'PAGE_DOWN']);
    const on = (key: string, fn: () => void) => kb.on(`keydown-${key}`, fn);
    const inPlay = () => this.phase === 'playing' && !this.locked && !this.held && !!this.doc;
    // Mid-run, one Esc is a question and the second is the answer: a stray press
    // shouldn't throw away a good streak. Over or before the run, it just leaves.
    on('ESC', () => {
      if (this.dialogue?.isActive || escTaken()) return;
      this.askThenQuit('Esc again to leave');
    });
    on('TAB', (e?: KeyboardEvent) => inPlay() && this.doc?.focusMove(e?.shiftKey ? -1 : 1));
    on('DOWN', () => inPlay() && this.doc?.focusMove(1));
    on('RIGHT', () => inPlay() && this.doc?.focusMove(1));
    on('UP', () => inPlay() && this.doc?.focusMove(-1));
    on('LEFT', () => inPlay() && this.doc?.focusMove(-1));
    on('ENTER', () => inPlay() && this.doc?.activateFocused());
    on('SPACE', () => inPlay() && this.doc?.activateFocused());
    on('PAGE_DOWN', () => inPlay() && this.doc?.scroll(1));
    on('PAGE_UP', () => inPlay() && this.doc?.scroll(-1));
    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (!inPlay()) return;
      if (this.doc?.containsPoint(p.worldX, p.worldY)) this.doc.scroll(dy > 0 ? 1 : -1);
    });
  }

  override update(_t: number, delta: number): void {
    if (this.phase !== 'playing') return;
    this.clock.tick(delta);
    const left = this.clock.timeLeft;
    if (left <= 10 && left !== this.lastTickSecond) {
      this.lastTickSecond = left;
      audio.play('tick');
      audio.setTension(true);
    }
    if (!this.clock.isRunning && left === 0) this.end();
  }
}
