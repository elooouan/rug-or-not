import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { FONT, PAPER, TABS } from '@/config/layout';
import type { CaseDocument } from '@/data/schema';
import { audio } from '@/systems/audio';
import { makeText } from './text';

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
  private tabs: { bg: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text; x: number }[] = [];
  private current = 0;

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
      bg.on('pointerover', () => i !== this.current && audio.play('hover'));
      const label = makeText(scene, x + w / 2, 4, `${i + 1} ${SHORT[doc.type]}`, {
        size: FONT.size.small,
        color: 'woodDark',
      }).setOrigin(0.5, 0);
      this.add([bg, label]);
      this.tabs.push({ bg, label, x });
    });
    scene.add.existing(this);
    this.setCurrent(0);
  }

  setCurrent(i: number): void {
    this.current = i;
    this.tabs.forEach((t, idx) => {
      t.bg.setTexture(idx === i ? TEX.tabActive : TEX.tab);
      t.label.setColor(idx === i ? '#2b2530' : '#6b5140');
      t.label.setY(idx === i ? 4 : 5);
    });
  }
}
