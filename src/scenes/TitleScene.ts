import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { DESK, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { GAME_VERSION } from '@/config/gameConfig';
import { HEX } from '@/config/palette';
import { audio } from '@/systems/audio';
import { dailyCaseFor, localDateKey, currentStreak } from '@/systems/dailyCase';
import { coldDifficultyFor, gameState, newColdSeed } from '@/systems/gameState';
import { solvedRegular, startColdCase, startDaily } from '@/systems/coldCase';
import { dailyPool, playableCases } from '@/systems/secretCase';
import { nextRankInfo, rankForScore } from '@/systems/ranks';
import { saveStore } from '@/systems/save';
import { ButtonGroup } from '@/ui/ButtonGroup';
import { DeskBackground } from '@/ui/DeskBackground';
import { DeskClock } from '@/ui/DeskClock';
import { lucienSays, lucienSaysNow } from '@/ui/DialogueBox';
import { StickyNote } from '@/ui/StickyNote';
import { StampMark } from '@/ui/Stamp';
import { floatText } from '@/ui/DeskBackground';
import { awardBadge, badgeCount, checkAggregateBadges } from '@/systems/badges';
import { LUCIEN_TEX } from '@/ui/DialogueBox';
import { LucienBubble } from '@/ui/LucienBubble';
import { squish } from '@/ui/squish';
import { toast } from '@/ui/Toast';
import { DIALOGUE } from '@/config/layout';
import { LUCIEN_QUIPS, WHATS_NEW } from '@/data/dialogue';
import { FLAGS, isFlagId } from '@/data/flags';
import { PixelButton } from '@/ui/PixelButton';
import { confetti } from '@/ui/confetti';
import { addText } from '@/ui/text';
import { setupScene } from './sceneUtil';
import { toggleFullscreen } from '@/main';

/** Whole hours until the next daily case (local midnight), never less than one. */
function hoursToMidnight(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / 3_600_000));
}

/** Extra title quips for the hour of the night (or day) the player is actually in. */
function timeQuips(hour: number): string[] {
  if (hour >= 1 && hour < 5)
    return [
      `${hour} in the morning. The tokens don't sleep either.`,
      'Nobody launches anything honest at this hour. Nobody reads anything either.',
    ];
  if (hour >= 5 && hour < 9) return ['Early. The rugs from last night are still warm.'];
  if (hour >= 12 && hour < 14) return ['Lunch is a concept. The coffee is real.'];
  if (hour >= 22 || hour === 0) return ['Late. Good. The night shift sees the good ones.'];
  return [];
}

export class TitleScene extends Phaser.Scene {
  static readonly KEY = 'TitleScene';
  private static seenIntro = false;

  constructor() {
    super(TitleScene.KEY);
  }

