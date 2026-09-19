import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { HEX, PALETTE } from '@/config/palette';
import type { UnlockCategory } from '@/data/unlockables';
import { audio } from '@/systems/audio';
import { exportSave, importSave, saveStore, type CosmeticSelection } from '@/systems/save';
import { toast } from '@/ui/Toast';
import type { Settings } from '@/systems/settings';
import { applyCosmetics } from '@/systems/cosmetics';
import { applyWeatherAudio } from '@/systems/weather';
import { WEATHERS, WEATHER_LABEL } from '@/systems/settings';
import { byCategory, contextFromSave, describeSource, isUnlocked } from '@/systems/unlocks';
import { DeskBackground } from '@/ui/DeskBackground';
import { lucienSays } from '@/ui/DialogueBox';
import { resetHints } from '@/systems/hints';
import { PixelButton } from '@/ui/PixelButton';
import { LucienBubble } from '@/ui/LucienBubble';
import { awardBadge, noteSeen } from '@/systems/badges';
import { addText } from '@/ui/text';
import { backChip, goTo, setupScene } from './sceneUtil';
import { currentTheme, THEME_IDS, THEMES, type ThemeId } from '@/config/palette';
import { syncTheme } from '@/systems/theme';

interface SettingsInit {
  overlay?: boolean;
  returnTo?: string;
  tab?: SettingsTab;
}

interface RowDef {
  label: string;
  value: () => string;
  change: (dir: number) => void;
  hint?: () => string;
  /** Which page of the settings the row sits on (default: game). */
  tab?: SettingsTab;
}

type SettingsTab = 'game' | 'office';
const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'game', label: 'Game' },
  { id: 'office', label: 'Office' },
];

const CARD = { x: 150, y: 6, w: 340, h: 348, pad: 10, rowH: 14 } as const;

/** A word from the detective on each coat of paint. */
const THEME_QUIPS: Record<ThemeId, string> = {
  noir: 'Back to noir. The coffee tastes right again.',
  sepia: 'Old file. Smells like a basement archive. I like basements.',
  midnight: 'Blue hour. Every case looks colder in this light.',
  newsprint: 'Newsprint. Now the whole office looks like evidence.',
  speakeasy: 'Speakeasy green. Do not ask what is behind the bookshelf.',
};

/** Volume, modes, accessibility, cosmetics and reset. Works standalone or as a pause overlay. */
export class SettingsScene extends Phaser.Scene {
  static readonly KEY = 'SettingsScene';
  private overlay = false;
  private returnTo = 'TitleScene';
  private rows: RowDef[] = [];
  private rowTexts: {
    label: Phaser.GameObjects.Text;
    value: Phaser.GameObjects.Text;
    ring: Phaser.GameObjects.Rectangle;
  }[] = [];
  private selected = 0;
  private confirmReset = false;
  private hintText!: Phaser.GameObjects.Text;
  private cosmeticsDirty = false;
  /** Row to land on after a theme change restarts the page. */
  private static reselect = -1;
  /** Theme just picked, so the restarted page can let Lucien react. */
  private static justThemed: ThemeId | null = null;

  constructor() {
    super(SettingsScene.KEY);
  }

  private tab: SettingsTab = 'game';

  init(data: SettingsInit): void {
    this.overlay = !!data?.overlay;
    this.returnTo = data?.returnTo ?? 'TitleScene';
    this.tab = data?.tab ?? 'game';
  }

  create(): void {
    setupScene(this);
    if (!this.overlay) syncTheme(this);
    this.confirmReset = false;
    this.cosmeticsDirty = false;
    this.rows = [];
    this.rowTexts = [];
    if (this.overlay) {
      this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, HEX.bg, 0.7).setOrigin(0).setInteractive();
    } else {
      new DeskBackground(this, { props: false, stamps: false });
    }
    const { x, y, w, h, pad } = CARD;
    this.add
      .image(x + 4, y + 5, TEX.paper)
      .setOrigin(0)
      .setDisplaySize(w, h)
      .setTint(HEX.bg)
      .setAlpha(0.55)
      .setDepth(DEPTH.documents);
    this.add.image(x, y, TEX.paper).setOrigin(0).setDisplaySize(w, h).setDepth(DEPTH.documents);
    addText(this, x + pad, y + pad - 4, 'SETTINGS', { size: FONT.size.heading, color: 'shadow' })
      .setOrigin(0, 0)
      .setDepth(DEPTH.pins);
    // Two pages: how the game plays, and how the office looks (plus the save's own rows).
    TABS.forEach((t, i) => {
      const b = new PixelButton(
        this,
        x + w - pad - (TABS.length - i) * 62,
        y + pad - 6,
        t.label,
        () => {
          if (t.id === this.tab) return;
          audio.play('paper');
          this.scene.restart({ overlay: this.overlay, returnTo: this.returnTo, tab: t.id });
        },
        { width: 58, variant: t.id === this.tab ? 'ink' : 'paper' },
      );
      b.setDepth(DEPTH.hud);
    });

