import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { DRAWER, FONT, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { HEX } from '@/config/palette';
import type { CaseData } from '@/data/schema';
import { audio } from '@/systems/audio';
import { gameState } from '@/systems/gameState';
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
    this.unlocked = cases.map((_c, i) => i < save.campaignUnlocked);
    cases.forEach((c, i) => {
      const col = i % DRAWER.cols;
      const row = Math.floor(i / DRAWER.cols);
      const fx = DRAWER.x + 18 + col * (DRAWER.folderW + DRAWER.gapX);
      const fy = DRAWER.y + 36 + row * (DRAWER.folderH + DRAWER.gapY);
      this.folders.push(
        this.makeFolder(c, i, fx, fy, this.unlocked[i], save.caseResults[c.id]?.bestGrade),
      );
    });

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
      makeText(this, 40, 30, unlocked ? c.title.slice(0, 15) : 'locked', {
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
            ? `best: ${best.bestScore} pts (${best.bestGrade})  ·  played ${best.completions}x`
            : 'not played yet',
        ]
      : wrapMono(`Locked. Close case #${i} to open this folder.`, maxChars);
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
