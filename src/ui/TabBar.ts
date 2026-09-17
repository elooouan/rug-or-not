import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { FONT, TABS } from '@/config/layout';
import type { CaseDocument } from '@/data/schema';
import { audio } from '@/systems/audio';
import { makeText } from './text';

const SHORT: Record<CaseDocument['type'], string> = {
  contract: 'Contract',
  tokenomics: 'Tokens',
  team: 'Team',
  chat: 'Chat',
  liquidity: 'Liquidity',
  audit: 'Audit',
};

/** Folder tabs along the top of the paper, one per evidence document. */
export class TabBar extends Phaser.GameObjects.Container {
  private tabs: { bg: Phaser.GameObjects.Image; label: Phaser.GameObjects.Text }[] = [];
  private current = 0;

  constructor(scene: Phaser.Scene, docs: CaseDocument[], onSelect: (index: number) => void) {
    super(scene, TABS.x, TABS.y);
    docs.forEach((doc, i) => {
      const x = i * (TABS.w + TABS.gap);
      const bg = scene.make.image({ x, y: 0, key: TEX.tab }, false).setOrigin(0);
      bg.setInteractive({ useHandCursor: false });
      bg.on('pointerdown', () => {
        if (i === this.current) return;
        audio.play('paper');
        onSelect(i);
      });
      const label = makeText(scene, x + TABS.w / 2, 4, `${i + 1} ${SHORT[doc.type]}`, {
        size: FONT.size.small,
        color: 'woodDark',
      }).setOrigin(0.5, 0);
      this.add([bg, label]);
      this.tabs.push({ bg, label });
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
