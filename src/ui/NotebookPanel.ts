import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { FONT, NOTEBOOK } from '@/config/layout';
import { HEX } from '@/config/palette';
import { makeText } from './text';
import { rect } from '@/ui/shapes';

export interface SuspicionEntry {
  id: string;
  label: string;
  stray?: boolean;
}

/** The detective's small notebook listing pinned "Suspicions". */
export class NotebookPanel extends Phaser.GameObjects.Container {
  private lines: Phaser.GameObjects.Text[] = [];
  private pinIcons: Phaser.GameObjects.Image[] = [];
  private countText: Phaser.GameObjects.Text;
  private emptyText: Phaser.GameObjects.Text;
  private examinedText: Phaser.GameObjects.Text;

  /** Entry ids in the order shown; clicking a line jumps to that clue. */
  private shownIds: string[] = [];
  onSelect?: (id: string) => void;

  constructor(scene: Phaser.Scene) {
    super(scene, NOTEBOOK.x, NOTEBOOK.y);
    const { w, h, padding } = NOTEBOOK;
    const shadow = rect(scene, 3, 4, w, h, HEX.bg, 0.5);
    const cover = rect(scene, -4, -3, w + 8, h + 6, HEX.woodDark);
    const page = rect(scene, 0, 0, w, h, HEX.paper);
    this.add([shadow, cover, page]);
    // Spiral rings along the top.
    for (let x = 10; x < w - 6; x += 12) {
      this.add(rect(scene, x, -6, 3, 8, HEX.paperShadow));
    }
    // Ruled lines.
    for (let i = 0; i < NOTEBOOK.maxLines; i++) {
      const y = padding + 14 + i * NOTEBOOK.lineHeight + NOTEBOOK.lineHeight - 2;
      this.add(rect(scene, padding - 2, y, w - padding * 2 + 4, 1, HEX.paperShadow, 0.6));
    }
    // Red margin line.
    this.add(rect(scene, padding + 8, 4, 1, h - 8, HEX.stampRed, 0.35));
    this.add(
      makeText(scene, padding, padding - 2, 'SUSPICIONS', {
        size: FONT.size.small,
        color: 'woodDark',
      }),
    );
    this.countText = makeText(scene, w - padding, padding - 1, '0', {
      size: FONT.size.tiny,
      color: 'paperShadow',
    }).setOrigin(1, 0);
    this.add(this.countText);
    this.emptyText = makeText(
      scene,
      padding + 12,
      padding + 16,
      'pin clues on the\nevidence to list\nthem here',
      { size: FONT.size.body, font: 'body', color: 'woodLight' },
    );
    this.add(this.emptyText);
    this.examinedText = makeText(scene, padding, h - padding - 6, 'examined 0/0', {
      size: FONT.size.tiny,
      color: 'woodMid',
    });
    this.add(this.examinedText);
    for (let i = 0; i < NOTEBOOK.maxLines; i++) {
      const y = padding + 14 + i * NOTEBOOK.lineHeight;
      const icon = scene.make
        .image({ x: padding, y: y + 1, key: TEX.pin }, false)
        .setOrigin(0)
        .setScale(0.75)
        .setVisible(false);
      const t = makeText(scene, padding + 12, y, '', {
        size: FONT.size.body,
        font: 'body',
        color: 'shadow',
      });
      // A suspicion is a link back to the evidence it points at.
      t.setInteractive(
        new Phaser.Geom.Rectangle(-14, -1, NOTEBOOK.w - padding * 2, NOTEBOOK.lineHeight),
        Phaser.Geom.Rectangle.Contains,
      );
      t.on('pointerover', () => this.shownIds[i] && t.setColor('#5b6f8a'));
      t.on('pointerout', () => this.recolor(i));
      t.on('pointerdown', () => {
        const id = this.shownIds[i];
        if (id && !id.startsWith('stray-')) this.onSelect?.(id);
      });
      this.pinIcons.push(icon);
      this.lines.push(t);
      this.add([icon, t]);
    }
    scene.add.existing(this);
  }

  /** How many clue spots the lens has passed over, out of all spots in the case. */
  setExamined(n: number, total: number): void {
    if (n < 0) {
      this.examinedText.setText("detective's honour");
      this.examinedText.setColor('#9a3b3b');
      return;
    }
    this.examinedText.setText(
      `examined ${n}/${total}${n >= total && total > 0 ? '  all seen' : ''}`,
    );
    this.examinedText.setColor(n >= total && total > 0 ? '#4f7a5a' : '#6b5140');
  }

  setEntries(entries: SuspicionEntry[]): void {
    this.countText.setText(String(entries.length));
    this.emptyText.setVisible(entries.length === 0);
    const maxChars = 22;
    // Show the most recent entries if the list overflows.
    const shown = entries.slice(-NOTEBOOK.maxLines);
    this.shownIds = shown.map((e) => e.id);
    for (let i = 0; i < NOTEBOOK.maxLines; i++) {
      const e = shown[i];
      this.lines[i].setText(e ? e.label.slice(0, maxChars) : '');
      this.recolor(i);
      this.pinIcons[i].setVisible(!!e).setTexture(e?.stray ? TEX.pinStray : TEX.pin);
    }
  }

  private recolor(i: number): void {
    const id = this.shownIds[i];
    this.lines[i].setColor(id?.startsWith('stray-') ? '#5b6f8a' : '#2b2530');
  }
}
