import Phaser from 'phaser';
import { DEPTH } from '@/config/depth';
import { DESK, GAME_HEIGHT, GAME_WIDTH, PAPER, STAMP } from '@/config/layout';
import { FLAGS, isFlagClue, type CaseData, type Clue } from '@/data/schema';
import { audio } from '@/systems/audio';
import { localDateKey, recordDailyPlay, weekKey } from '@/systems/dailyCase';
import { gameState } from '@/systems/gameState';
import { saveStore } from '@/systems/save';
import { scoreCase, type ScoreBreakdown, type Verdict } from '@/systems/scoring';
import { newlyUnlocked, stampInk } from '@/systems/unlocks';
import { rankForScore } from '@/systems/ranks';
import { rogueOf } from '@/systems/rogues';
import { TEX } from '@/art/keys';
import { HEX } from '@/config/palette';
import { DeskBackground } from '@/ui/DeskBackground';
import { lucienSays, type DialogueBox } from '@/ui/DialogueBox';
import { BrowserPanel } from '@/ui/BrowserPanel';
import { LucienBubble } from '@/ui/LucienBubble';
import { escTaken } from '@/ui/escGuard';
import { LUCIEN_FACE_TEX } from '@/ui/DialogueBox';
import { SCORING } from '@/config/gameConfig';
import { FONT } from '@/config/layout';
import { leaderboard } from '@/systems/leaderboard';
import { holderPerks, wallet } from '@/systems/wallet';
import { awardBadge, bumpStat, checkAggregateBadges } from '@/systems/badges';
import { FLAG_IDS } from '@/data/flags';
import { DOC_TIPS } from '@/data/dialogue';
import { claimHint, hintSeen } from '@/systems/hints';
import { DeskClock } from '@/ui/DeskClock';
import type { DocumentView } from '@/ui/DocumentView';
import { createDocumentView } from '@/ui/documents';
import { FolderCard } from '@/ui/FolderCard';
import { Magnifier } from '@/ui/Magnifier';
import { NotebookPanel, type SuspicionEntry } from '@/ui/NotebookPanel';
import { PauseMenu } from '@/ui/PauseMenu';
import { Stamp, StampMark } from '@/ui/Stamp';
import { TabBar } from '@/ui/TabBar';
import { addText } from '@/ui/text';
import { PixelButton } from '@/ui/PixelButton';
import { floatText } from '@/ui/DeskBackground';
import { setupScene } from './sceneUtil';
import type { PaletteKey } from '@/config/palette';

type Phase = 'intake' | 'opening' | 'investigating' | 'stamped';

export interface ReportPayload {
  caseData: CaseData;
  verdict: Verdict;
  breakdown: ScoreBreakdown;
  newFlagIds: string[];
  newUnlockNames: string[];
  bestImproved: boolean;
  newBadges: string[];
  /** Anything else worth a toast on the report: [title, line]. */
  notes: [string, string][];
  /** Set when this run crossed a rank threshold. */
  rankUp: string | null;
  /** The rogue who just got a WANTED poster (first correct RUG verdict on this case). */
  caughtName: string | null;
  /** Seconds spent on the file, or null in relaxed mode. */
  elapsedSec: number | null;
}

/** The main desk: read evidence through the lens, pin clues, stamp a verdict. */
export class InvestigationScene extends Phaser.Scene {
  static readonly KEY = 'InvestigationScene';
  private caseData!: CaseData;
  private desk!: DeskBackground;
  private magnifier!: Magnifier;
  private docs: DocumentView[] = [];
  private current = 0;
  private tabs?: TabBar;
  private notebook?: NotebookPanel;
  private clock?: DeskClock;
  private stamps: Stamp[] = [];
  private phase: Phase = 'intake';
  private paused = false;
  private pauseMenu?: PauseMenu;
  private suspicions: SuspicionEntry[] = [];
  private hoveringSpot = 0;
  private examined = new Set<string>();
  private totalSpots = 0;
  private lastTickSecond = -1;
  private hint?: Phaser.GameObjects.Text;
  private dialogue: DialogueBox | null = null;
  private tabSwitched = false;
  private browsing = false;
  private said = new Set<string>();
  private hintsUsed = 0;
  private askLabel?: Phaser.GameObjects.Text;

