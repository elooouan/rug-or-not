import Phaser from 'phaser';
import type { PixelButton } from './PixelButton';

/** Keyboard navigation (arrows / Tab / Enter / Space) across a list of buttons. */
export class ButtonGroup {
  private index = -1;
  private keys: Phaser.Input.Keyboard.Key[] = [];
  private kb?: Phaser.Input.Keyboard.KeyboardPlugin;

  constructor(
    scene: Phaser.Scene,
    private buttons: PixelButton[],
    private activate: (index: number) => void,
    opts: { horizontal?: boolean } = {},
  ) {
    const kb = scene.input.keyboard;
    if (!kb) return;
    this.kb = kb;
    const K = Phaser.Input.Keyboard.KeyCodes;
    const bind = (code: number, fn: () => void) => {
      const k = kb.addKey(code, false);
      k.on('down', fn);
      this.keys.push(k);
    };
    bind(opts.horizontal ? K.RIGHT : K.DOWN, () => this.move(1));
    bind(opts.horizontal ? K.LEFT : K.UP, () => this.move(-1));
    const shift = kb.addKey(K.SHIFT, false);
    this.keys.push(shift);
    bind(K.TAB, () => this.move(shift.isDown ? -1 : 1));
    bind(K.ENTER, () => this.index >= 0 && this.activate(this.index));
    bind(K.SPACE, () => this.index >= 0 && this.activate(this.index));
    kb.addCapture('TAB');
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  private move(dir: number): void {
    const n = this.buttons.length;
    if (n === 0) return;
    this.index = this.index < 0 ? (dir > 0 ? 0 : n - 1) : (this.index + dir + n) % n;
    this.buttons.forEach((b, i) => b.setFocused(i === this.index));
  }

  clearFocus(): void {
    this.index = -1;
    this.buttons.forEach((b) => b.setFocused(false));
  }

  destroy(): void {
    this.keys.forEach((k) => this.kb?.removeKey(k, true));
    this.keys = [];
  }
}
