import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { HEX } from '@/config/palette';
import { audio } from '@/systems/audio';
import { pickDailyCaseId, localDateKey, currentStreak } from '@/systems/dailyCase';
import { gameState } from '@/systems/gameState';
import { rankForScore } from '@/systems/ranks';
import { saveStore } from '@/systems/save';
import { ButtonGroup } from '@/ui/ButtonGroup';
import { DeskBackground } from '@/ui/DeskBackground';
import { lucienSays } from '@/ui/DialogueBox';
import { PixelButton } from '@/ui/PixelButton';
import { addText } from '@/ui/text';
import { setupScene } from './sceneUtil';
import { toggleFullscreen } from '@/main';

export class TitleScene extends Phaser.Scene {
  static readonly KEY = 'TitleScene';
  private static seenIntro = false;

  constructor() {
    super(TitleScene.KEY);
  }

  create(): void {
    setupScene(this);
    const desk = new DeskBackground(this, { props: true, stamps: true });
    const save = saveStore.get();
    const reduced = save.settings.reducedMotion;

    // Title card: a sheet of paper under the lamp.
    const cardW = 300;
    const cardH = 232;
    const cx = Math.round((GAME_WIDTH - cardW) / 2);
    const cy = 58;
    const card = this.add.container(0, 0).setDepth(DEPTH.documents);
    const shadow = this.make
      .image({ x: cx + 4, y: cy + 5, key: TEX.paper }, false)
      .setOrigin(0)
      .setDisplaySize(cardW, cardH)
      .setTint(HEX.shadow)
      .setAlpha(0.6);
    const paper = this.make
      .image({ x: cx, y: cy, key: TEX.paper }, false)
      .setOrigin(0)
      .setDisplaySize(cardW, cardH);
    const clip = this.make.image({ x: cx + 16, y: cy - 6, key: TEX.paperclip }, false).setOrigin(0);
    const ring = this.make
      .image({ x: cx + cardW - 56, y: cy + 4, key: TEX.coffeeRing }, false)
      .setOrigin(0);
    card.add([shadow, paper, clip, ring]);

    const t = (x: number, y: number, str: string, opts: Parameters<typeof addText>[4]) => {
      const obj = addText(this, x, y, str, opts);
      this.children.remove(obj);
      card.add(obj);
      return obj;
    };
    t(GAME_WIDTH / 2, cy + 14, 'CASE FILE', { size: 10, color: 'paperShadow' }).setOrigin(0.5, 0);
    t(GAME_WIDTH / 2, cy + 26, 'RUG OR NOT?', { size: 32, color: 'shadow' }).setOrigin(0.5, 0);
    t(GAME_WIDTH / 2, cy + 62, 'a crypto detective story', {
      size: 16,
      color: 'ink',
      font: 'body',
    }).setOrigin(0.5, 0);

    // Stamp-like "confidential" mark.
    const mark = this.add
      .container(cx + cardW - 58, cy + 30)
      .setAngle(-12)
      .setAlpha(0.8);
    const r = this.add.rectangle(0, 0, 74, 16).setStrokeStyle(2, HEX.stampRed).setOrigin(0.5);
    const mt = addText(this, 0, 0, 'CONFIDENTIAL', { size: 10, color: 'stampRed' }).setOrigin(0.5);
    mark.add([r, mt]);
    this.children.remove(mark);
    card.add(mark);

    // Menu.
    const cases = gameState.cases;
    const dailyId = pickDailyCaseId(
      localDateKey(),
      cases.map((c) => c.id),
    );
    const dailyDone = save.daily.lastPlayed === localDateKey();
    const streak = currentStreak(save.daily, localDateKey());
    const nextIndex = Math.min(save.campaignUnlocked - 1, cases.length - 1);
    const allDone = Object.keys(save.caseResults).length >= cases.length;
    const bx = GAME_WIDTH / 2 - 62;
    let by = cy + 90;
    const mk = (label: string, fn: () => void) => {
      const b = new PixelButton(this, bx, by, label, fn, { width: 124 });
      this.children.remove(b);
      card.add(b);
      by += 23;
      return b;
    };
    const play = () => {
      gameState.mode = 'campaign';
      gameState.currentIndex = nextIndex;
      gameState.currentCase = cases[nextIndex];
      this.scene.start('InvestigationScene');
    };
    const buttons = [
      mk(
        allDone
          ? 'Play again'
          : save.campaignUnlocked > 1
            ? `Continue  (case ${nextIndex + 1})`
            : 'Play',
        () => (allDone ? this.scene.start('CaseSelectScene') : play()),
      ),
      mk(dailyDone ? 'Daily  (done)' : `Daily case${streak > 0 ? `  · ${streak}` : ''}`, () => {
        const c = cases.find((x) => x.id === dailyId);
        if (!c) return;
        gameState.mode = 'daily';
        gameState.currentCase = c;
        gameState.currentIndex = cases.indexOf(c);
        this.scene.start('InvestigationScene');
      }),
      mk('Case files', () => this.scene.start('CaseSelectScene')),
      mk('Notebook', () => this.scene.start('NotebookScene')),
      mk('Settings', () => this.scene.start('SettingsScene')),
    ];
    const group = new ButtonGroup(this, buttons, (i) => buttons[i].emit('pointerdown'));
    this.input.on('pointermove', () => group.clearFocus());

    const rank = rankForScore(save.totalScore);
    t(
      GAME_WIDTH / 2,
      cy + cardH - 26,
      `${rank}  ·  ${save.totalScore} pts  ·  ${Object.keys(save.caseResults).length}/${cases.length} cases`,
      {
        size: 12,
        color: 'woodMid',
        font: 'body',
      },
    ).setOrigin(0.5, 0);
    t(
      GAME_WIDTH / 2,
      cy + cardH - 12,
      'All cases are fictional. This is a game, not financial advice.',
      {
        size: 10,
        color: 'woodMid',
        font: 'body',
      },
    ).setOrigin(0.5, 0);

    // Corner chrome: fullscreen + version.
    const fs = new PixelButton(
      this,
      GAME_WIDTH - 96,
      GAME_HEIGHT - 24,
      'Fullscreen [F]',
      () => toggleFullscreen(),
      { variant: 'ink' },
    );
    fs.setDepth(DEPTH.hud).setX(GAME_WIDTH - fs.bw - 6);
    addText(this, 6, GAME_HEIGHT - 12, 'v0.2', { size: 8, color: 'woodLight' }).setDepth(DEPTH.hud);
    addText(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 12,
      'hover the coffee  ·  click the lamp  ·  pet the cat',
      { size: 8, color: 'woodLight' },
    )
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud);

    // Intro: lamp clicks on, the case file slides in. Only once per session.
    if (!TitleScene.seenIntro && !reduced) {
      TitleScene.seenIntro = true;
      desk.light.setVisible(false);
      card.setY(GAME_HEIGHT).setAlpha(0);
      this.time.delayedCall(450, () => {
        desk.light.setVisible(true);
        audio.play('click');
        this.tweens.add({
          targets: desk.light,
          alpha: { from: 0.3, to: 1 },
          duration: 260,
          ease: 'Sine.easeOut',
        });
      });
      this.time.delayedCall(700, () => {
        audio.play('slide');
        this.tweens.add({ targets: card, y: 0, alpha: 1, duration: 520, ease: 'Back.easeOut' });
      });
      this.time.delayedCall(1400, () => lucienSays(this, 'title-intro'));
    } else {
      TitleScene.seenIntro = true;
      lucienSays(this, 'title-intro');
    }
  }
}