    const set = (fn: (s: Settings) => void) => {
      saveStore.update((d) => fn(d.settings));
      const s = saveStore.get().settings;
      audio.setVolume(s.volume);
      applyWeatherAudio(s.weather);
      audio.setMusic(s.music);
      audio.setMusicVolume(s.musicVolume);
      // Turning the music on from here tunes the desk radio off the static.
      if (s.music) audio.setStatic(false);
      this.refresh();
    };
    const s = () => saveStore.get().settings;
    const onOff = (v: boolean) => (v ? 'on' : 'off');
    this.rows.push({
      label: 'Master volume',
      value: () => (audio.isMuted ? 'muted (M)' : `${Math.round(s().volume * 10) * 10}%`),
      change: (d) => {
        // Touching the volume while the quick mute is on is a request to hear something.
        if (audio.isMuted) audio.toggleMute();
        set((st) => (st.volume = Phaser.Math.Clamp(Math.round(st.volume * 10 + d) / 10, 0, 1)));
      },
      hint: () => 'everything: clicks, stamps, the radio. M is a quick mute anywhere.',
    });
    this.rows.push({
      label: 'Relaxed mode (no timers)',
      value: () => onOff(s().relaxed),
      change: () => set((st) => (st.relaxed = !st.relaxed)),
      hint: () => 'no clock on files (and no time bonus); the rush keeps its sixty seconds',
    });
    this.rows.push({
      label: 'Printer difficulty',
      value: () => (s().coldDifficulty > 0 ? `${s().coldDifficulty} of 5` : 'auto'),
      change: (d) => set((st) => (st.coldDifficulty = (st.coldDifficulty + d + 6) % 6)),
      hint: () =>
        'how hard the cold cases come off the printer; auto grows with the campaign files you close',
    });
    this.rows.push({
      label: 'Reduced motion',
      value: () => onOff(s().reducedMotion),
      change: () => set((st) => (st.reducedMotion = !st.reducedMotion)),
      hint: () => 'disables screen shake, flicker, steam and slide-ins',
    });
    this.rows.push({
      label: 'Lamp flicker',
      tab: 'office',
      value: () => onOff(s().lampFlicker),
      change: () => set((st) => (st.lampFlicker = !st.lampFlicker)),
      hint: () => 'the lamp wavers now and then (off with reduced motion)',
    });
    this.rows.push({
      label: "Detective's honour",
      value: () => onOff(s().hardMode),
      change: () => set((st) => (st.hardMode = !st.hardMode)),
      hint: () => 'hard mode: no nudges, no examined counter, no hover highlights. Scores x1.25.',
    });
    this.rows.push({
      label: "Lucien's hints",
      value: () => onOff(s().hints),
      change: () => set((st) => (st.hints = !st.hints)),
      hint: () => 'once-only guidance from the detective; "Replay hints" shows them again',
    });
    this.rows.push({
      label: "Lucien's remarks",
      value: () => onOff(s().quips),
      change: () => set((st) => (st.quips = !st.quips)),
      hint: () => 'the corner bubbles: reactions, reading tips, radio reviews. Hints stay on.',
    });
    this.rows.push({
      label: 'Replay hints',
      value: () => '...',
      change: () => {
        resetHints();
        audio.play('unlock');
        this.refresh();
      },
    });
    this.rows.push({
      label: 'Music (the radio)',
      value: () => onOff(s().music),
      change: () => set((st) => (st.music = !st.music)),
      hint: () => 'the desk radio: lo-fi, static, or off. Its dial does the same.',
    });
    this.rows.push({
      label: 'Music volume',
      value: () => `${Math.round(s().musicVolume * 10) * 10}%`,
      change: (d) =>
        set(
          (st) =>
            (st.musicVolume = Phaser.Math.Clamp(Math.round(st.musicVolume * 10 + d) / 10, 0, 1)),
        ),
    });
    this.rows.push({
      label: 'Pointer size',
      value: () => (s().bigPointer ? 'large' : 'normal'),
      change: () => {
        set((st) => (st.bigPointer = !st.bigPointer));
        (this.scene.get('CursorScene') as { refreshPointer?: () => void }).refreshPointer?.();
      },
      hint: () => 'half again as big, for large or far-away screens',
    });
    this.rows.push({
      label: 'Office colours',
      tab: 'office',
      value: () => THEMES[s().theme].name,
      change: (d) => {
        set(
          (st) =>
            (st.theme =
              THEME_IDS[(THEME_IDS.indexOf(st.theme) + d + THEME_IDS.length) % THEME_IDS.length]),
        );
        // Redraw everything in the new colours: this page restarts and repaints in its
        // create() once the old desk is gone. Over a paused file the desk underneath still
        // holds the old textures, so that case waits for the title.
        if (this.overlay) return;
        SettingsScene.reselect = this.selected;
        SettingsScene.justThemed = s().theme;
        noteSeen('themesSeen', s().theme);
        this.scene.restart({ overlay: this.overlay, returnTo: this.returnTo, tab: this.tab });
      },
      hint: () =>
        this.overlay && s().theme !== currentTheme() ? 'repainted once this file is closed' : '',
    });
    this.rows.push({
      label: 'Film grain',
      tab: 'office',
      value: () => onOff(s().grain),
      change: () => set((st) => (st.grain = !st.grain)),
      hint: () => 'a faint crawl of specks over the office; takes effect on the next screen',
    });
    this.rows.push({
      label: 'Weather outside',
      tab: 'office',
      value: () => WEATHER_LABEL[s().weather],
      change: (d) =>
        set(
          (st) =>
            (st.weather =
              WEATHERS[(WEATHERS.indexOf(st.weather) + d + WEATHERS.length) % WEATHERS.length]),
        ),
      hint: () => 'you can also click the window',
    });
    this.rows.push({
      label: 'No-magnifier mode',
      value: () => onOff(s().noMagnifier),
      change: () => set((st) => (st.noMagnifier = !st.noMagnifier)),
      hint: () => 'fine print is shown at normal size with a dotted underline',
    });
    if (!this.overlay) {
      const cosmetic = (label: string, category: UnlockCategory, key: keyof CosmeticSelection) => {
        const list = byCategory(category);
        this.rows.push({
          label,
          tab: 'office',
          value: () =>
            list.find((u) => u.id === saveStore.get().cosmetics[key])?.name ?? list[0].name,
          change: (d) => {
            const ctx = contextFromSave(saveStore.get());
            const cur = list.findIndex((u) => u.id === saveStore.get().cosmetics[key]);
            let next = cur;
            for (let i = 0; i < list.length; i++) {
              next = (next + d + list.length) % list.length;
              if (isUnlocked(list[next], ctx)) break;
            }
            if (!isUnlocked(list[next], ctx)) return;
            saveStore.update((sv) => (sv.cosmetics[key] = list[next].id));
            this.cosmeticsDirty = true;
            this.refresh();
          },
          hint: () => {
            const ctx = contextFromSave(saveStore.get());
            const locked = list.filter((u) => !isUnlocked(u, ctx));
            return locked.length
              ? `locked: ${locked.map((u) => `${u.name} (${describeSource(u.source)})`).join(', ')}`
              : 'all unlocked';
          },
        });
      };
      cosmetic('Desk wood', 'desk', 'desk');
      cosmetic('Lamp shade', 'lamp', 'lamp');
      cosmetic('Magnifier rim', 'rim', 'rim');
      cosmetic('Stamp ink', 'ink', 'ink');
    }
    if (!this.overlay) {
      this.rows.push({
        label: 'Export progress',
        tab: 'office',
        value: () => 'copy',
        change: () => {
          const blob = exportSave(saveStore);
          const done = () => toast(this, 'COPIED', 'save code on the clipboard');
          try {
            void navigator.clipboard
              .writeText(blob)
              .then(done, () => window.prompt('Copy your save code:', blob));
          } catch {
            window.prompt('Copy your save code:', blob);
          }
        },
        hint: () => 'copies a save code you can paste on another device',
      });
      this.rows.push({
        label: 'Import progress',
        tab: 'office',
        value: () => 'paste',
        change: () => {
          const blob = window.prompt('Paste a save code:');
          if (!blob) return;
          if (importSave(saveStore, blob)) {
            audio.play('unlock');
            audio.setVolume(saveStore.get().settings.volume);
            toast(this, 'IMPORTED', 'progress restored');
            this.refresh();
          } else {
            audio.play('wrong');
            toast(this, 'NOPE', 'that was not a save code');
          }
        },
        hint: () => "replaces this device's progress with the pasted code",
      });
    }
    this.rows.push({
      label: 'Reset progress',
      tab: 'office',
      value: () => (this.confirmReset ? 'click again to confirm' : '...'),
      change: () => {
        if (!this.confirmReset) {
          this.confirmReset = true;
          audio.play('wrong');
        } else {
          saveStore.reset();
          this.confirmReset = false;
          audio.play('stamp');
          audio.setVolume(saveStore.get().settings.volume);
        }
        this.refresh();
      },
      hint: () => 'erases scores, notebook, streak and unlocks',
    });

