import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { FONT, PAPER, TABS } from '@/config/layout';
import type { CaseDocument } from '@/data/schema';
import { audio } from '@/systems/audio';
import { makeText } from './text';
import { rect } from './shapes';
import { HEX, PALETTE, type PaletteKey } from '@/config/palette';

const SHORT: Record<CaseDocument['type'], string> = {
  contract: 'Code',
  tokenomics: 'Tokens',
  team: 'Team',
  chat: 'Chat',
  liquidity: 'LP',
  audit: 'Audit',
};

/** Folder tabs along the top of the paper, one per evidence document. */
export class TabBar extends Phaser.GameObjects.Container {
  private tabs: {
    bg: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    dot: Phaser.GameObjects.Rectangle;
    x: number;
  }[] = [];
  private current = 0;
  /** Tabs whose dot is a marker, not an unread notice. */
  private sticky = new Set<number>();

  constructor(scene: Phaser.Scene, docs: CaseDocument[], onSelect: (index: number) => void) {
    super(scene, TABS.x, TABS.y);
    // Shrink tabs so every document fits on the paper.
    const avail = PAPER.w - TABS.margin * 2 - TABS.gap * (docs.length - 1);
    const w = Math.min(TABS.w, Math.floor(avail / docs.length));
    docs.forEach((doc, i) => {
      const x = i * (w + TABS.gap);
      const bg = scene.make
        .image({ x, y: 0, key: TEX.tab }, false)
        .setOrigin(0)
        .setDisplaySize(w, TABS.h);
      bg.setInteractive({ useHandCursor: false });
      bg.on('pointerdown', () => {
        if (i === this.current) return;
        onSelect(i);
      });
      // Inactive tabs lift a pixel under the pointer, like the stamps.
      bg.on('pointerover', () => {
        if (i === this.current) return;
        audio.play('hover');
        bg.setY(-1);
        this.tabs[i]?.label.setY(4);
      });
      bg.on('pointerout', () => {
        if (i === this.current) return;
        bg.setY(0);
        this.tabs[i]?.label.setY(5);
      });
      const label = makeText(scene, x + w / 2, 4, `${i + 1} ${SHORT[doc.type]}`, {
        size: FONT.size.small,
        color: 'woodDark',
      }).setOrigin(0.5, 0);
      // Unread dot: goes away once the tab has been opened.
      const dot = rect(scene, x + w - 7, 3, 3, 3, HEX.stampRed);
      this.add([bg, label, dot]);
      this.tabs.push({ bg, label, dot, x });
    });
    scene.add.existing(this);
    this.setCurrent(0);
  }

  /** A dot that stays: the second look marks pages with something to show. */
  setDot(i: number, color: PaletteKey): void {
    // Outlined, so it still reads on the open tab's paper.
    this.tabs[i]?.dot.setFillStyle(HEX[color]).setStrokeStyle(1, HEX.shadow).setVisible(true);
    this.sticky.add(i);
  }

  setCurrent(i: number): void {
    this.current = i;
    if (!this.sticky.has(i)) this.tabs[i]?.dot.setVisible(false);
    this.tabs.forEach((t, idx) => {
      t.bg.setTexture(idx === i ? TEX.tabActive : TEX.tab).setY(0);
      t.label.setColor(idx === i ? PALETTE.shadow : PALETTE.woodMid);
      t.label.setY(idx === i ? 4 : 5);
    });
  }
}
