import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { FOLDER_CARD, FONT, GAME_WIDTH } from '@/config/layout';
import { HEX } from '@/config/palette';
import type { CaseData } from '@/data/schema';
import { audio } from '@/systems/audio';
import { saveStore } from '@/systems/save';
import { gameState } from '@/systems/gameState';
import { PixelButton } from './PixelButton';
import { makeText } from './text';
import { difficultyPips, rect } from '@/ui/shapes';

/** Case intake: a manila folder slides onto the desk with the token's pitch. */
export class FolderCard extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, c: CaseData, onOpen: () => void) {
    super(scene, FOLDER_CARD.x, FOLDER_CARD.y);
    const { w, h } = FOLDER_CARD;
    const shadow = rect(scene, 5, 6, w, h, HEX.bg, 0.55);
    const folder = rect(scene, 0, 10, w, h - 10, HEX.paperShadow);
    const tab = rect(scene, 0, 0, 80, 12, HEX.paperShadow);
    const edge = rect(scene, 0, h - 1, w, 1, HEX.woodLight);
    const label = rect(scene, 20, 30, w - 40, 70, HEX.paper);
    const clip = scene.make.image({ x: w - 40, y: 24, key: TEX.paperclip }, false).setOrigin(0);
    this.add([shadow, folder, tab, edge, label, clip]);

    this.add(
      makeText(
        scene,
        6,
        1,
        gameState.mode === 'daily'
          ? 'DAILY CASE'
          : gameState.mode === 'cold'
            ? gameState.coldSeed
              ? gameState.coldSeed.startsWith('week-')
                ? `THIS WEEK'S FILE  ${gameState.coldSeed.slice(5)}`
                : `COLD CASE  ${gameState.coldSeed}`
              : 'YOUR FILE'
            : `CASE #${String(gameState.currentIndex + 1).padStart(2, '0')}`,
        {
          size: FONT.size.tiny,
          color: 'woodDark',
        },
      ),
    );
    this.add(makeText(scene, 28, 36, c.ticker, { size: FONT.size.heading, color: 'shadow' }));
    this.add(makeText(scene, 28, 60, c.title, { size: FONT.size.body, color: 'ink' }));
    this.add(
      makeText(scene, 28, 76, `"${c.pitch}"`, {
        size: FONT.size.body,
        font: 'body',
        color: 'woodDark',
        wrap: w - 56,
      }),
    );
    this.add(makeText(scene, 20, 110, 'difficulty', { size: FONT.size.small, color: 'woodDark' }));
    this.add(difficultyPips(scene, 78, 113, c.difficulty));
    const relaxed = saveStore.get().settings.relaxed;
    this.add(
      makeText(
        scene,
        20,
        124,
        relaxed
          ? 'relaxed mode: no timer'
          : `timer: ${Math.floor(c.timeLimitSec / 60)}:${String(c.timeLimitSec % 60).padStart(2, '0')}`,
        {
          size: FONT.size.small,
          color: 'woodDark',
        },
      ),
    );
    const btn = new PixelButton(scene, w / 2 - 60, h - 34, 'Open case', onOpen, {
      width: 120,
      hotkey: 'ENTER',
    });
    this.remove(btn);
    this.add(btn);
    this.add(
      makeText(scene, w / 2, h - 12, 'click the folder or press Enter', {
        size: FONT.size.tiny,
        color: 'woodDark',
      }).setOrigin(0.5, 0),
    );
    folder.setInteractive({ useHandCursor: false });
    folder.on('pointerdown', onOpen);
    label.setInteractive({ useHandCursor: false });
    label.on('pointerdown', onOpen);
    this.setDepth(DEPTH.documents);
    scene.add.existing(this);

    // Slide in from the left edge.
    const targetX = this.x;
    const reduced = saveStore.get().settings.reducedMotion;
    if (!reduced) {
      this.x = -w - 20;
      audio.play('slide');
      scene.tweens.add({ targets: this, x: targetX, duration: 420, ease: 'Cubic.easeOut' });
    }
  }

  /** Slide out to the right, then destroy. */
  dismiss(onDone: () => void): void {
    const reduced = saveStore.get().settings.reducedMotion;
    if (reduced) {
      this.destroy();
      onDone();
      return;
    }
    audio.play('slide');
    this.scene.tweens.add({
      targets: this,
      x: GAME_WIDTH + 20,
      alpha: 0.6,
      duration: 320,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.destroy();
        onDone();
      },
    });
  }
}
