import Phaser from 'phaser';
import { DEPTH } from '@/config/depth';
import { FONT, GAME_HEIGHT, GAME_WIDTH, UI } from '@/config/layout';
import { HEX } from '@/config/palette';
import { ButtonGroup } from './ButtonGroup';
import { PixelButton } from './PixelButton';
import { makeText } from './text';
import { toggleFullscreen } from '@/main';
import { rect } from '@/ui/shapes';

export interface PauseActions {
  onResume: () => void;
  onSettings: () => void;
  onNotebook: () => void;
  onQuit: () => void;
  /** A line under the title: which file, how long is left. */
  subtitle?: string;
}

/** Esc overlay. */
export class PauseMenu extends Phaser.GameObjects.Container {
  private group: ButtonGroup;

  constructor(scene: Phaser.Scene, actions: PauseActions) {
    super(scene, 0, 0);
    const dim = rect(scene, 0, 0, GAME_WIDTH, GAME_HEIGHT, HEX.bg, 0.7);
    dim.setInteractive();
    const x = (GAME_WIDTH - UI.pauseW) / 2;
    const y = (GAME_HEIGHT - UI.pauseH) / 2;
    const card = rect(scene, x, y, UI.pauseW, UI.pauseH, HEX.paper);
    const shadow = rect(scene, x + 4, y + 5, UI.pauseW, UI.pauseH, HEX.bg, 0.6);
    this.add([dim, shadow, card]);
    this.add(
      makeText(scene, GAME_WIDTH / 2, y + 14, 'PAUSED', {
        size: FONT.size.heading,
        color: 'shadow',
      }).setOrigin(0.5, 0),
    );
    if (actions.subtitle)
      this.add(
        makeText(scene, GAME_WIDTH / 2, y + 34, actions.subtitle, {
          size: FONT.size.tiny,
          color: 'woodMid',
        }).setOrigin(0.5, 0),
      );
    // Quitting throws the run away, so it asks once: the button changes its mind for a
    // few seconds and a second press goes.
    let quitArmed = false;
    const quit = () => {
      if (quitArmed) {
        actions.onQuit();
        return;
      }
      quitArmed = true;
      quitBtn.setLabel('Sure? Quit');
      scene.time.delayedCall(2500, () => {
        quitArmed = false;
        if (quitBtn.active) quitBtn.setLabel('Quit to title');
      });
    };
    // Fullscreen only where the browser allows it (not on an iPhone).
    const rows: [string, () => void][] = [
      ['Resume', actions.onResume],
      ['Notebook', actions.onNotebook],
      ['Settings', actions.onSettings],
      ...(document.fullscreenEnabled
        ? [['Fullscreen [F]', () => toggleFullscreen()] as [string, () => void]]
        : []),
      ['Quit to title', quit],
    ];
    const buttons = rows.map(
      ([label, fn], i) =>
        new PixelButton(scene, GAME_WIDTH / 2 - 50, y + 48 + i * 22, label, fn, { width: 100 }),
    );
    const quitBtn = buttons[buttons.length - 1];
    buttons.forEach((b) => {
      scene.children.remove(b);
      this.add(b);
    });
    this.group = new ButtonGroup(scene, buttons, (i) => buttons[i].emit('pointerdown'));
    this.setDepth(DEPTH.overlay);
    scene.add.existing(this);
  }

  override destroy(fromScene?: boolean): void {
    this.group.clearFocus();
    super.destroy(fromScene);
  }
}
