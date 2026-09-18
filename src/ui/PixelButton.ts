import Phaser from 'phaser';
import { UI } from '@/config/layout';
import { HEX, type PaletteKey } from '@/config/palette';
import { audio } from '@/systems/audio';
import { makeText } from './text';
import { escTaken } from './escGuard';
import { rect } from '@/ui/shapes';

export interface ButtonOpts {
  width?: number;
  color?: PaletteKey;
  hotkey?: string;
  disabled?: boolean;
  /** Paper-coloured (default) or dark ink button. */
  variant?: 'paper' | 'ink';
}

/** A chunky pixel button with hover/focus states and optional hotkey. */
export class PixelButton extends Phaser.GameObjects.Container {
  private face: Phaser.GameObjects.Rectangle;
  private bottom: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private focusRing: Phaser.GameObjects.Rectangle;
  private disabled = false;
  private readonly variant: 'paper' | 'ink';
  readonly bw: number;
  readonly bh: number = UI.buttonH;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    opts: ButtonOpts = {},
  ) {
    super(scene, Math.round(x), Math.round(y));
    this.variant = opts.variant ?? 'paper';
    const textColor: PaletteKey = opts.color ?? (this.variant === 'paper' ? 'shadow' : 'paper');
    this.label = makeText(scene, 0, 0, text, { size: 12, color: textColor });
    // Never narrower than the label: a fixed width is a minimum, not a clamp.
    this.bw = Math.max(opts.width ?? 0, Math.ceil(this.label.width) + UI.buttonPadX * 2);
    const frame = rect(scene, 0, 0, this.bw, this.bh, HEX.shadow);
    this.face = rect(scene, 1, 1, this.bw - 2, this.bh - 3, this.faceColor(false));
    this.bottom = rect(scene, 1, this.bh - 2, this.bw - 2, 1, this.edgeColor(false));
    this.label.setPosition(
      Math.round((this.bw - this.label.width) / 2),
      Math.round((this.bh - this.label.height) / 2),
    );
    this.focusRing = rect(
      scene,
      -UI.focusRingPad,
      -UI.focusRingPad,
      this.bw + UI.focusRingPad * 2,
      this.bh + UI.focusRingPad * 2,
    )
      .setStrokeStyle(1, HEX.amber)
      .setVisible(false);
    this.add([frame, this.face, this.bottom, this.label, this.focusRing]);
    this.setSize(this.bw, this.bh);
    this.setInteractive(
      new Phaser.Geom.Rectangle(this.bw / 2, this.bh / 2, this.bw, this.bh),
      Phaser.Geom.Rectangle.Contains,
    );
    this.on('pointerover', () => this.setHover(true));
    this.on('pointerout', () => this.setHover(false));
    this.on('pointerdown', () => {
      if (this.disabled) return;
      audio.play('ui');
      onClick();
    });
    if (opts.hotkey) {
      const k = scene.input.keyboard?.addKey(opts.hotkey);
      const onKey = () => {
        // An overlay (dialogue, browser) that just ate Esc shouldn't also trigger Back.
        if (opts.hotkey === 'ESC' && escTaken()) return;
        if (!this.disabled && this.active && this.visible) {
          audio.play('ui');
          onClick();
        }
      };
      k?.on('down', onKey);
      // Keys are shared per scene: detach our listener, don't destroy the Key.
      this.once('destroy', () => k?.off('down', onKey));
    }
    if (opts.disabled) this.setDisabled(true);
    scene.add.existing(this);
  }

  private faceColor(hover: boolean): number {
    if (this.variant === 'ink') return hover ? HEX.ink : HEX.shadow;
    return hover ? HEX.paper : HEX.paperShadow;
  }
  private edgeColor(hover: boolean): number {
    return hover ? HEX.amber : this.variant === 'ink' ? HEX.ink : HEX.woodLight;
  }

  private setHover(h: boolean): void {
    if (this.disabled) return;
    this.face.setFillStyle(this.faceColor(h));
    this.bottom.setFillStyle(this.edgeColor(h));
  }

  setDisabled(d: boolean): this {
    this.disabled = d;
    this.setAlpha(d ? 0.45 : 1);
    return this;
  }

  setFocused(f: boolean): this {
    this.focusRing.setVisible(f);
    return this;
  }

  setLabel(t: string): this {
    this.label.setText(t);
    this.label.setPosition(
      Math.round((this.bw - this.label.width) / 2),
      Math.round((this.bh - this.label.height) / 2),
    );
    return this;
  }
}
