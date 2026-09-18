import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { SCORING } from '@/config/gameConfig';
import { FONT, GAME_HEIGHT, GAME_WIDTH, REPORT } from '@/config/layout';
import { HEX, type PaletteKey } from '@/config/palette';
import { FLAGS, HERRINGS, isFlagClue } from '@/data/schema';
import { audio } from '@/systems/audio';
import { downloadCanvas, renderShareCard } from '@/systems/shareCard';
import { gameState } from '@/systems/gameState';
import { rankForScore } from '@/systems/ranks';
import { saveStore } from '@/systems/save';
import { ButtonGroup } from '@/ui/ButtonGroup';
import { DeskBackground } from '@/ui/DeskBackground';
import { LUCIEN_TEX, lucienSays } from '@/ui/DialogueBox';
import { STORY_BEATS } from '@/data/dialogue';
import { playableCases, secretUnlocked } from '@/systems/secretCase';
import { confetti } from '@/ui/confetti';
import { attachScroll } from '@/ui/dragScroll';
import { toast } from '@/ui/Toast';
import { StickyNote } from '@/ui/StickyNote';
import { LucienBubble } from '@/ui/LucienBubble';
import { localDateKey } from '@/systems/dailyCase';
import { BADGE_BY_ID } from '@/data/badges';
import { PixelButton } from '@/ui/PixelButton';
import { addText, charWidth, makeText, wrapMono } from '@/ui/text';
import { Typewriter, type TypedLine } from '@/ui/Typewriter';
import type { ReportPayload } from './InvestigationScene';
import { setupScene } from './sceneUtil';

/** The typed-out case report: truth, flags found/missed, false accusations, score, grade. */
export class ReportScene extends Phaser.Scene {
  static readonly KEY = 'ReportScene';
  private payload!: ReportPayload;
  private typewriter?: Typewriter;
  private content!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;
  private gradeMark?: Phaser.GameObjects.Container;

  constructor() {
    super(ReportScene.KEY);
  }

  init(data: ReportPayload): void {
    this.payload = data;
  }

