import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { HEX, type PaletteKey } from '@/config/palette';
import { FLAG_IDS, FLAGS, type FlagId, type Severity } from '@/data/flags';
import { audio } from '@/systems/audio';
import { saveStore } from '@/systems/save';
import { DeskBackground } from '@/ui/DeskBackground';
import { lucienSays } from '@/ui/DialogueBox';
import { PixelButton } from '@/ui/PixelButton';
import { addText, charWidth, makeText, wrapMono } from '@/ui/text';
import { setupScene } from './sceneUtil';

const BOOK = { x: 70, y: 30, w: 500, h: 300, gutter: 8, pad: 14, lineH: 14 } as const;
const SEV_COLOR: Record<Severity, PaletteKey> = {
  minor: 'ink',
  major: 'amber',
  critical: 'stampRed',
};
const SEV_MARK: Record<Severity, string> = { minor: '!', major: '!!', critical: '!!!' };

/** The Detective's Notebook: a glossary that unlocks flags as they're encountered. */
export class NotebookScene extends Phaser.Scene {
  static readonly KEY = 'NotebookScene';
  private selected = 0;
  private entries: Phaser.GameObjects.Text[] = [];
  private detail!: Phaser.GameObjects.Container;
  private unlocked = new Set<string>();
  private listIds: FlagId[] = [];
  private overlay = false;
  private returnTo = 'TitleScene';

  constructor() {
    super(NotebookScene.KEY);
  }

  init(data: { overlay?: boolean; returnTo?: string } | undefined): void {
    this.overlay = !!data?.overlay;
    this.returnTo = data?.returnTo ?? 'TitleScene';
  }

  private close(): void {
    if (this.overlay) {
      this.scene.stop();
      this.scene.resume(this.returnTo);
    } else this.scene.start(this.returnTo);
  }

  create(): void {
    setupScene(this);
    if (this.overlay)
      this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, HEX.bg, 0.7).setOrigin(0).setInteractive();
    else new DeskBackground(this, { props: false, stamps: false });
    this.unlocked = new Set(saveStore.get().unlockedFlags);
    this.listIds = [...FLAG_IDS];
    const { x, y, w, h, pad } = BOOK;
    const pageW = w / 2 - BOOK.gutter;

    // Cover + two pages.
    this.add
      .rectangle(x + 5, y + 6, w, h, HEX.bg, 0.55)
      .setOrigin(0)
      .setDepth(DEPTH.documents);
    this.add
      .rectangle(x - 6, y - 6, w + 12, h + 12, HEX.woodDark)
      .setOrigin(0)
      .setDepth(DEPTH.documents);
    this.add.image(x, y, TEX.paper).setOrigin(0).setDisplaySize(pageW, h).setDepth(DEPTH.documents);
    this.add
      .image(x + pageW + BOOK.gutter * 2, y, TEX.paper)
      .setOrigin(0)
      .setDisplaySize(pageW, h)
      .setDepth(DEPTH.documents);
    this.add
      .rectangle(x + pageW + BOOK.gutter, y, 2, h, HEX.shadow)
      .setOrigin(0)
      .setDepth(DEPTH.pins);

    addText(this, x + pad, y + pad - 4, "DETECTIVE'S NOTEBOOK", {
      size: FONT.size.body,
      color: 'woodDark',
    }).setDepth(DEPTH.pins);
    addText(
      this,
      x + pageW - pad,
      y + pad - 2,
      `${this.unlocked.size}/${FLAG_IDS.length} learned`,
      { size: FONT.size.tiny, color: 'paperShadow' },
    )
      .setOrigin(1, 0)
      .setDepth(DEPTH.pins);

    // Left page: list.
    this.entries = this.listIds.map((id, i) => {
      const flag = FLAGS[id];
      const known = this.unlocked.has(id);
      const t = addText(
        this,
        x + pad + 14,
        y + pad + 16 + i * 16,
        known ? flag.title : '? ? ? ? ?',
        {
          size: FONT.size.body,
          font: 'body',
          color: known ? 'shadow' : 'paperShadow',
        },
      ).setDepth(DEPTH.pins);
      t.setInteractive({ useHandCursor: false });
      t.on('pointerover', () => this.select(i));
      const mark = addText(
        this,
        x + pad,
        y + pad + 16 + i * 16,
        known ? SEV_MARK[flag.severity] : '',
        { size: FONT.size.tiny, color: SEV_COLOR[flag.severity] },
      ).setDepth(DEPTH.pins);
      mark.setY(mark.y + 2);
      return t;
    });

    // Right page: detail.
    this.detail = this.add
      .container(x + pageW + BOOK.gutter * 2 + pad, y + pad)
      .setDepth(DEPTH.pins);
    const back = new PixelButton(
      this,
      GAME_WIDTH - 100,
      GAME_HEIGHT - 24,
      'Back  [Esc]',
      () => this.close(),
      { hotkey: 'ESC', width: 88 },
    );
    back.setDepth(DEPTH.hud);

    const kb = this.input.keyboard;
    kb?.addCapture(['UP', 'DOWN', 'TAB']);
    kb?.on('keydown-DOWN', () => this.select((this.selected + 1) % this.listIds.length));
    kb?.on('keydown-TAB', () => this.select((this.selected + 1) % this.listIds.length));
    kb?.on('keydown-UP', () =>
      this.select((this.selected - 1 + this.listIds.length) % this.listIds.length),
    );
    const first = this.listIds.findIndex((id) => this.unlocked.has(id));
    this.select(Math.max(0, first));
    lucienSays(this, 'notebook');
  }

  private select(i: number): void {
    this.selected = i;
    this.entries.forEach((t, idx) =>
      t.setColor(
        idx === i ? '#5b6f8a' : this.unlocked.has(this.listIds[idx]) ? '#2b2530' : '#b8a88a',
      ),
    );
    this.detail.removeAll(true);
    const id = this.listIds[i];
    const flag = FLAGS[id];
    const known = this.unlocked.has(id);
    const pageW = BOOK.w / 2 - BOOK.gutter - BOOK.pad * 2;
    const cw = charWidth(this, 'body', 12);
    const maxChars = Math.floor(pageW / cw);
    let y = 0;
    const add = (text: string, opts: Parameters<typeof makeText>[4]) => {
      const t = makeText(this, 0, y, text, opts);
      this.detail.add(t);
      y += BOOK.lineH;
      return t;
    };
    if (!known) {
      add('UNKNOWN PATTERN', { size: FONT.size.body, color: 'paperShadow' });
      y += 4;
      wrapMono(
        'You have not met this red flag yet. Close more cases to fill in this page.',
        maxChars,
      ).forEach((l) => add(l, { font: 'body', color: 'paperShadow' }));
      return;
    }
    add(flag.title.toUpperCase(), { size: FONT.size.body, color: 'woodDark' });
    add(`severity: ${flag.severity}  ${SEV_MARK[flag.severity]}`, {
      size: FONT.size.tiny,
      color: SEV_COLOR[flag.severity],
    });
    y += 6;
    add('What it is', { size: FONT.size.tiny, color: 'paperShadow' });
    wrapMono(flag.explanation, maxChars).forEach((l) => add(l, { font: 'body', color: 'shadow' }));
    y += 6;
    add('How to spot it', { size: FONT.size.tiny, color: 'paperShadow' });
    wrapMono(flag.howToSpot, maxChars).forEach((l) => add(l, { font: 'body', color: 'ink' }));
    audio.play('tick');
  }
}