  constructor() {
    super(InvestigationScene.KEY);
  }

  create(): void {
    setupScene(this);
    const c = gameState.currentCase;
    if (!c) {
      this.scene.start('TitleScene');
      return;
    }
    this.caseData = c;
    this.phase = 'intake';
    this.paused = false;
    this.docs = [];
    this.stamps = [];
    this.suspicions = [];
    this.current = 0;
    this.hoveringSpot = 0;
    this.examined = new Set();
    this.lastTickSecond = -1;

    this.desk = new DeskBackground(this, { props: true, stamps: true });
    this.magnifier = new Magnifier(
      this,
      (x, y) =>
        this.phase === 'investigating' &&
        !this.paused &&
        !this.browsing &&
        this.currentDoc()?.containsPoint(x, y) === true,
    );
    this.magnifier.ignore(this.desk.overlays);

    // Case header on the corkboard edge / top of screen.
    const header = addText(
      this,
      DESK.caseHeader.x,
      DESK.caseHeader.y,
      `${c.ticker}  ·  ${c.title}`,
      {
        size: 10,
        color: 'paperShadow',
      },
    )
      .setOrigin(1, 0)
      .setDepth(DEPTH.hud);
    this.magnifier.ignore(header);

    new FolderCard(this, c, () => this.openCase());
    this.bindKeys();
    this.tabSwitched = false;
    this.browsing = false;
    this.said = new Set();
    this.hintsUsed = 0;
    audio.setTension(false);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      audio.setTension(false);
      // Hands the pointer back to the cursor overlay; otherwise a lens left active on the
      // paper follows the mouse into the report.
      this.magnifier.destroy();
    });
    // Scene emitters survive restarts; drop last run's handlers before adding ours.
    this.events.off('browser:open');
    this.events.off('browser:close');
    this.events.off(Phaser.Scenes.Events.RESUME);
    this.events.on('browser:open', () => {
      this.browsing = true;
      this.clock?.pause(true);
      this.magnifier.suspend();
      if (BrowserPanel.current) this.magnifier.ignore(BrowserPanel.current);
    });
    this.events.on('browser:close', () => {
      this.browsing = false;
      if (!this.paused && this.phase === 'investigating') this.clock?.pause(false);
    });
    this.introDialogue();
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.onResume());
  }

  /** Lucien's once-only guidance: daily explainer, then the intake hint. */
  private introDialogue(): void {
    const c = this.caseData;
    const intake = () =>
      this.setDialogue(
        lucienSays(this, 'first-intake', {
          conditions: { opened: () => this.phase === 'investigating' },
          onDone: () => {
            this.dialogue = null;
            if (this.phase === 'investigating') this.tutorial();
          },
        }),
      );
    if (gameState.mode === 'daily') {
      this.setDialogue(lucienSays(this, 'first-daily', { onDone: () => intake() }));
      if (this.dialogue) return;
    }
    intake();
    // Lucien's take on the file, every time, unless he's already mid-lesson.
    if (c.intro && !this.dialogue?.isActive)
      this.time.delayedCall(
        700,
        () => this.phase === 'intake' && LucienBubble.say(this, c.intro as string, 6000),
      );
  }

  /** The lens must not zoom the dialogue box. */
  private setDialogue(box: DialogueBox | null): DialogueBox | null {
    this.dialogue = box;
    if (box) this.magnifier.ignore(box);
    return box;
  }

  private tutorial(): void {
    if (this.dialogue?.isActive) return; // the intake box chains into this via onDone
    this.setDialogue(
      lucienSays(this, 'first-investigation', {
        conditions: {
          examined: () => this.examined.size > 0,
          pinned: () => this.docs.some((d) => d.pinnedIds().length > 0),
          tab: () => this.tabSwitched,
        },
        onDone: () => (this.dialogue = null),
      }),
    );
  }

  private openCase(): void {
    if (this.phase !== 'intake') return;
    this.phase = 'opening';
    const folder = this.children.list.find((o) => o instanceof FolderCard) as
      FolderCard | undefined;
    const go = () => this.startInvestigation();
    if (folder) folder.dismiss(go);
    else go();
  }

  private startInvestigation(): void {
    const c = this.caseData;
    const s = saveStore.get().settings;
    this.phase = 'investigating';

    const ctx = {
      noMagnifier: s.noMagnifier,
      registerFinePrint: (obj: Phaser.GameObjects.GameObject) =>
        this.magnifier.registerFinePrint(obj),
      onPinToggle: (clue: Clue, pinned: boolean) => this.onPinToggle(clue, pinned),
      onStrayChange: (count: number) => {
        this.refreshNotebook();
        if (count > 0) this.mutter('stray', "That's blank paper, partner. Pins go on evidence.");
        if (count >= 3) this.mutter('stray-3', "You're pinning the paper, not the case.");
      },
      onHoverSpot: (over: boolean, clueId: string) => {
        this.hoveringSpot = Math.max(0, this.hoveringSpot + (over ? 1 : -1));
        this.magnifier.setGlow(this.hoveringSpot > 0);
        if (over && !this.examined.has(clueId)) {
          this.examined.add(clueId);
          if (!s.hardMode) this.notebook?.setExamined(this.examined.size, this.totalSpots);
          if (this.examined.size === this.totalSpots) {
            audio.play('unlock');
            this.mutter('thorough', 'Every spot examined. Thorough. Now decide.');
          }
        }
      },
    };
    this.docs = c.documents.map((d) =>
      createDocumentView(this, d, ctx).setDepth(DEPTH.documents).setVisible(false),
    );
    this.tabs = new TabBar(this, c.documents, (i) => this.showDocument(i));
    this.tabs.setDepth(DEPTH.documents - 1);
    this.showDocument(0, false);

    this.notebook = new NotebookPanel(this);
    this.notebook.onSelect = (id) => {
      if (this.phase !== 'investigating' || this.paused || this.browsing) return;
      const i = this.caseData.documents.findIndex((d) => d.clues.some((c) => c.id === id));
      if (i < 0) return;
      this.showDocument(i);
      this.docs[i]?.focusClue(id);
      audio.play('tick');
    };
    this.notebook.setDepth(DEPTH.notebook);
    this.totalSpots = c.documents.reduce((n, d) => n + d.clues.length, 0);
    if (s.hardMode) this.notebook.setExamined(-1, 0);
    else this.notebook.setExamined(0, this.totalSpots);
    this.refreshNotebook();

    this.clock = new DeskClock(this);
    this.clock.setDepth(DEPTH.deskProps);
    this.clock.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 30, 34),
      Phaser.Geom.Rectangle.Contains,
    );
    this.clock.on('pointerdown', () => {
      audio.play('tick');
      const relaxed = saveStore.get().settings.relaxed;
      const lines = relaxed
        ? ['time is a construct', 'no rush', 'take your time']
        : ['tick tock', 'no pressure', 'clocks cannot be bribed', 'it is later than you think'];
      floatText(
        this,
        DESK.clock.x + 15,
        DESK.clock.y - 4,
        lines[Phaser.Math.Between(0, lines.length - 1)],
      );
    });
    if (s.relaxed) this.clock.setRelaxed();
    else this.clock.start(c.timeLimitSec);

    const ink = stampInk(saveStore.get().cosmetics);
    const mk = (verdict: Verdict, x: number, y: number, inkKey: string) =>
      new Stamp(this, x, y, {
        verdict,
        ink: inkKey as PaletteKey,
        onStamp: (v) => this.onStamp(v),
        overPaper: (px, py) => StampMark.within(px, py),
      }).setDepth(DEPTH.stamps);
    this.stamps = [
      mk('rug', DESK.stampRug.x + 25, DESK.stampRug.y + 30, ink.rug),
      mk('legit', DESK.stampLegit.x + 25, DESK.stampLegit.y + 30, ink.legit),
    ];

    this.hint = addText(
      this,
      GAME_WIDTH - 96,
      GAME_HEIGHT - 12,
      'hover: lens  ·  click: pin  ·  R / L: stamp  ·  wheel: scroll',
      { size: 10, color: 'paperShadow' },
    )
      .setOrigin(1, 0)
      .setDepth(DEPTH.hud);
    const menu = new PixelButton(
      this,
      0,
      GAME_HEIGHT - 22,
      'Menu [Esc]',
      () => this.togglePause(),
      {
        variant: 'ink',
      },
    );
    menu.setDepth(DEPTH.hud).setX(GAME_WIDTH - menu.bw - 6);
    // Lucien's face in the corner: click to buy a nudge.
    const face = this.add
      .image(6, GAME_HEIGHT - 4, LUCIEN_FACE_TEX)
      .setOrigin(0, 1)
      .setDepth(DEPTH.hud);
    face.setDisplaySize(Math.round(face.width * (40 / face.height)), 40);
    face.setInteractive({ useHandCursor: false });
    face.on('pointerover', () => audio.play('hover'));
    face.on('pointerdown', () => this.askLucien());
    this.askLabel = addText(
      this,
      6 + face.displayWidth + 2,
      GAME_HEIGHT - 14,
      `ask (${SCORING.hintCost})`,
      {
        size: FONT.size.tiny,
        color: 'paperShadow',
      },
    ).setDepth(DEPTH.hud);
    this.magnifier.ignore([face, this.askLabel]);
    this.magnifier.ignore([this.hint, this.notebook, this.tabs, ...this.stamps, this.clock, menu]);
    audio.play('paper');
    this.tutorial();
  }

  private currentDoc(): DocumentView | undefined {
    return this.docs[this.current];
  }

  private showDocument(i: number, animate = true): void {
    if (i < 0 || i >= this.docs.length) return;
    const changed = i !== this.current;
    if (changed) this.tabSwitched = true;
    this.docs.forEach((d, idx) => d.setVisible(idx === i));
    this.docs[this.current]?.clearFocus();
    this.current = i;
    this.tabs?.setCurrent(i);
    this.hoveringSpot = 0;
    this.magnifier.setGlow(false);
    // First time a kind of document lands on the desk, a reading tip.
    const kind = this.caseData.documents[i]?.type;
    if (kind && !hintSeen(`tip-doc-${kind}`))
      this.time.delayedCall(animate ? 400 : 1600, () => {
        // Claimed only when it actually shows, so a tutorial box doesn't eat it.
        if (
          this.phase === 'investigating' &&
          !this.dialogue?.isActive &&
          !this.paused &&
          !this.browsing &&
          this.current === i &&
          claimHint(`tip-doc-${kind}`)
        )
          LucienBubble.say(this, DOC_TIPS[kind], 5000);
      });
    if (changed && animate) {
      audio.play('paper');
      const doc = this.docs[i];
      if (!saveStore.get().settings.reducedMotion) {
        // A quick page flip: the sheet lands from slightly above.
        doc.setY(PAPER.y - 6).setAlpha(0.6);
        this.tweens.add({
          targets: doc,
          y: PAPER.y,
          alpha: 1,
          duration: 140,
          ease: 'Quad.easeOut',
        });
      }
    }
  }

  /** A paid nudge: points at a document with spots you haven't examined. Never names a flag. */
  private askLucien(): void {
    if (this.phase !== 'investigating' || this.paused || this.browsing) return;
    if (saveStore.get().settings.hardMode) {
      LucienBubble.say(this, "Detective's honour. You're on your own tonight.");
      return;
    }
    if (this.hintsUsed >= SCORING.maxHints) {
      LucienBubble.say(this, "Three nudges is my limit. Detective's honour.");
      return;
    }
    const unexaminedIn = (i: number) =>
      this.caseData.documents[i].clues.filter((cl) => !this.examined.has(cl.id)).length;
    let text: string;
    if (unexaminedIn(this.current) > 0)
      text = "There's something on this very page you haven't looked at closely.";
    else {
      const other = this.caseData.documents.map((_, i) => i).find((i) => unexaminedIn(i) > 0);
      if (other !== undefined)
        text = `Have a closer look at the "${this.caseData.documents[other].title}" tab.`;
      else
        text =
          "You've seen every spot. Now it's judgment: pin what you can explain, drop what you can't.";
    }
    this.hintsUsed++;
    audio.play('wrong');
    this.askLabel?.setText(`ask (${SCORING.hintCost})  used ${this.hintsUsed}/${SCORING.maxHints}`);
    LucienBubble.say(this, text, 4500);
  }

  /** A one-time quip per case, shown in Lucien's corner bubble. */
  private mutter(key: string, text: string): void {
    if (this.said.has(key) || this.dialogue?.isActive || this.paused) return;
    this.said.add(key);
    LucienBubble.say(this, text);
  }

  private onPinToggle(clue: Clue, pinned: boolean): void {
    if (pinned) {
      this.suspicions.push({ id: clue.id, label: clue.label });
      // Neutral remarks keyed to counts only; nothing here says whether a pin is right.
      if (this.suspicions.length === 1) this.mutter('first-pin', 'Noted. Keep going.');
      if (this.suspicions.length === 4)
        this.mutter('pins-4', 'Four. Could you explain each one to a judge?');
      if (this.suspicions.length >= 7)
        this.mutter('many-pins', 'Pinning everything is not a strategy. Some of that is fine.');
    } else {
      this.suspicions = this.suspicions.filter((s) => s.id !== clue.id);
      this.mutter('unpin', 'Second thoughts. Fine. Doubt is part of the job.');
    }
    this.refreshNotebook();
  }

  private refreshNotebook(): void {
    const stray = this.docs.reduce((n, d) => n + d.strayCount, 0);
    const entries = [...this.suspicions];
    for (let i = 0; i < stray; i++)
      entries.push({ id: `stray-${i}`, label: 'unmarked spot', stray: true });
    this.notebook?.setEntries(entries);
  }

  // ---- verdict ---------------------------------------------------------------

  private onStamp(verdict: Verdict): void {
    if (this.phase !== 'investigating') return;
    this.phase = 'stamped';
    audio.setTension(false);
    this.magnifier.suspend();
    this.stamps.forEach((s) => s.setLocked(true));
    this.clock?.pause(true);
    const ink = stampInk(saveStore.get().cosmetics);
    const mark = new StampMark(
      this,
      verdict,
      (verdict === 'rug' ? ink.rug : ink.legit) as PaletteKey,
    );
    this.magnifier.ignore(mark);
    const s = saveStore.get().settings;
    if (!s.reducedMotion) {
      this.cameras.main.shake(STAMP.shakeDurationMs, STAMP.shakeIntensity);
      // Ink splatter.
      const splat = this.add.particles(STAMP.impression.x, STAMP.impression.y, TEX.pixel, {
        speed: { min: 40, max: 140 },
        angle: { min: 0, max: 360 },
        lifespan: { min: 200, max: 450 },
        scale: { start: 1, end: 0.2 },
        alpha: { start: 0.9, end: 0 },
        tint: HEX[(verdict === 'rug' ? ink.rug : ink.legit) as PaletteKey],
        quantity: 18,
        emitting: false,
      });
      splat.setDepth(DEPTH.pins);
      splat.explode(18);
      this.magnifier.ignore(splat);
      this.time.delayedCall(600, () => splat.destroy());
    }
    this.time.delayedCall(s.reducedMotion ? 400 : 1000, () => this.finish(verdict));
  }

  private finish(verdict: Verdict): void {
    const c = this.caseData;
    const relaxed = saveStore.get().settings.relaxed;
    const pins = {
      clueIds: this.docs.flatMap((d) => d.pinnedIds()),
      strayPins: this.docs.reduce((n, d) => n + d.strayCount, 0),
      hintsUsed: this.hintsUsed,
    };
    const breakdown = scoreCase({
      caseData: c,
      verdict,
      pins,
      timeLeftSec: relaxed || !this.clock ? null : this.clock.timeLeft,
      hardMode: saveStore.get().settings.hardMode,
    });

    const before = saveStore.get();
    const rankBefore = rankForScore(before.totalScore);
    // The store mutates in place: keep the primitives we compare against later.
    const dailyBefore = { lastPlayed: before.daily.lastPlayed, freezes: before.daily.freezes };
    const prevFlags = new Set(before.unlockedFlags);
    const caseFlagIds = c.documents.flatMap((d) =>
      d.clues.filter(isFlagClue).map((cl) => cl.flagId),
    );
    const newFlagIds = [...new Set(caseFlagIds)].filter((id) => !prevFlags.has(id));
    let bestImproved = false;
    // Generated files (cold cases, and the generated half of the dailies) keep their own
    // tally and never touch the campaign, the rank or the rogues gallery.
    const generated = gameState.mode === 'cold' || c.id.startsWith('cold-');
    const caughtName =
      !generated &&
      c.verdict === 'rug' &&
      breakdown.verdictCorrect &&
      !before.caseResults[c.id]?.solved
        ? rogueOf(c).name
        : null;

    saveStore.update((d) => {
      // Notebook pages unlock from any file, generated or not.
      for (const id of newFlagIds) if (FLAGS[id as keyof typeof FLAGS]) d.unlockedFlags.push(id);
      for (const doc of c.documents)
        for (const clue of doc.clues)
          if (!isFlagClue(clue) && !d.unlockedHerrings.includes(clue.herringId))
            d.unlockedHerrings.push(clue.herringId);
      if (gameState.mode === 'daily') {
        const next = recordDailyPlay(d.daily, localDateKey());
        d.daily = { ...next, played: next.played ?? [], freezes: next.freezes ?? 0 };
      }
      if (generated) {
        d.stats.coldRuns++;
        const wk = `week-${weekKey()}`;
        if (gameState.coldSeed === wk && !d.stats.weeklyDone.includes(wk))
          d.stats.weeklyDone.push(wk);
        if (breakdown.verdictCorrect) d.stats.coldCorrect++;
        if (breakdown.total > d.stats.coldBest) {
          d.stats.coldBest = breakdown.total;
          bestImproved = true;
        }
        return;
      }
      const prev = d.caseResults[c.id];
      const prevBest = prev?.bestScore ?? 0;
      if (breakdown.total > prevBest) {
        // Total score only ever counts your best run per case, so replays can't farm points.
        d.totalScore += breakdown.total - prevBest;
        bestImproved = true;
      }
      const gradeOrder = ['S', 'A', 'B', 'C', 'D'];
      const bestGrade =
        prev && gradeOrder.indexOf(prev.bestGrade) < gradeOrder.indexOf(breakdown.grade)
          ? prev.bestGrade
          : breakdown.grade;
      d.caseResults[c.id] = {
        bestScore: Math.max(prevBest, breakdown.total),
        bestGrade,
        completions: (prev?.completions ?? 0) + 1,
        lastVerdictCorrect: breakdown.verdictCorrect,
        solved: (prev?.solved ?? false) || breakdown.verdictCorrect,
      };
      // Fastest correct call, timed runs only.
      if (breakdown.verdictCorrect && !relaxed && this.clock) {
        const t = c.timeLimitSec - this.clock.timeLeft;
        const best = prev?.bestTimeSec;
        if (best === undefined || t < best) d.caseResults[c.id].bestTimeSec = t;
      }
      if (gameState.mode !== 'daily')
        d.campaignUnlocked = Math.max(d.campaignUnlocked, gameState.currentIndex + 2);
    });

    const notes: [string, string][] = [];
    const afterDaily = saveStore.get().daily;
    if (gameState.mode === 'daily' && dailyBefore.lastPlayed !== localDateKey()) {
      if (afterDaily.freezes > dailyBefore.freezes)
        notes.push(['STREAK FREEZE', 'one missed night, forgiven']);
      else if (afterDaily.freezes < dailyBefore.freezes)
        notes.push(['FREEZE SPENT', 'the chain held']);
    }

    // Every run goes on the board (local by default; see src/systems/leaderboard.ts).
    void leaderboard.submit({
      name: saveStore.get().detectiveName,
      score: breakdown.total,
      caseId: c.id,
      grade: breakdown.grade,
      date: new Date().toISOString(),
      wallet: wallet.state.address ?? undefined,
      hard: saveStore.get().settings.hardMode || undefined,
      holder: holderPerks() || undefined,
      mode: gameState.mode === 'cold' ? 'cold' : undefined,
    });

    saveStore.update((d) => {
      d.stats.runs++;
      if (breakdown.verdictCorrect) d.stats.correct++;
      for (const m of breakdown.flagsMissed) {
        if (isFlagClue(m.clue))
          d.stats.flagMisses[m.clue.flagId] = (d.stats.flagMisses[m.clue.flagId] ?? 0) + 1;
      }
      for (const f of breakdown.flagsFound) {
        if (isFlagClue(f.clue))
          d.stats.flagHits[f.clue.flagId] = (d.stats.flagHits[f.clue.flagId] ?? 0) + 1;
      }
    });

    // Badges (toasts are shown by the report scene).
    const badgesBefore = saveStore.get().badges.length;
    if (generated) {
      awardBadge(null, 'cold-one');
      if (saveStore.get().stats.coldCorrect >= 10) awardBadge(null, 'cold-ten');
    } else awardBadge(null, 'first-case');
    if (c.secret && breakdown.verdictCorrect) awardBadge(null, 'tailor-made');
    const flagsTotal = c.documents.flatMap((d) => d.clues).filter(isFlagClue).length;
    const noFalse = breakdown.falseAccusations.length === 0 && breakdown.strayPins === 0;
    if (
      c.verdict === 'rug' &&
      breakdown.verdictCorrect &&
      breakdown.flagsFound.length === flagsTotal &&
      noFalse
    )
      awardBadge(null, 'clean-sweep');
    if (breakdown.verdictCorrect && c.verdict === 'legit' && bumpStat('legitCorrect') >= 3)
      awardBadge(null, 'fair-judge');
    if (
      breakdown.verdictCorrect &&
      this.clock &&
      !relaxed &&
      this.clock.timeLeft > c.timeLimitSec / 2
    )
      awardBadge(null, 'quick-draw');
    if (noFalse) {
      if (bumpStat('cleanStreak') >= 5) awardBadge(null, 'steady-hand');
    } else saveStore.update((d) => (d.stats.cleanStreak = 0));
    if (this.examined.size >= this.totalSpots && this.totalSpots > 0) awardBadge(null, 'thorough');
    if (Object.keys(saveStore.get().caseResults).length >= gameState.cases.length)
      awardBadge(null, 'all-cases');
    if (saveStore.get().unlockedFlags.length >= FLAG_IDS.length) awardBadge(null, 'all-flags');
    checkAggregateBadges(null);
    const newBadges = saveStore.get().badges.slice(badgesBefore);

    const fresh = newlyUnlocked(saveStore.get());
    if (fresh.length > 0) saveStore.update((d) => fresh.forEach((u) => d.seenUnlocks.push(u.id)));

    const payload: ReportPayload = {
      caseData: c,
      verdict,
      breakdown,
      newFlagIds,
      newUnlockNames: fresh.map((u) => u.name),
      bestImproved,
      newBadges,
      rankUp:
        rankForScore(saveStore.get().totalScore) !== rankBefore
          ? rankForScore(saveStore.get().totalScore)
          : null,
      caughtName,
      elapsedSec: relaxed || !this.clock ? null : c.timeLimitSec - this.clock.timeLeft,
      notes,
    };
    this.scene.start('ReportScene', payload);
  }

  // ---- pause / keys ---------------------------------------------------------------

  private togglePause(): void {
    if (this.phase === 'stamped') return;
    if (this.paused) {
      this.pauseMenu?.destroy();
      this.pauseMenu = undefined;
      this.paused = false;
      this.clock?.pause(false);
      return;
    }
    this.paused = true;
    LucienBubble.dismiss();
    this.clock?.pause(true);
    this.magnifier.suspend();
    this.pauseMenu = new PauseMenu(this, {
      onResume: () => this.togglePause(),
      onSettings: () => {
        this.scene.launch('SettingsScene', { overlay: true, returnTo: InvestigationScene.KEY });
        this.scene.pause();
      },
      onNotebook: () => {
        this.scene.launch('NotebookScene', { overlay: true, returnTo: InvestigationScene.KEY });
        this.scene.pause();
      },
      onQuit: () => this.scene.start('TitleScene'),
      subtitle: `${this.caseData.ticker}  ·  ${this.caseData.title}${
        this.clock && !saveStore.get().settings.relaxed
          ? `  ·  ${Math.floor(this.clock.timeLeft / 60)}:${String(this.clock.timeLeft % 60).padStart(2, '0')} left`
          : ''
      }`,
    });
    this.magnifier.ignore(this.pauseMenu);
  }

  private onResume(): void {
    // Settings may have changed while we were paused.
    const s = saveStore.get().settings;
    this.desk.setFlicker(s.lampFlicker && !s.reducedMotion);
    this.desk.setSteam(!s.reducedMotion);
    this.desk.setWeather(s.weather);
    setupScene(this);
  }

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.addCapture(['TAB', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'PAGE_UP', 'PAGE_DOWN']);
    const on = (key: string, fn: () => void) => kb.on(`keydown-${key}`, fn);
    on('ESC', () => noDialogue() && !this.browsing && !escTaken() && this.togglePause());
    const inPlay = () => this.phase === 'investigating' && !this.paused && !this.browsing;
    const noDialogue = () => !this.dialogue?.isActive;
    on(
      'TAB',
      (e?: KeyboardEvent) => inPlay() && this.currentDoc()?.focusMove(e?.shiftKey ? -1 : 1),
    );
    on('DOWN', () => inPlay() && this.currentDoc()?.focusMove(1));
    on('RIGHT', () => inPlay() && this.currentDoc()?.focusMove(1));
    on('UP', () => inPlay() && this.currentDoc()?.focusMove(-1));
    on('LEFT', () => inPlay() && this.currentDoc()?.focusMove(-1));
    on('ENTER', () => inPlay() && noDialogue() && this.currentDoc()?.activateFocused());
    on('SPACE', () => inPlay() && noDialogue() && this.currentDoc()?.activateFocused());
    on('PAGE_DOWN', () => inPlay() && this.currentDoc()?.scroll(1));
    on('PAGE_UP', () => inPlay() && this.currentDoc()?.scroll(-1));
    on('R', () => inPlay() && this.stamps[0]?.trigger((v) => this.onStamp(v)));
    on('L', () => inPlay() && this.stamps[1]?.trigger((v) => this.onStamp(v)));
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'].forEach((name, i) =>
      on(name, () => inPlay() && this.showDocument(i)),
    );
    on(
      'OPEN_BRACKET',
      () => inPlay() && this.showDocument((this.current - 1 + this.docs.length) % this.docs.length),
    );
    on(
      'CLOSED_BRACKET',
      () => inPlay() && this.showDocument((this.current + 1) % this.docs.length),
    );

    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      if (!inPlay()) return;
      const doc = this.currentDoc();
      if (doc?.containsPoint(p.worldX, p.worldY)) doc.scroll(dy > 0 ? 1 : -1);
    });
  }

  override update(_t: number, delta: number): void {
    // The clock waits while Lucien is talking: a first-timer shouldn't lose the tutorial's
    // minute to the timer.
    if (this.phase === 'investigating' && !this.paused && this.clock && !this.dialogue?.isActive) {
      this.clock.tick(delta);
      // Ticking in the last ten seconds.
      const left = this.clock.timeLeft;
      if (this.clock.isRunning && left <= 10 && left !== this.lastTickSecond) {
        this.lastTickSecond = left;
        audio.play('tick');
      }
      if (this.clock.isRunning && left <= 30) {
        this.mutter('clock', "Clock's ticking. Go with what you've got.");
        audio.setTension(true);
      }
      if (!this.clock.isRunning && left === 0 && this.lastTickSecond === 0)
        this.mutter('timeup', "Time's up. No bonus, no penalty. Stamp it.");
    }
    // The lens only lives while the paper is in play: not under the pause dim, the phone,
    // or the stamp animation (suspend() would be undone a frame later otherwise).
    if (this.phase === 'investigating' && !this.paused && !this.browsing) this.magnifier.update();
  }
}
