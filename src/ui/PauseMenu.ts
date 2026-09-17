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
    const buttons = [
      new PixelButton(scene, GAME_WIDTH / 2 - 50, y + 48, 'Resume', actions.onResume, {
        width: 100,
      }),
      new PixelButton(scene, GAME_WIDTH / 2 - 50, y + 70, 'Notebook', actions.onNotebook, {
        width: 100,
      }),
      new PixelButton(scene, GAME_WIDTH / 2 - 50, y + 92, 'Settings', actions.onSettings, {
        width: 100,
      }),
      new PixelButton(
        scene,
        GAME_WIDTH / 2 - 50,
        y + 114,
        'Fullscreen [F]',
        () => toggleFullscreen(),
        {
          width: 100,
        },
      ),
      new PixelButton(scene, GAME_WIDTH / 2 - 50, y + 136, 'Quit to title', actions.onQuit, {
        width: 100,
      }),
    ];
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