  create(): void {
    setupScene(this);
    new DeskBackground(this, { props: true, stamps: false });
    const { x, y, w, h } = REPORT;
    const pad = 14;
    this.add
      .image(x + 4, y + 5, TEX.paper)
      .setOrigin(0)
      .setDisplaySize(w, h)
      .setTint(HEX.bg)
      .setAlpha(0.55)
      .setDepth(DEPTH.documents);
    this.add.image(x, y, TEX.paper).setOrigin(0).setDisplaySize(w, h).setDepth(DEPTH.documents);
    this.add
      .image(x + 30, y - 6, TEX.paperclip)
      .setOrigin(0)
      .setDepth(DEPTH.pins);

    const viewH = h - pad * 2 - 26;
    this.content = this.add.container(x + pad, y + pad).setDepth(DEPTH.pins);
    const mask = this.make.graphics({ x: 0, y: 0 }, false);
    mask.fillStyle(0xffffff, 1);
    mask.fillRect(x, y + pad - 2, w, viewH + 4);
    this.content.setMask(new Phaser.Display.Masks.GeometryMask(this, mask));

    const lines = this.buildLines(w - pad * 2 - 52);
    const instant = saveStore.get().settings.reducedMotion;
    this.typewriter = new Typewriter(this, this.content, lines, 13, REPORT.typeSpeedMs, instant);
    this.maxScroll = Math.max(0, this.typewriter.height - viewH);
    this.typewriter.then(() => {
      this.showGrade();
      this.time.delayedCall(900, () => this.lucienDebrief());
    });

    // Skip / scroll.
    this.input.on('pointerdown', () => this.typewriter?.skip());
    this.input.keyboard?.on('keydown-SPACE', () => this.typewriter?.skip());
    this.input.keyboard?.on('keydown-ENTER', () => this.typewriter?.skip());
    attachScroll(this, { step: 26, onScroll: (d) => this.scrollBy(d) });
    this.input.keyboard?.on('keydown-PAGE_DOWN', () => this.scrollBy(60));
    this.input.keyboard?.on('keydown-PAGE_UP', () => this.scrollBy(-60));

    // Buttons along the bottom of the paper.
    const by = y + h - pad - 18;
    const buttons: PixelButton[] = [];
    const isDaily = gameState.mode === 'daily';
    const nextIndex = gameState.currentIndex + 1;
    const hasNext = !isDaily && nextIndex < playableCases(saveStore.get(), gameState.cases).length;
    if (hasNext) {
      buttons.push(
        new PixelButton(
          this,
          x + pad,
          by,
          'Next case',
          () => {
            gameState.currentIndex = nextIndex;
            gameState.currentCase = gameState.cases[nextIndex];
            this.scene.start('InvestigationScene');
          },
          { width: 84 },
        ),
      );
    }
    buttons.push(
      new PixelButton(
        this,
        x + pad + (hasNext ? 90 : 0),
        by,
        'Retry',
        () => this.scene.start('InvestigationScene'),
        { width: 60 },
      ),
    );
    buttons.push(
      new PixelButton(
        this,
        x + w - pad - 176,
        by,
        'Notebook',
        () => this.scene.start('NotebookScene'),
        { width: 80 },
      ),
    );
    buttons.push(
      new PixelButton(this, x + pad + 160, by, 'Share', () => this.shareMenu(x + pad + 160, by), {
        width: 54,
      }),
    );
    buttons.push(
      new PixelButton(
        this,
        x + w - pad - 90,
        by,
        isDaily ? 'Title' : 'Case files',
        () => this.scene.start(isDaily ? 'TitleScene' : 'CaseSelectScene'),
        { width: 90 },
      ),
    );
    buttons.forEach((b) => b.setDepth(DEPTH.hud));
    const group = new ButtonGroup(this, buttons, (i) => buttons[i].emit('pointerdown'), {
      horizontal: true,
    });
    this.input.on('pointermove', () => group.clearFocus());

    const save = saveStore.get();
    addText(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 12,
      `${rankForScore(save.totalScore)}  ·  ${save.totalScore} pts`,
      { size: FONT.size.tiny, color: 'woodLight' },
    )
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud);
    audio.play(this.payload.breakdown.verdictCorrect ? 'correct' : 'wrong');
    if (this.payload.rankUp) {
      this.time.delayedCall(900, () => {
        toast(this, 'PROMOTED', `You are now ${this.payload.rankUp}`);
        audio.play('caseClosed');
      });
    }
    // Toasts queue themselves; only the first needs a beat after the stamp.
    this.time.delayedCall(this.payload.rankUp ? 1400 : 1200, () => {
      if (this.payload.caughtName) toast(this, 'WANTED POSTER', this.payload.caughtName);
      this.payload.newUnlockNames.forEach((name) => toast(this, 'UNLOCKED', name));
      this.payload.newBadges.forEach((id) =>
        toast(this, 'BADGE EARNED', BADGE_BY_ID[id]?.name ?? id),
      );
    });
  }

  private scrollBy(dy: number): void {
    this.scrollY = Phaser.Math.Clamp(this.scrollY + dy, 0, this.maxScroll);
    this.content.setY(REPORT.y + 14 - this.scrollY);
  }

  private buildLines(width: number): TypedLine[] {
    const {
      caseData: c,
      verdict,
      breakdown: b,
      newFlagIds,
      newUnlockNames,
      bestImproved,
    } = this.payload;
    const cw = charWidth(this, 'body', 12);
    const maxChars = Math.floor(width / cw) - 1;
    const wrap = (text: string, indent: number, color: PaletteKey = 'shadow'): TypedLine[] =>
      wrapMono(text, maxChars - Math.floor(indent / cw)).map((t) => ({ text: t, indent, color }));
    const L: TypedLine[] = [];
    L.push({
      text: `CASE REPORT  ${c.ticker}  "${c.title}"`,
      font: 'ui',
      size: 12,
      color: 'woodDark',
    });
    const truth = c.verdict.toUpperCase();
    L.push({
      text: `Your verdict: ${verdict.toUpperCase()}   Truth: ${truth}   ${b.verdictCorrect ? `CORRECT (+${SCORING.correctVerdict})` : `WRONG (${SCORING.wrongVerdict})`}`,
      color: b.verdictCorrect ? 'lampGreen' : 'stampRed',
    });
    L.push(...wrap(c.debrief, 0, 'woodDark'));

    if (c.verdict === 'rug') {
      L.push({ text: 'RED FLAGS', font: 'ui', size: 10, color: 'woodDark', gap: 6 });
      for (const f of b.flagsFound) {
        if (!isFlagClue(f.clue)) continue;
        const flag = FLAGS[f.clue.flagId as keyof typeof FLAGS];
        const pts = SCORING.realFlagPinned + (f.clue.finePrint ? SCORING.finePrintBonus : 0);
        L.push({
          text: `+ FOUND  ${flag.title}  (+${pts}${f.clue.finePrint ? ', fine print' : ''})`,
          color: 'lampGreen',
          onClick: () => this.openNotebook('flags', flag.id),
        });
        L.push(...wrap(flag.explanation, 12));
      }
      for (const f of b.flagsMissed) {
        if (!isFlagClue(f.clue)) continue;
        const flag = FLAGS[f.clue.flagId as keyof typeof FLAGS];
        L.push({
          text: `x MISSED  ${flag.title}  (in ${f.documentTitle})`,
          color: 'stampRed',
          onClick: () => this.openNotebook('flags', flag.id),
        });
        L.push(...wrap(flag.explanation, 12));
      }
    } else {
      L.push({ text: 'NOTHING TO SEE HERE', font: 'ui', size: 10, color: 'woodDark', gap: 6 });
      L.push(...wrap('This project checked out. The scary-looking bits were yellow herrings:', 0));
      for (const doc of c.documents) {
        for (const clue of doc.clues) {
          if (isFlagClue(clue)) continue;
          const h = HERRINGS[clue.herringId as keyof typeof HERRINGS];
          L.push({
            text: `- ${h.title}`,
            color: 'ink',
            onClick: () => this.openNotebook('herrings', h.id),
          });
        }
      }
    }

    const missedFine = b.flagsMissed.filter((f) => f.clue.finePrint).length;
    if (missedFine > 0) {
      L.push(
        ...wrap(
          `${missedFine} of the missed flag${missedFine > 1 ? 's were' : ' was'} fine print: only legible through the lens. Sweep slowly.`,
          0,
          'ink',
        ),
      );
    }

    if (b.falseAccusations.length > 0 || b.strayPins > 0) {
      L.push({ text: 'FALSE ACCUSATIONS', font: 'ui', size: 10, color: 'woodDark', gap: 6 });
      for (const f of b.falseAccusations) {
        if (isFlagClue(f.clue)) continue;
        const h = HERRINGS[f.clue.herringId as keyof typeof HERRINGS];
        L.push({
          text: `! ${h.title}  (${SCORING.falseAccusation})`,
          color: 'stampRed',
          onClick: () => this.openNotebook('herrings', h.id),
        });
        L.push(...wrap(h.reassurance, 12));
      }
      if (b.strayPins > 0) {
        L.push({
          text: `! ${b.strayPins} pin${b.strayPins > 1 ? 's' : ''} on empty paper  (${b.strayPins * SCORING.falseAccusation})`,
          color: 'stampRed',
        });
      }
    }

    L.push({ text: 'SCORE', font: 'ui', size: 10, color: 'woodDark', gap: 6 });
    L.push({
      text: `Verdict ${fmt(b.verdictPoints)}   Flags ${fmt(b.flagPoints)}   Penalties ${fmt(b.penaltyPoints)}${b.hintPoints ? `   Hints ${fmt(b.hintPoints)}` : ''}   Time ${fmt(b.timeBonus)}`,
    });
    L.push({
      text: `TOTAL ${b.total} / ${b.maxPossible}${b.multiplier !== 1 ? `   (honour x${b.multiplier})` : ''}${bestImproved ? '   new best!' : ''}`,
      font: 'ui',
      size: 12,
      color: 'shadow',
    });
    if (newFlagIds.length > 0) {
      const names = newFlagIds.map((id) => FLAGS[id as keyof typeof FLAGS]?.title ?? id);
      L.push(...wrap(`New in your notebook: ${names.join('; ')}`, 0, 'ink'));
    }
    if (newUnlockNames.length > 0)
      L.push(...wrap(`Unlocked: ${newUnlockNames.join(', ')} (see Settings)`, 0, 'amber'));
    if (this.payload.caughtName)
      L.push(
        ...wrap(
          `${this.payload.caughtName} goes up in the rogues gallery (Notebook > Rogues).`,
          0,
          'stampRed',
        ),
      );
    if (this.payload.rankUp)
      L.push({ text: `PROMOTED: ${this.payload.rankUp}`, font: 'ui', size: 12, color: 'amber' });
    if (this.payload.newBadges.length > 0)
      L.push(
        ...wrap(
          `Badges: ${this.payload.newBadges.map((id) => BADGE_BY_ID[id]?.name ?? id).join(', ')}`,
          0,
          'amber',
        ),
      );
    return L;
  }

  private sharePopover?: Phaser.GameObjects.Container;

  /** Two ways to share: the text for the clipboard, or a picture of the report. */
  private shareMenu(bx: number, by: number): void {
    if (this.sharePopover) {
      this.sharePopover.destroy();
      this.sharePopover = undefined;
      return;
    }
    audio.play('ui');
    const c = this.add.container(0, 0).setDepth(DEPTH.overlay);
    const close = () => {
      c.destroy();
      if (this.sharePopover === c) this.sharePopover = undefined;
    };
    const outside = this.add.zone(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0);
    outside.setInteractive({ useHandCursor: false });
    outside.on('pointerdown', close);
    this.children.remove(outside);
    c.add(outside);
    const w = 96;
    const h = 52;
    const px = bx - 20;
    const py = by - h - 6;
    c.add(this.add.rectangle(px + 3, py + 4, w, h, HEX.bg, 0.5).setOrigin(0));
    c.add(this.add.rectangle(px - 2, py - 2, w + 4, h + 4, HEX.woodDark).setOrigin(0));
    c.add(this.add.rectangle(px, py, w, h, HEX.paper).setOrigin(0));
    const mk = (label: string, y: number, fn: () => void) => {
      const b = new PixelButton(
        this,
        px + 6,
        y,
        label,
        () => {
          close();
          fn();
        },
        { width: w - 12, variant: 'ink' },
      );
      this.children.remove(b);
      c.add(b);
    };
    mk('Copy text', py + 5, () => this.share());
    mk('Save card', py + 27, () => this.saveCard());
    this.sharePopover = c;
  }

  /** A 1280x720 PNG of the result, for posting. */
  private saveCard(): void {
    const { caseData: c, verdict, breakdown: b } = this.payload;
    const flags = c.documents.flatMap((d) => d.clues).filter(isFlagClue).length;
    const isDaily = gameState.mode === 'daily';
    const mascotTex = this.textures.exists(LUCIEN_TEX)
      ? (this.textures.get(LUCIEN_TEX).getSourceImage() as HTMLImageElement)
      : null;
    const canvas = renderShareCard({
      ticker: c.ticker,
      title: c.title,
      verdict,
      correct: b.verdictCorrect,
      grade: b.grade,
      score: b.total,
      detail:
        c.verdict === 'rug'
          ? `Red flags found ${b.flagsFound.length}/${flags}  ·  false accusations ${b.falseAccusations.length + b.strayPins}`
          : `Yellow herrings pinned ${b.falseAccusations.length}`,
      mode: isDaily
        ? `Daily ${localDateKey()}`
        : `Case ${gameState.currentIndex + 1} of ${gameState.cases.length}`,
      detective: saveStore.get().detectiveName,
      url: `${location.host}${location.pathname}`.replace(/\/$/, ''),
      mascot: mascotTex,
    });
    const ok = downloadCanvas(canvas, `rug-or-not-${isDaily ? localDateKey() : c.id}.png`);
    audio.play(ok ? 'stamp' : 'wrong');
    toast(
      this,
      ok ? 'CARD SAVED' : 'NO LUCK',
      ok ? 'a picture of this report' : 'this browser blocks downloads',
    );
  }

  /** Wordle-style result text for the clipboard (falls back to a note you can read). */
  private share(): void {
    const { caseData: c, verdict, breakdown: b } = this.payload;
    const flags = c.documents.flatMap((d) => d.clues).filter(isFlagClue).length;
    const isDaily = gameState.mode === 'daily';
    const save = saveStore.get();
    const lines = [
      `Rug or Not? ${isDaily ? `Daily ${localDateKey()}` : `Case: ${c.ticker}`} "${c.title}"`,
      `Verdict: ${verdict.toUpperCase()} ${b.verdictCorrect ? '(correct)' : '(wrong)'}  Grade ${b.grade}  ${b.total} pts`,
      c.verdict === 'rug'
        ? `Red flags found: ${b.flagsFound.length}/${flags}  False accusations: ${b.falseAccusations.length + b.strayPins}`
        : `Yellow herrings pinned: ${b.falseAccusations.length}`,
      isDaily && save.daily.streak > 1 ? `Streak: ${save.daily.streak} days` : '',
      `${location.origin}${location.pathname}#${isDaily ? 'daily' : `case=${c.id}`}`,
      '#RugOrNot',
    ].filter(Boolean);
    const text = lines.join('\n');
    const done = () => toast(this, 'COPIED', 'result on the clipboard');
    try {
      void navigator.clipboard
        .writeText(text)
        .then(done, () => new StickyNote(this, 160, 100, 'share text', text, 320));
    } catch {
      new StickyNote(this, 160, 100, 'share text', text, 320);
    }
  }

  /** A quick verdict on your verdict, every time. */
  /** Flag and herring lines are links into the notebook (overlay, comes back here). */
  private openNotebook(chapter: 'flags' | 'herrings', id: string): void {
    audio.play('paper');
    this.scene.launch('NotebookScene', { overlay: true, returnTo: ReportScene.KEY, chapter, id });
    this.scene.pause();
  }

  private lucienComment(): void {
    const { breakdown: b, caseData: c } = this.payload;
    const missedFine = b.flagsMissed.filter((f) => f.clue.finePrint).length;
    const flags = c.documents.flatMap((d) => d.clues).filter(isFlagClue).length;
    let line: string;
    if (!b.verdictCorrect)
      line =
        c.verdict === 'rug'
          ? 'They got past you. Read what you missed; it will not get past you twice.'
          : 'You rugged a legit one. Scary is not the same as guilty.';
    else if (b.grade === 'S') line = 'Clean. Frame it.';
    else if (
      c.verdict === 'rug' &&
      b.flagsFound.length === flags &&
      b.falseAccusations.length + b.strayPins > 0
    )
      line = 'You found everything, then kept pinning. Know when to stop.';
    else if (missedFine > 0)
      line = 'Right call, but the fine print slipped by. Sweep the lens slower.';
    else if (b.falseAccusations.length > 0)
      line = 'Right call. Some of those pins were on innocent paper, though.';
    else if (b.flagsMissed.length > 0) line = 'Right call. There was more to find.';
    else line = 'Solid work, detective.';
    LucienBubble.say(this, line, 5000, 34);
  }

  /**
   * Once-only lessons chain first (report -> legit/wrong -> all cases); when
   * nothing new needs saying, Lucien just gives his quick take.
   */
  private lucienDebrief(): void {
    const b = this.payload.breakdown;
    const allDone = Object.keys(saveStore.get().caseResults).length >= gameState.cases.length;
    // Campaign story beats land after certain files, once, when the verdict was right.
    const beat =
      gameState.mode === 'campaign' && b.verdictCorrect
        ? STORY_BEATS[gameState.currentIndex]
        : undefined;
    const finale = () => {
      const box = allDone ? lucienSays(this, 'all-cases') : null;
      if (!box) this.lucienComment();
    };
    // The moment the last ordinary file is solved, a folder with no name shows up.
    const reveal = () => {
      const box =
        !this.payload.caseData.secret && secretUnlocked(saveStore.get(), gameState.cases)
          ? lucienSays(this, 'secret-unlocked', { onDone: finale })
          : null;
      if (!box) finale();
    };
    const story = () => {
      const box = beat ? lucienSays(this, beat, { onDone: reveal }) : null;
      if (!box) reveal();
    };
    const follow = () => {
      const box = !b.verdictCorrect
        ? lucienSays(this, 'first-wrong', { onDone: story })
        : this.payload.caseData.verdict === 'legit'
          ? lucienSays(this, 'first-legit', { onDone: story })
          : null;
      if (!box) story();
    };
    if (!lucienSays(this, 'first-report', { onDone: follow })) follow();
  }

  private showGrade(): void {
    if (this.gradeMark) return;
    const { x, y, w } = REPORT;
    const g = this.payload.breakdown.grade;
    const ink: PaletteKey = g === 'S' || g === 'A' ? 'stampGreen' : g === 'D' ? 'stampRed' : 'ink';
    const mark = this.add
      .container(x + w - 34, y + 36)
      .setDepth(DEPTH.hud)
      .setAngle(-10);
    const box = this.add.rectangle(0, 0, 40, 40).setStrokeStyle(3, HEX[ink]).setOrigin(0.5);
    const t = makeText(this, 0, 0, g, { size: FONT.size.title, color: ink }).setOrigin(0.5);
    const small = makeText(this, 0, 22, 'GRADE', { size: FONT.size.tiny, color: ink }).setOrigin(
      0.5,
      0,
    );
    mark.add([box, t, small]);
    this.gradeMark = mark;
    // A perfect night deserves paper in the air.
    if (g === 'S') confetti(this, 2200);
    const reduced = saveStore.get().settings.reducedMotion;
    if (!reduced) {
      mark.setScale(1.6).setAlpha(0);
      this.tweens.add({
        targets: mark,
        scale: 1,
        alpha: 0.9,
        duration: 180,
        ease: 'Quad.easeIn',
        onComplete: () => audio.play('stamp'),
      });
    } else mark.setAlpha(0.9);

    // Verdict banner across the top of the sheet.
    const correct = this.payload.breakdown.verdictCorrect;
    const banner = this.add
      .container(x + w / 2, y + 8)
      .setDepth(DEPTH.hud)
      .setAngle(-3);
    const bw = 150;
    const bg = this.add
      .rectangle(0, 0, bw, 18, HEX[correct ? 'stampGreen' : 'stampRed'])
      .setOrigin(0.5);
    const edge = this.add
      .rectangle(0, 0, bw - 4, 14)
      .setStrokeStyle(1, HEX.paper)
      .setOrigin(0.5);
    const label = makeText(this, 0, 0, correct ? 'CASE CLOSED' : 'WRONG CALL', {
      size: FONT.size.body,
      color: 'paper',
    }).setOrigin(0.5);
    banner.add([bg, edge, label]);
    this.time.delayedCall(reduced ? 0 : 260, () => {
      audio.play(correct ? 'caseClosed' : 'wrong');
      if (reduced) return;
      banner.setScale(1.5).setAlpha(0);
      this.tweens.add({ targets: banner, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' });
    });
  }

  override update(_t: number, delta: number): void {
    this.typewriter?.update(delta);
  }
}

function fmt(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}
