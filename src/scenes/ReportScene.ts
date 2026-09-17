import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { SCORING } from '@/config/gameConfig';
import { FONT, GAME_HEIGHT, GAME_WIDTH, REPORT } from '@/config/layout';
import { HEX, type PaletteKey } from '@/config/palette';
import { FLAGS, HERRINGS, isFlagClue } from '@/data/schema';
import { audio } from '@/systems/audio';
import { gameState } from '@/systems/gameState';
import { rankForScore } from '@/systems/ranks';
import { saveStore } from '@/systems/save';
import { ButtonGroup } from '@/ui/ButtonGroup';
import { DeskBackground } from '@/ui/DeskBackground';
import { lucienSays } from '@/ui/DialogueBox';
import { toast } from '@/ui/Toast';
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
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) =>
      this.scrollBy(dy > 0 ? 26 : -26),
    );
    this.input.keyboard?.on('keydown-PAGE_DOWN', () => this.scrollBy(60));
    this.input.keyboard?.on('keydown-PAGE_UP', () => this.scrollBy(-60));

    // Buttons along the bottom of the paper.
    const by = y + h - pad - 18;
    const buttons: PixelButton[] = [];
    const isDaily = gameState.mode === 'daily';
    const nextIndex = gameState.currentIndex + 1;
    const hasNext = !isDaily && nextIndex < gameState.cases.length;
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
    this.payload.newBadges.forEach((id, i) => {
      this.time.delayedCall(1200 + i * 3600, () =>
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
        });
        L.push(...wrap(flag.explanation, 12));
      }
      for (const f of b.flagsMissed) {
        if (!isFlagClue(f.clue)) continue;
        const flag = FLAGS[f.clue.flagId as keyof typeof FLAGS];
        L.push({ text: `x MISSED  ${flag.title}  (in ${f.documentTitle})`, color: 'stampRed' });
        L.push(...wrap(flag.explanation, 12));
      }
    } else {
      L.push({ text: 'NOTHING TO SEE HERE', font: 'ui', size: 10, color: 'woodDark', gap: 6 });
      L.push(...wrap('This project checked out. The scary-looking bits were yellow herrings:', 0));
      for (const doc of c.documents) {
        for (const clue of doc.clues) {
          if (isFlagClue(clue)) continue;
          const h = HERRINGS[clue.herringId as keyof typeof HERRINGS];
          L.push({ text: `- ${h.title}`, color: 'ink' });
        }
      }
    }

    if (b.falseAccusations.length > 0 || b.strayPins > 0) {
      L.push({ text: 'FALSE ACCUSATIONS', font: 'ui', size: 10, color: 'woodDark', gap: 6 });
      for (const f of b.falseAccusations) {
        if (isFlagClue(f.clue)) continue;
        const h = HERRINGS[f.clue.herringId as keyof typeof HERRINGS];
        L.push({ text: `! ${h.title}  (${SCORING.falseAccusation})`, color: 'stampRed' });
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
      text: `Verdict ${fmt(b.verdictPoints)}   Flags ${fmt(b.flagPoints)}   Penalties ${fmt(b.penaltyPoints)}   Time ${fmt(b.timeBonus)}`,
    });
    L.push({
      text: `TOTAL ${b.total} / ${b.maxPossible}${bestImproved ? '   new best!' : ''}`,
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

  private lucienDebrief(): void {
    const b = this.payload.breakdown;
    const follow = () => {
      if (!b.verdictCorrect) lucienSays(this, 'first-wrong');
      else if (this.payload.caseData.verdict === 'legit') lucienSays(this, 'first-legit');
    };
    if (!lucienSays(this, 'first-report', { onDone: follow })) follow();
    if (Object.keys(saveStore.get().caseResults).length >= gameState.cases.length) {
      this.time.delayedCall(200, () => lucienSays(this, 'all-cases'));
    }
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
