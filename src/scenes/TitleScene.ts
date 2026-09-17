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
import { PixelButton } from '@/ui/PixelButton';
import { addText } from '@/ui/text';

export class TitleScene extends Phaser.Scene {
  static readonly KEY = 'TitleScene';

  constructor() {
    super(TitleScene.KEY);
  }

  create(): void {
    new DeskBackground(this, { props: true, stamps: true });
    const save = saveStore.get();

    // Title card: a sheet of paper under the lamp.
    const cardW = 300;
    const cardH = 236;
    const cx = Math.round((GAME_WIDTH - cardW) / 2);
    const cy = 52;
    this.add
      .image(cx + 4, cy + 5, TEX.paper)
      .setOrigin(0)
      .setDisplaySize(cardW, cardH)
      .setTint(HEX.shadow)
      .setAlpha(0.6)
      .setDepth(DEPTH.documents);
    this.add
      .image(cx, cy, TEX.paper)
      .setOrigin(0)
      .setDisplaySize(cardW, cardH)
      .setDepth(DEPTH.documents)
      .setAngle(0);
    this.add
      .image(cx + 16, cy - 6, TEX.paperclip)
      .setOrigin(0)
      .setDepth(DEPTH.pins);
    this.add
      .image(cx + cardW - 56, cy + 4, TEX.coffeeRing)
      .setOrigin(0)
      .setDepth(DEPTH.pins);

    addText(this, GAME_WIDTH / 2, cy + 16, 'CASE FILE', {
      size: 10,
      color: 'paperShadow',
      font: 'ui',
    })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.pins);
    addText(this, GAME_WIDTH / 2, cy + 28, 'RUG OR NOT?', { size: 32, color: 'shadow', font: 'ui' })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.pins);
    addText(this, GAME_WIDTH / 2, cy + 64, 'a crypto detective story', {
      size: 16,
      color: 'ink',
      font: 'body',
    })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.pins);

    // Stamp-like "confidential" mark.
    const mark = this.add
      .container(cx + cardW - 58, cy + 30)
      .setDepth(DEPTH.pins)
      .setAngle(-12)
      .setAlpha(0.8);
    const r = this.add.rectangle(0, 0, 74, 16).setStrokeStyle(2, HEX.stampRed).setOrigin(0.5);
    const t = addText(this, 0, 0, 'CONFIDENTIAL', { size: 10, color: 'stampRed' }).setOrigin(0.5);
    mark.add([r, t]);

    // Menu.
    const dailyId = pickDailyCaseId(
      localDateKey(),
      gameState.cases.map((c) => c.id),
    );
    const dailyDone = save.daily.lastPlayed === localDateKey();
    const streak = currentStreak(save.daily, localDateKey());
    const bx = GAME_WIDTH / 2 - 60;
    let by = cy + 92;
    const mk = (label: string, fn: () => void, hotkey?: string) => {
      const b = new PixelButton(this, bx, by, label, fn, { width: 120, hotkey });
      b.setDepth(DEPTH.pins);
      by += 24;
      return b;
    };
    const buttons = [
      mk('Start', () => this.scene.start('CaseSelectScene')),
      mk(dailyDone ? 'Daily (done)' : 'Daily Case', () => {
        const c = gameState.cases.find((x) => x.id === dailyId);
        if (!c) return;
        gameState.mode = 'daily';
        gameState.currentCase = c;
        gameState.currentIndex = gameState.cases.indexOf(c);
        this.scene.start('InvestigationScene');
      }),
      mk('Notebook', () => this.scene.start('NotebookScene')),
      mk('Settings', () => this.scene.start('SettingsScene')),
    ];
    const group = new ButtonGroup(this, buttons, (i) => buttons[i].emit('pointerdown'));
    this.input.on('pointermove', () => group.clearFocus());

    const rank = rankForScore(save.totalScore);
    addText(
      this,
      GAME_WIDTH / 2,
      cy + cardH - 46,
      `${rank}  ·  ${save.totalScore} pts${streak > 0 ? `  ·  streak ${streak}` : ''}`,
      {
        size: 12,
        color: 'woodMid',
        font: 'body',
      },
    )
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.pins);
    addText(
      this,
      GAME_WIDTH / 2,
      cy + cardH - 30,
      'All cases are fictional.\nThis is a game, not financial advice.',
      {
        size: 12,
        font: 'body',
        color: 'woodMid',
        align: 'center',
      },
    )
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.pins);

    addText(this, GAME_WIDTH - 6, GAME_HEIGHT - 12, 'v0.1', { size: 8, color: 'woodLight' })
      .setOrigin(1, 0)
      .setDepth(DEPTH.hud);
    this.input.once('pointerdown', () => audio.play('paper'));
  }
}
