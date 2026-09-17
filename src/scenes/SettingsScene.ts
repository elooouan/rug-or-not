import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { HEX } from '@/config/palette';
import type { UnlockCategory } from '@/data/unlockables';
import { audio } from '@/systems/audio';
import { saveStore, type CosmeticSelection } from '@/systems/save';
import type { Settings } from '@/systems/settings';
import {
  applyCosmetics,
  byCategory,
  contextFromSave,
  describeSource,
  isUnlocked,
} from '@/systems/unlocks';
import { DeskBackground } from '@/ui/DeskBackground';
import { PixelButton } from '@/ui/PixelButton';
import { addText } from '@/ui/text';
import { setupScene } from './sceneUtil';

interface SettingsInit {
  overlay?: boolean;
  returnTo?: string;
}

interface RowDef {
  label: string;
  value: () => string;
  change: (dir: number) => void;
  hint?: () => string;
}

const CARD = { x: 150, y: 24, w: 340, h: 312, pad: 14, rowH: 18 } as const;

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

  constructor() {
    super(SettingsScene.KEY);
  }

  init(data: SettingsInit): void {
    this.overlay = !!data?.overlay;
    this.returnTo = data?.returnTo ?? 'TitleScene';
  }

  create(): void {
    setupScene(this);
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
    addText(this, x + w / 2, y + pad - 4, 'SETTINGS', { size: FONT.size.heading, color: 'shadow' })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.pins);

    const set = (fn: (s: Settings) => void) => {
      saveStore.update((d) => fn(d.settings));
      const s = saveStore.get().settings;
      audio.setVolume(s.volume);
      audio.setRain(s.rain);
      audio.setMusic(s.music);
      this.refresh();
    };
    const s = () => saveStore.get().settings;
    const onOff = (v: boolean) => (v ? 'on' : 'off');
    this.rows.push({
      label: 'Master volume',
      value: () => `${Math.round(s().volume * 10) * 10}%`,
      change: (d) =>
        set((st) => (st.volume = Phaser.Math.Clamp(Math.round(st.volume * 10 + d) / 10, 0, 1))),
    });
    this.rows.push({
      label: 'Relaxed mode (no timers)',
      value: () => onOff(s().relaxed),
      change: () => set((st) => (st.relaxed = !st.relaxed)),
    });
    this.rows.push({
      label: 'Reduced motion',
      value: () => onOff(s().reducedMotion),
      change: () => set((st) => (st.reducedMotion = !st.reducedMotion)),
      hint: () => 'disables screen shake, flicker, steam and slide-ins',
    });
    this.rows.push({
      label: 'Lamp flicker',
      value: () => onOff(s().lampFlicker),
      change: () => set((st) => (st.lampFlicker = !st.lampFlicker)),
    });
    this.rows.push({
      label: 'Music (lo-fi loop)',
      value: () => onOff(s().music),
      change: () => set((st) => (st.music = !st.music)),
    });
    this.rows.push({
      label: 'Rain on the window',
      value: () => onOff(s().rain),
      change: () => set((st) => (st.rain = !st.rain)),
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
    this.rows.push({
      label: 'Reset progress',
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
        row.change(p.worldX < x + w / 2 + 40 && row.label === 'Master volume' ? -1 : 1);
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
    this.select(0);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
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
      rt.label.setColor(i === this.selected ? '#5b6f8a' : '#2b2530');
    });
    this.hintText.setText(this.rows[this.selected].hint?.() ?? '');
  }

  private close(): void {
    if (this.overlay) {
      this.scene.stop();
      this.scene.resume(this.returnTo);
    } else {
      this.scene.start(this.returnTo);
    }
  }
}
