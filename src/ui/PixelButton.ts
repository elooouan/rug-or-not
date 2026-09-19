import Phaser from 'phaser';
import { UI } from '@/config/layout';
import { HEX, type PaletteKey } from '@/config/palette';
import { audio } from '@/systems/audio';
import { makeText } from './text';
import { escTaken } from './escGuard';
import { rect } from '@/ui/shapes';
import { touchScreen } from './lensLift';

export interface ButtonOpts {
  width?: number;
  color?: PaletteKey;
  hotkey?: string;
  disabled?: boolean;
  /** Paper-coloured (default) or dark ink button. */
  variant?: 'paper' | 'ink';
  /** Texture key drawn at the left of the label (a wallet mark, for instance). */
  icon?: string;
}

const ICON_W = 14;
const ICON_GAP = 5;

/** A chunky pixel button with hover/focus states and optional hotkey. */
const COARSE_POINTER = touchScreen();

export class PixelButton extends Phaser.GameObjects.Container {
  private face: Phaser.GameObjects.Rectangle;
  private bottom: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private focusRing: Phaser.GameObjects.Rectangle;
  private icon?: Phaser.GameObjects.Image;
  private readonly iconW: number;
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
    this.iconW = opts.icon ? ICON_W + ICON_GAP : 0;
    // Never narrower than the label: a fixed width is a minimum, not a clamp.
    this.bw = Math.max(
      opts.width ?? 0,
      Math.ceil(this.label.width) + this.iconW + UI.buttonPadX * 2,
    );
    const frame = rect(scene, 0, 0, this.bw, this.bh, HEX.shadow);
    this.face = rect(scene, 1, 1, this.bw - 2, this.bh - 3, this.faceColor(false));
    this.bottom = rect(scene, 1, this.bh - 2, this.bw - 2, 1, this.edgeColor(false));
    this.placeLabel();
    if (opts.icon) {
      this.icon = scene.make.image({ x: 0, y: Math.floor(this.bh / 2), key: opts.icon }, false);
      this.icon.setOrigin(0, 0.5);
      this.placeIcon();
    }
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
    if (this.icon) this.add(this.icon);
    this.setSize(this.bw, this.bh);
    // Fingers get a little slack around the drawn button (title rows are 5px apart).
    const pad = COARSE_POINTER ? 2 : 0;
    this.setInteractive(
      new Phaser.Geom.Rectangle(
        this.bw / 2 - pad * 1.5,
        this.bh / 2 - pad / 2,
        this.bw + pad * 3,
        this.bh + pad,
      ),
      Phaser.Geom.Rectangle.Contains,
    );
    const press = () => {
      if (this.disabled) return;
      audio.play('ui');
      // A one-pixel press so the click reads even when the handler is instant.
      const y0 = this.y;
      this.setY(y0 + 1);
      scene.time.delayedCall(90, () => this.active && this.y === y0 + 1 && this.setY(y0));
      onClick();
    };
    // A mouse fires on the press. A finger fires on the lift, and only if it stayed put:
    // a drag that starts on a button (scrolling a page) must not trigger it.
    let fingerDown = false;
    this.on('pointerover', () => this.setHover(true));
    this.on('pointerout', () => {
      fingerDown = false;
      this.setHover(false);
    });
    this.on('pointerdown', (p?: Phaser.Input.Pointer) => {
      if (p?.wasTouch) {
        fingerDown = true;
        return;
      }
      press();
    });
    this.on('pointerup', (p: Phaser.Input.Pointer) => {
      const ok = fingerDown;
      fingerDown = false;
      if (ok && p.getDistance() <= 8) press();
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
    this.placeLabel();
    this.placeIcon();
    return this;
  }

  /** Icon and label sit together, centred as one block. */
  private placeLabel(): void {
    this.label.setPosition(
      Math.round((this.bw - this.label.width + this.iconW) / 2),
      Math.round((this.bh - this.label.height) / 2),
    );
  }

  private placeIcon(): void {
    this.icon?.setX(this.label.x - this.iconW);
  }
}