  /** Typed words, the Konami code, and other nonsense. */
  private bindEasterEggs(
    cx: number,
    cy: number,
    cardW: number,
    cardH: number,
    desk: DeskBackground,
  ): void {
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
        confetti(this);
        awardBadge(this, 'cheater');
        lucienSaysNow(this, 'konami');
        return;
      }
      if (e.key.length !== 1) return;
      typed = (typed + e.key.toLowerCase()).slice(-8);
      this.registry.set('typedAt', Date.now());
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
      } else if (typed.endsWith('biscuit')) {
        desk.petCat();
        LucienBubble.say(this, 'She knows her name. She just does not care.', 3000);
        typed = '';
      } else if (typed.endsWith('train')) {
        desk.train();
        audio.play('slide');
        typed = '';
      } else if (typed.endsWith('plane')) {
        desk.plane();
        floatText(this, DESK.window.x + 40, 14, 'red-eye to somewhere');
        typed = '';
      } else if (typed.endsWith('tailor')) {
        audio.play('tick');
        LucienBubble.say(this, "Don't say that name in here. He has people in the chats.", 4200);
        typed = '';
      } else if (typed.endsWith('safe')) {
        LucienBubble.say(this, 'Three digits. The radio knows them. So does the notebook.', 4000);
        typed = '';
      }
    });
  }

  create(): void {
    setupScene(this);
    const desk = new DeskBackground(this, { props: true, stamps: true });
    const save = saveStore.get();
    const reduced = save.settings.reducedMotion;

    // Title card: a sheet of paper under the lamp.
    const cardW = 300;
    const cardH = 262;
    const cx = Math.round((GAME_WIDTH - cardW) / 2);
    const cy = 56;
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
    const daily = dailyCaseFor(localDateKey(), cases, dailyPool(cases));
    const dailyDone = save.daily.lastPlayed === localDateKey();
    const streak = currentStreak(save.daily, localDateKey());
    // The secret file sits at the end; "Continue" never walks into it while it's locked.
    const playable = playableCases(save, cases);
    const nextIndex = Math.min(save.campaignUnlocked - 1, playable.length - 1);
    const allDone = playable.every((c) => save.caseResults[c.id]);
    const bx = GAME_WIDTH / 2 - 75;
    let by = cy + 90;
    const mk = (label: string, fn: () => void, half: 'left' | 'right' | null = null) => {
      const b = new PixelButton(this, half === 'right' ? bx + 77 : bx, by, label, fn, {
        width: half ? 73 : 150,
      });
      this.children.remove(b);
      card.add(b);
      if (half !== 'left') by += 23;
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
          ? `Daily done  ·  next in ${hoursToMidnight()}h`
          : `Daily ${daily?.ticker ?? 'case'}${streak > 0 ? ` · ${streak}` : ''}`,
        () => {
          if (!daily) return;
          startDaily(this, daily);
        },
      ),
      mk('Case files', () => this.scene.start('CaseSelectScene')),
      mk('Red Flag Rush', () => this.scene.start('RushScene')),
      mk('Cold case', () => startColdCase(this, newColdSeed(coldDifficultyFor(solvedRegular())))),
      mk('Notebook', () => this.scene.start('NotebookScene'), 'left'),
      mk('Settings', () => this.scene.start('SettingsScene'), 'right'),
    ];
    const group = new ButtonGroup(this, buttons, (i) => buttons[i].emit('pointerdown'));
    this.input.on('pointermove', () => group.clearFocus());

    checkAggregateBadges(this);
    const badges = badgeCount();
    const rank = rankForScore(save.totalScore);
    const next = nextRankInfo(save.totalScore);
    t(
      GAME_WIDTH / 2,
      cy + cardH - 38,
      `${rank}  ·  ${save.totalScore} pts${next ? `  ·  ${next.remaining} to ${next.rank}` : ''}`,
      { size: 12, color: 'woodMid', font: 'body' },
    ).setOrigin(0.5, 0);
    t(
      GAME_WIDTH / 2,
      cy + cardH - 26,
      `${Object.keys(save.caseResults).length}/${cases.length} cases  ·  ${badges.earned}/${badges.total} badges  ·  ${save.stats.coldRuns} cold`,
      { size: 12, color: 'woodMid', font: 'body' },
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
    const version = addText(this, 6, GAME_HEIGHT - 12, GAME_VERSION, {
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
    this.bindEasterEggs(cx, cy, cardW, cardH, desk);

    // The desk clock keeps real time between cases. Click it for the hour's mood.
    const clock = new DeskClock(this);
    clock.setDepth(DEPTH.deskProps);
    clock.setRealTime();
    clock.setInteractive(new Phaser.Geom.Rectangle(0, 0, 30, 34), Phaser.Geom.Rectangle.Contains);
    clock.on('pointerdown', () => {
      audio.play('tick');
      const h = new Date().getHours();
      const line =
        h < 5
          ? 'far too late'
          : h < 9
            ? 'far too early'
            : h < 12
              ? 'morning shift'
              : h < 18
                ? 'daylight. suspicious.'
                : h < 22
                  ? 'evening. proper.'
                  : 'night shift';
      floatText(this, DESK.clock.x + 15, DESK.clock.y - 4, line);
    });

    // Lucien hangs around the desk; poke him for a quip.
    const m = DIALOGUE.mascot;
    const idle = this.add.image(m.x, m.y, LUCIEN_TEX).setOrigin(0, 1).setDepth(DEPTH.hud);
    idle.setDisplaySize(Math.round(idle.width * (m.height / idle.height)), m.height);
    idle.setInteractive({ useHandCursor: false });
    // The clock on the wall is real: a few quips know what time it is.
    const quips = [...LUCIEN_QUIPS, ...timeQuips(new Date().getHours())];
    let quip = Phaser.Math.Between(0, quips.length - 1);
    idle.on('pointerdown', () => {
      quip = (quip + 1) % quips.length;
      LucienBubble.say(this, quips[quip], 3600);
      if (!reduced) squish(this, idle);
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
    this.events.off('radio:tune');
    this.events.on('dialogue:open', () => idle.setVisible(false));
    this.events.on('dialogue:close', () => idle.setVisible(true));
    // He has opinions about the radio.
    const radioLines: Record<string, string> = {
      jazz: "Late jazz. Now we're working.",
      static: 'Leave it there a minute. Listen.',
      off: 'Silence. Also fine.',
      lofi: 'Back to the usual. Good.',
    };
    this.events.on('radio:tune', (station: string) => {
      if (!idle.visible) return;
      LucienBubble.say(this, radioLines[station] ?? '...', 2600);
    });
    // Idle business: every so often he glances at the window or bounces on his heels.
    const fidget = () => {
      this.time.delayedCall(Phaser.Math.Between(12000, 28000), () => {
        if (!this.scene.isActive()) return;
        if (idle.visible && !reduced) {
          // A mirrored detective reads as a glitch (the hat and the coin swap sides), so
          // he bounces on his heels instead of turning around.
          if (Math.random() < 0.5) {
            squish(this, idle, 1.04, 0.92, 320);
          } else {
            // The bob tween owns y, so wobble instead of hopping.
            this.tweens.add({
              targets: idle,
              angle: { from: -4, to: 4 },
              duration: 140,
              yoyo: true,
              repeat: 2,
              ease: 'Sine.easeInOut',
              onComplete: () => idle.setAngle(0),
            });
          }
        }
        fidget();
      });
    };
    fidget();
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
      this.time.delayedCall(1400, () => this.greet(streak, dailyDone));
    } else {
      TitleScene.seenIntro = true;
      this.greet(streak, dailyDone);
    }
  }

  private static nagged = false;

  /** Lucien's intro the first time; after that, what's new, or a word about a streak at risk. */
  private greet(streak: number, dailyDone: boolean): void {
    if (lucienSays(this, 'title-intro')) return;
    // Back from the first case: a quick tour of what else is on the desk.
    if (saveStore.get().stats.runs >= 1 && lucienSays(this, 'desk-tour')) return;
    // Returning players get a one-line tour of the update; new saves just note the version.
    const seen = saveStore.get().lastSeenVersion;
    if (seen !== GAME_VERSION) {
      saveStore.update((d) => (d.lastSeenVersion = GAME_VERSION));
      const note = WHATS_NEW[GAME_VERSION];
      if (seen && note) {
        this.time.delayedCall(600, () => {
          if (!this.scene.isActive()) return;
          toast(this, 'NEW TONIGHT', GAME_VERSION);
          LucienBubble.say(this, note, 6500);
        });
        return;
      }
    }
    if (TitleScene.nagged) return;
    TitleScene.nagged = true;
    const line = this.streakLine(streak, dailyDone) ?? this.drillLine();
    if (line)
      this.time.delayedCall(600, () => this.scene.isActive() && LucienBubble.say(this, line, 4800));
  }

  private streakLine(streak: number, dailyDone: boolean): string | null {
    if (dailyDone || streak <= 0) return null;
    return streak >= 7
      ? `${streak} nights running. The night shift would notice if you skipped one.`
      : streak >= 3
        ? `${streak} nights in a row. Don't break the chain tonight.`
        : `${streak === 1 ? 'One night' : 'Two nights'} on the books. Tonight's file is waiting on the phone.`;
  }

  /** The flag you miss most, if it has been missed more than found and never drilled. */
  private drillLine(): string | null {
    const st = saveStore.get().stats;
    const worst = Object.entries(st.flagMisses)
      .filter(([id, n]) => n >= 2 && n > (st.flagHits[id] ?? 0) && !st.drilled.includes(id))
      .sort((a, b) => b[1] - a[1])[0];
    if (!worst || !isFlagId(worst[0])) return null;
    return `"${FLAGS[worst[0]].title}" keeps getting past you. There's a drill for it in the notebook.`;
  }
}
