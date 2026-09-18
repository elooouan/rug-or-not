import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { DESK, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { HEX } from '@/config/palette';
import { audio } from '@/systems/audio';
import { pickDailyCaseId, localDateKey, currentStreak } from '@/systems/dailyCase';
import { gameState } from '@/systems/gameState';
import { rankForScore } from '@/systems/ranks';
import { saveStore } from '@/systems/save';
import { ButtonGroup } from '@/ui/ButtonGroup';
import { DeskBackground } from '@/ui/DeskBackground';
import { lucienSays, lucienSaysNow } from '@/ui/DialogueBox';
import { StickyNote } from '@/ui/StickyNote';
import { StampMark } from '@/ui/Stamp';
import { floatText } from '@/ui/DeskBackground';
import { awardBadge, badgeCount, checkAggregateBadges } from '@/systems/badges';
import { LUCIEN_TEX } from '@/ui/DialogueBox';
import { LucienBubble } from '@/ui/LucienBubble';
import { DIALOGUE } from '@/config/layout';
import { LUCIEN_QUIPS } from '@/data/dialogue';
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

  /** Typed words, the Konami code, and other nonsense. */
  private bindEasterEggs(cx: number, cy: number, cardW: number, cardH: number): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    let typed = '';
    const konami = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a',
    ];
    let konamiAt = 0;
    kb.on('keydown', (e: KeyboardEvent) => {
      // Konami.
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      konamiAt = k === konami[konamiAt] ? konamiAt + 1 : k === konami[0] ? 1 : 0;
      if (konamiAt === konami.length) {
        konamiAt = 0;
        this.confetti();
        awardBadge(this, 'cheater');
        lucienSaysNow(this, 'konami');
        return;
      }
      if (e.key.length !== 1) return;
      typed = (typed + e.key.toLowerCase()).slice(-8);
      const stampAt = (verdict: 'rug' | 'legit') => {
        const m = new StampMark(this, verdict, verdict === 'rug' ? 'stampRed' : 'stampGreen');
        m.setPosition(
          cx + Phaser.Math.Between(60, cardW - 60),
          cy + Phaser.Math.Between(30, cardH - 30),
        ).setDepth(DEPTH.pins);
        audio.play('stamp');
        if (!saveStore.get().settings.reducedMotion) this.cameras.main.shake(100, 0.004);
        this.tweens.add({
          targets: m,
          alpha: 0,
          delay: 2500,
          duration: 600,
          onComplete: () => m.destroy(),
        });
        typed = '';
      };
      if (typed.endsWith('rug')) stampAt('rug');
      else if (typed.endsWith('legit')) stampAt('legit');
      else if (typed.endsWith('cat')) {
        audio.play('meow');
        floatText(this, 488, 24, 'mrrp?');
        typed = '';
      } else if (typed.endsWith('lucien')) {
        lucienSaysNow(this, 'title-intro');
        typed = '';
      } else if (typed.endsWith('wagmi')) {
        LucienBubble.say(
          this,
          'We are all going to make... a careful decision after reading the audit.',
          4200,
        );
        typed = '';
      } else if (typed.endsWith('moon')) {
        audio.play('unlock');
        floatText(this, DESK.window.x + DESK.window.w - 60, 14, 'to the moon (and back, usually)');
        typed = '';
      } else if (typed.endsWith('wen')) {
        LucienBubble.say(this, 'Wen? When you have read the tokenomics.', 3600);
        typed = '';
      } else if (typed.endsWith('gm')) {
        LucienBubble.say(this, 'gm. Now read the contract.', 3000);
        typed = '';
      }
    });
  }

  private confetti(): void {
    audio.play('unlock');
    const emitter = this.add.particles(GAME_WIDTH / 2, -4, TEX.pixel, {
      x: { min: -GAME_WIDTH / 2, max: GAME_WIDTH / 2 },
      speedY: { min: 40, max: 90 },
      speedX: { min: -20, max: 20 },
      lifespan: 4000,
      quantity: 2,
      frequency: 30,
      scale: { min: 0.8, max: 1.6 },
      rotate: { start: 0, end: 360 },
      tint: [HEX.amber, HEX.stampRed, HEX.stampGreen, HEX.paper, HEX.ink],
      gravityY: 20,
    });
    emitter.setDepth(DEPTH.toast);
    this.time.delayedCall(3000, () => emitter.stop());
    this.time.delayedCall(7500, () => emitter.destroy());
  }

  create(): void {
    setupScene(this);
    const desk = new DeskBackground(this, { props: true, stamps: true });
    const save = saveStore.get();
    const reduced = save.settings.reducedMotion;

    // Title card: a sheet of paper under the lamp.
    const cardW = 300;
    const cardH = 255;
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
    const title = t(GAME_WIDTH / 2, cy + 26, 'RUG OR NOT?', {
      size: 32,
      color: 'shadow',
    }).setOrigin(0.5, 0);
    title.setInteractive({ useHandCursor: false });
    title.on('pointerdown', () => {
      const flipped = title.text !== 'RUG OR NOT?';
      title.setText(flipped ? 'RUG OR NOT?' : 'NOT OR RUG?');
      audio.play(flipped ? 'correct' : 'wrong');
    });
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
    r.setInteractive({ useHandCursor: false });
    r.on('pointerdown', () => {
      audio.play('hover');
      floatText(this, cx + cardW - 58, cy + 22, 'shh.');
    });

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
      mk(
        dailyDone
          ? `Daily ${cases.find((x) => x.id === dailyId)?.ticker ?? ''} (done)`
          : `Daily ${cases.find((x) => x.id === dailyId)?.ticker ?? 'case'}${streak > 0 ? ` · ${streak}` : ''}`,
        () => {
          const c = cases.find((x) => x.id === dailyId);
          if (!c) return;
          gameState.mode = 'daily';
          gameState.currentCase = c;
          gameState.currentIndex = cases.indexOf(c);
          this.scene.start('InvestigationScene');
        },
      ),
      mk('Case files', () => this.scene.start('CaseSelectScene')),
      mk('Red Flag Rush', () => this.scene.start('RushScene')),
      mk('Notebook', () => this.scene.start('NotebookScene')),
      mk('Settings', () => this.scene.start('SettingsScene')),
    ];
    const group = new ButtonGroup(this, buttons, (i) => buttons[i].emit('pointerdown'));
    this.input.on('pointermove', () => group.clearFocus());

    checkAggregateBadges(this);
    const badges = badgeCount();
    const rank = rankForScore(save.totalScore);
    t(
      GAME_WIDTH / 2,
      cy + cardH - 26,
      `${rank}  ·  ${save.totalScore} pts  ·  ${Object.keys(save.caseResults).length}/${cases.length} cases  ·  ${badges.earned}/${badges.total} badges`,
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
    const version = addText(this, 6, GAME_HEIGHT - 12, 'v0.5', {
      size: 8,
      color: 'woodLight',
    }).setDepth(DEPTH.hud);
    version.setInteractive({ useHandCursor: false });
    let versionClicks = 0;
    version.on('pointerdown', () => {
      versionClicks++;
      if (versionClicks % 5 === 0) {
        new StickyNote(
          this,
          12,
          GAME_HEIGHT - 150,
          'credits',
          'Rug or Not? A pixel-noir detective game. Mascot: Detective Lucien. Fonts: Pixelify Sans and VT323 (OFL). Engine: Phaser 3. Biscuit the cat: unpaid.',
          240,
        );
      } else audio.play('hover');
    });
    this.bindEasterEggs(cx, cy, cardW, cardH);

    // Lucien hangs around the desk; poke him for a quip.
    const m = DIALOGUE.mascot;
    const idle = this.add.image(m.x, m.y, LUCIEN_TEX).setOrigin(0, 1).setDepth(DEPTH.hud);
    idle.setDisplaySize(Math.round(idle.width * (m.height / idle.height)), m.height);
    idle.setInteractive({ useHandCursor: false });
    let quip = Phaser.Math.Between(0, LUCIEN_QUIPS.length - 1);
    idle.on('pointerdown', () => {
      quip = (quip + 1) % LUCIEN_QUIPS.length;
      LucienBubble.say(this, LUCIEN_QUIPS[quip], 3600);
      if (!reduced) {
        idle.setScale(idle.scaleX * 1.06, idle.scaleY * 0.94);
        this.tweens.add({
          targets: idle,
          scaleX: idle.scaleX / 1.06,
          scaleY: idle.scaleY / 0.94,
          duration: 220,
          ease: 'Back.easeOut',
        });
      }
    });
    if (!reduced)
      this.tweens.add({
        targets: idle,
        y: m.y - 2,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    // The dialogue box draws its own Lucien in the same spot; don't show two.
    this.events.off('dialogue:open');
    this.events.off('dialogue:close');
    this.events.on('dialogue:open', () => idle.setVisible(false));
    this.events.on('dialogue:close', () => idle.setVisible(true));
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
    // Skip the animated intro when the tab is in the background: timers would stall mid-way.
    if (!TitleScene.seenIntro && !reduced && !document.hidden) {
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