    this.rows = this.rows.filter((r) => (r.tab ?? 'game') === this.tab);
    if (this.tab === 'office') {
      // Looks first, the save's own rows last.
      const order = ['Office colours', 'Weather outside', 'Lamp flicker', 'Film grain'];
      const rank = (r: RowDef) => {
        const i = order.indexOf(r.label);
        return i >= 0 ? i : r.label.endsWith('progress') ? 20 : 10;
      };
      this.rows.sort((a, b) => rank(a) - rank(b));
    }
    this.rows.forEach((row, i) => {
      const ry = y + pad + 30 + i * CARD.rowH;
      const ring = this.add
        .rectangle(x + pad - 4, ry - 2, w - pad * 2 + 8, CARD.rowH - 1)
        .setOrigin(0)
        .setStrokeStyle(1, HEX.amber)
        .setVisible(false)
        .setDepth(DEPTH.pins);
      const label = addText(this, x + pad, ry, row.label, {
        size: FONT.size.body,
        font: 'body',
        color: 'shadow',
      }).setDepth(DEPTH.pins);
      const value = addText(this, x + w - pad, ry, '', {
        size: FONT.size.body,
        font: 'body',
        color: 'ink',
      })
        .setOrigin(1, 0)
        .setDepth(DEPTH.pins);
      const zone = this.add
        .zone(x + pad - 4, ry - 2, w - pad * 2 + 8, CARD.rowH - 1)
        .setOrigin(0)
        .setInteractive({ useHandCursor: false });
      zone.on('pointerover', () => this.select(i));
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
        this.select(i);
        // Left half steps back for stepped values, right half forward.
        row.change(p.worldX < x + w / 2 + 40 && row.label.endsWith('volume') ? -1 : 1);
      });
      this.rowTexts.push({ label, value, ring });
    });
    this.hintText = addText(this, x + pad, y + h - pad - 42, '', {
      size: FONT.size.tiny,
      color: 'woodMid',
      wrap: w - pad * 2,
    }).setDepth(DEPTH.pins);

    const back = new PixelButton(
      this,
      x + w / 2 - 44,
      y + h - pad - 18,
      'Back  [Esc]',
      () => this.close(),
      { hotkey: 'ESC', width: 88 },
    );
    back.setDepth(DEPTH.hud);
    backChip(this, () => this.close());

    const kb = this.input.keyboard;
    kb?.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'TAB']);
    kb?.on('keydown-DOWN', () => this.select((this.selected + 1) % this.rows.length));
    kb?.on('keydown-TAB', () => this.select((this.selected + 1) % this.rows.length));
    kb?.on('keydown-UP', () =>
      this.select((this.selected - 1 + this.rows.length) % this.rows.length),
    );
    kb?.on('keydown-RIGHT', () => this.rows[this.selected].change(1));
    kb?.on('keydown-LEFT', () => this.rows[this.selected].change(-1));
    kb?.on('keydown-ENTER', () => this.rows[this.selected].change(1));
    kb?.on('keydown-SPACE', () => this.rows[this.selected].change(1));
    this.select(SettingsScene.reselect >= 0 ? SettingsScene.reselect : 0);
    SettingsScene.reselect = -1;
    if (SettingsScene.justThemed) {
      LucienBubble.say(this, THEME_QUIPS[SettingsScene.justThemed], 3200);
      SettingsScene.justThemed = null;
      if (saveStore.get().stats.themesSeen.length >= THEME_IDS.length)
        awardBadge(this, 'decorator');
    }
    if (!this.overlay) lucienSays(this, 'settings');

    // The quick mute (M) is global; keep the volume row honest while it's on.
    const onMute = () => this.refresh();
    this.game.events.on('mute', onMute);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('mute', onMute);
      if (this.cosmeticsDirty) applyCosmetics(this, saveStore.get().cosmetics);
    });
  }

  private select(i: number): void {
    this.selected = i;
    if (this.rows[i].label !== 'Reset progress') this.confirmReset = false;
    this.refresh();
  }

  private refresh(): void {
    this.rows.forEach((row, i) => {
      const rt = this.rowTexts[i];
      rt.value.setText(row.value());
      rt.ring.setVisible(i === this.selected);
      rt.label.setColor(i === this.selected ? PALETTE.ink : PALETTE.shadow);
    });
    this.hintText.setText(this.rows[this.selected].hint?.() ?? '');
  }

  private close(): void {
    if (this.overlay) {
      this.scene.stop();
      this.scene.resume(this.returnTo);
    } else {
      goTo(this, this.returnTo);
    }
  }
}
