import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { DRAWER, FONT, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { HEX } from '@/config/palette';
import type { CaseData } from '@/data/schema';
import { audio } from '@/systems/audio';
import { gameState, newColdSeed } from '@/systems/gameState';
import { startColdCase } from '@/systems/coldCase';
import { secretUnlocked } from '@/systems/secretCase';
import { weekKey } from '@/systems/dailyCase';
import { rankForScore } from '@/systems/ranks';
import { saveStore } from '@/systems/save';
import { DeskBackground } from '@/ui/DeskBackground';
import { lucienSays } from '@/ui/DialogueBox';
import { PixelButton } from '@/ui/PixelButton';
import { addText, charWidth, makeText, wrapMono } from '@/ui/text';
import { setupScene } from './sceneUtil';
import { difficultyPips, rect } from '@/ui/shapes';

/** A filing-cabinet drawer of case folders. Locked ones wear a padlock. */
export class CaseSelectScene extends Phaser.Scene {
  static readonly KEY = 'CaseSelectScene';
  private focus = 0;
  private folders: Phaser.GameObjects.Container[] = [];
  private unlocked: boolean[] = [];
  private tip?: Phaser.GameObjects.Container;

  constructor() {
    super(CaseSelectScene.KEY);
  }

  create(): void {
    setupScene(this);
    new DeskBackground(this, { props: false, stamps: false });
    const save = saveStore.get();
    const cases = gameState.cases;

    this.add.image(DRAWER.x, DRAWER.y, TEX.drawer).setOrigin(0).setDepth(DEPTH.documents);
    addText(this, GAME_WIDTH / 2, DRAWER.y - 22, 'CASE FILES', {
      size: FONT.size.heading,
      color: 'paper',
    })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud);
    addText(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 26,
      `${rankForScore(save.totalScore)}  ·  ${save.totalScore} pts  ·  ${Object.keys(save.caseResults).length}/${cases.length} closed`,
      {
        size: FONT.size.small,
        color: 'paperShadow',
      },
    )
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud);

    this.folders = [];
    const secretOpen = secretUnlocked(save, cases);
    this.unlocked = cases.map((c, i) => i < save.campaignUnlocked && (!c.secret || secretOpen));
    const slot = (i: number) => ({
      x: DRAWER.x + 18 + (i % DRAWER.cols) * (DRAWER.folderW + DRAWER.gapX),
      y: DRAWER.y + 36 + Math.floor(i / DRAWER.cols) * (DRAWER.folderH + DRAWER.gapY),
    });
    cases.forEach((c, i) => {
      const { x: fx, y: fy } = slot(i);
      this.folders.push(
        this.makeFolder(c, i, fx, fy, this.unlocked[i], save.caseResults[c.id]?.bestGrade),
      );
    });
    // The pile: a blank folder at the end of the drawer that prints a cold case, and
    // beside it this week's cold case, the same file for everyone.
    if (cases.length < DRAWER.cols * DRAWER.rows) this.makePile(slot(cases.length));
    if (cases.length + 1 < DRAWER.cols * DRAWER.rows) this.makeWeekly(slot(cases.length + 1));

    const back = new PixelButton(
      this,
      12,
      GAME_HEIGHT - 26,
      'Back  [Esc]',
      () => this.scene.start('TitleScene'),
      { hotkey: 'ESC' },
    );
    back.setDepth(DEPTH.hud);

    const kb = this.input.keyboard;
    kb?.addCapture(['LEFT', 'RIGHT', 'UP', 'DOWN', 'TAB']);
    kb?.on('keydown-RIGHT', () => this.moveFocus(1));
    kb?.on('keydown-LEFT', () => this.moveFocus(-1));
    kb?.on('keydown-DOWN', () => this.moveFocus(DRAWER.cols));
    kb?.on('keydown-UP', () => this.moveFocus(-DRAWER.cols));
    kb?.on('keydown-TAB', () => this.moveFocus(1));
    kb?.on('keydown-ENTER', () => this.open(this.focus));
    this.focus = Math.max(0, this.unlocked.lastIndexOf(true));
    this.refreshFocus();
    lucienSays(this, 'case-files');
  }

  private makeFolder(
    c: CaseData,
    i: number,
    x: number,
    y: number,
    unlocked: boolean,
    grade?: string,
  ): Phaser.GameObjects.Container {
    const cont = this.add.container(x, y).setDepth(DEPTH.pins);
    const img = this.make.image({ x: 0, y: 0, key: TEX.folder }, false).setOrigin(0);
    cont.add(img);
    cont.add(makeText(this, 3, -1, `#${i + 1}`, { size: FONT.size.tiny, color: 'woodDark' }));
    cont.add(
      makeText(this, 40, 14, unlocked ? c.ticker : '????', {
        size: FONT.size.body,
        color: 'shadow',
      }).setOrigin(0.5, 0),
    );
    cont.add(
      makeText(this, 40, 30, unlocked ? c.title.slice(0, 15) : c.secret ? 'no name' : 'locked', {
        size: FONT.size.tiny,
        color: 'woodDark',
      }).setOrigin(0.5, 0),
    );
    cont.add(difficultyPips(this, 40 - 17, 44, c.difficulty));
    if (!unlocked) {
      cont.add(this.make.image({ x: 62, y: 8, key: TEX.iconPadlock }, false).setOrigin(0));
      img.setAlpha(0.7);
    }
    if (grade) {
      const gx = 68;
      const gy = 18;
      const box = rect(this, gx, gy, 14, 14).setStrokeStyle(1, HEX.stampGreen).setOrigin(0.5);
      const t = makeText(this, gx, gy, grade, {
        size: FONT.size.small,
        color: 'stampGreen',
      }).setOrigin(0.5);
      cont.add([box, t]);
    }
    const focusRing = rect(this, -3, -3, DRAWER.folderW + 6, DRAWER.folderH + 6)
      .setStrokeStyle(1, HEX.amber)
      .setVisible(false)
      .setName('focus');
    cont.add(focusRing);
    cont.setSize(DRAWER.folderW, DRAWER.folderH);
    cont.setInteractive(
      new Phaser.Geom.Rectangle(
        DRAWER.folderW / 2,
        DRAWER.folderH / 2,
        DRAWER.folderW,
        DRAWER.folderH,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    cont.on('pointerover', () => {
      this.focus = i;
      this.refreshFocus();
      this.showTip(c, i, x, y, unlocked);
    });
    cont.on('pointerout', () => this.hideTip());
    cont.on('pointerdown', () => this.open(i));
    return cont;
  }

  /** A little card under the folder: pitch, best run, or what unlocks it. */
  private showTip(c: CaseData, i: number, x: number, y: number, unlocked: boolean): void {
    this.hideTip();
    const save = saveStore.get();
    const best = save.caseResults[c.id];
    const w = 220;
    const cw = charWidth(this, 'body', FONT.size.body);
    const maxChars = Math.floor((w - 12) / cw);
    const lines = unlocked
      ? [
          ...wrapMono(`"${c.pitch}"`, maxChars),
          best
            ? `best: ${best.bestScore} pts (${best.bestGrade})${best.bestTimeSec !== undefined ? `  ·  fastest ${Math.floor(best.bestTimeSec / 60)}:${String(best.bestTimeSec % 60).padStart(2, '0')}` : ''}  ·  ${best.completions}x`
            : 'not played yet',
        ]
      : wrapMono(
          c.secret
            ? 'No name on this one. Stamp every other file correctly and it opens.'
            : `Locked. Close case #${i} to open this folder.`,
          maxChars,
        );
    const h = 10 + lines.length * 12;
    const tx = Phaser.Math.Clamp(x + DRAWER.folderW / 2 - w / 2, 8, GAME_WIDTH - w - 8);
    const ty = y + DRAWER.folderH + 8;
    const tip = this.add.container(0, 0).setDepth(DEPTH.toast);
    tip.add(rect(this, tx + 2, ty + 3, w, h, HEX.bg, 0.5));
    tip.add(rect(this, tx, ty, w, h, HEX.paper));
    lines.forEach((l, li) =>
      tip.add(
        makeText(this, tx + 6, ty + 5 + li * 12, l, {
          font: 'body',
          size: FONT.size.body,
          color: unlocked && li === lines.length - 1 ? 'ink' : 'shadow',
        }),
      ),
    );
    this.tip = tip;
  }

  private hideTip(): void {
    this.tip?.destroy();
    this.tip = undefined;
  }

  private moveFocus(d: number): void {
    const n = this.folders.length;
    if (n === 0) return;
    this.focus = (((this.focus + d) % n) + n) % n;
    this.refreshFocus();
  }

  private refreshFocus(): void {
    this.folders.forEach((f, i) => {
      const ring = f.getByName('focus') as Phaser.GameObjects.Rectangle | null;
      ring?.setVisible(i === this.focus);
      f.setY(
        Math.round(
          DRAWER.y +
            36 +
            Math.floor(i / DRAWER.cols) * (DRAWER.folderH + DRAWER.gapY) -
            (i === this.focus ? 4 : 0),
        ),
      );
    });
  }

  private makePile(at: { x: number; y: number }): void {
    const cont = this.add.container(at.x, at.y).setDepth(DEPTH.pins);
    // Two folders peeking out behind the top one.
    cont.add(this.make.image({ x: 4, y: -6, key: TEX.folder }, false).setOrigin(0).setAlpha(0.6));
    cont.add(this.make.image({ x: 2, y: -3, key: TEX.folder }, false).setOrigin(0).setAlpha(0.8));
    cont.add(this.make.image({ x: 0, y: 0, key: TEX.folder }, false).setOrigin(0));
    cont.add(makeText(this, 3, -1, 'the pile', { size: FONT.size.tiny, color: 'woodDark' }));
    cont.add(
      makeText(this, 40, 14, 'COLD', { size: FONT.size.body, color: 'ink' }).setOrigin(0.5, 0),
    );
    cont.add(
      makeText(this, 40, 30, `${saveStore.get().stats.coldRuns} closed`, {
        size: FONT.size.tiny,
        color: 'woodDark',
      }).setOrigin(0.5, 0),
    );
    cont.setSize(DRAWER.folderW, DRAWER.folderH);
    cont.setInteractive(
      new Phaser.Geom.Rectangle(
        DRAWER.folderW / 2,
        DRAWER.folderH / 2,
        DRAWER.folderW,
        DRAWER.folderH,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    cont.on('pointerover', () => {
      audio.play('hover');
      this.hideTip();
      const w = 220;
      const tx = Phaser.Math.Clamp(at.x + DRAWER.folderW / 2 - w / 2, 8, GAME_WIDTH - w - 8);
      const ty = at.y + DRAWER.folderH + 8;
      const tip = this.add.container(0, 0).setDepth(DEPTH.toast);
      tip.add(rect(this, tx + 2, ty + 3, w, 34, HEX.bg, 0.5));
      tip.add(rect(this, tx, ty, w, 34, HEX.paper));
      ['Cold cases: files the printer makes up.', 'Endless. Their own board.'].forEach((l, i) =>
        tip.add(
          makeText(this, tx + 6, ty + 5 + i * 12, l, {
            font: 'body',
            size: FONT.size.body,
            color: 'shadow',
          }),
        ),
      );
      this.tip = tip;
    });
    cont.on('pointerout', () => this.hideTip());
    cont.on('pointerdown', () => {
      audio.play('paper');
      startColdCase(this, newColdSeed());
    });
  }

  private makeWeekly(at: { x: number; y: number }): void {
    const wk = weekKey();
    const seed = `week-${wk}`;
    const done = saveStore.get().stats.weeklyDone.includes(seed);
    const cont = this.add.container(at.x, at.y).setDepth(DEPTH.pins);
    cont.add(this.make.image({ x: 0, y: 0, key: TEX.folder }, false).setOrigin(0));
    cont.add(makeText(this, 3, -1, 'this week', { size: FONT.size.tiny, color: 'woodDark' }));
    cont.add(
      makeText(this, 40, 14, 'WEEKLY', { size: FONT.size.body, color: 'ink' }).setOrigin(0.5, 0),
    );
    cont.add(
      makeText(this, 40, 30, done ? 'closed' : wk, {
        size: FONT.size.tiny,
        color: done ? 'stampGreen' : 'woodDark',
      }).setOrigin(0.5, 0),
    );
    if (done) {
      const box = rect(this, 68, 18, 14, 14).setStrokeStyle(1, HEX.stampGreen).setOrigin(0.5);
      const t = makeText(this, 68, 18, 'ok', {
        size: FONT.size.tiny,
        color: 'stampGreen',
      }).setOrigin(0.5);
      cont.add([box, t]);
    }
    cont.setSize(DRAWER.folderW, DRAWER.folderH);
    cont.setInteractive(
      new Phaser.Geom.Rectangle(
        DRAWER.folderW / 2,
        DRAWER.folderH / 2,
        DRAWER.folderW,
        DRAWER.folderH,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    cont.on('pointerover', () => {
      audio.play('hover');
      this.hideTip();
      const w = 220;
      const tx = Phaser.Math.Clamp(at.x + DRAWER.folderW / 2 - w / 2, 8, GAME_WIDTH - w - 8);
      const ty = at.y + DRAWER.folderH + 8;
      const tip = this.add.container(0, 0).setDepth(DEPTH.toast);
      tip.add(rect(this, tx + 2, ty + 3, w, 34, HEX.bg, 0.5));
      tip.add(rect(this, tx, ty, w, 34, HEX.paper));
      [`The week's cold case (${wk}). Same file`, 'for everyone; compare on the board.'].forEach(
        (l, i) =>
          tip.add(
            makeText(this, tx + 6, ty + 5 + i * 12, l, {
              font: 'body',
              size: FONT.size.body,
              color: 'shadow',
            }),
          ),
      );
      this.tip = tip;
    });
    cont.on('pointerout', () => this.hideTip());
    cont.on('pointerdown', () => {
      audio.play('paper');
      startColdCase(this, seed);
    });
  }

  private open(i: number): void {
    if (!this.unlocked[i]) {
      audio.play('wrong');
      return;
    }
    gameState.mode = 'campaign';
    gameState.currentIndex = i;
    gameState.currentCase = gameState.cases[i];
    audio.play('paper');
    this.scene.start('InvestigationScene');
  }
}
