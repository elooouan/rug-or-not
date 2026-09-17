import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { HEX } from '@/config/palette';
import { saveStore } from '@/systems/save';
import type { Clue } from '@/data/schema';
import { audio } from '@/systems/audio';
import { rect as mkRect, zone as mkZone } from '@/ui/shapes';

export interface SpotRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpotCallbacks {
  onToggle(spot: ClueSpot): void;
  onHover(spot: ClueSpot, over: boolean): void;
}

/**
 * An invisible-until-hovered clickable region on a document. Clicking drops a
 * red pin (a distinct shape, so it never relies on colour alone).
 */
export class ClueSpot extends Phaser.GameObjects.Container {
  readonly clue: Clue;
  readonly rect: SpotRect;
  pinned = false;
  private highlight: Phaser.GameObjects.Rectangle;
  private pin: Phaser.GameObjects.Image;
  private focusRing: Phaser.GameObjects.Rectangle;
  private hovered = false;
  private focused = false;

  constructor(scene: Phaser.Scene, clue: Clue, rect: SpotRect, cb: SpotCallbacks) {
    super(scene, 0, 0);
    this.clue = clue;
    this.rect = rect;
    this.highlight = mkRect(scene, rect.x, rect.y, rect.w, rect.h, HEX.amber, 0);
    this.focusRing = mkRect(scene, rect.x - 1, rect.y - 1, rect.w + 2, rect.h + 2)
      .setStrokeStyle(1, HEX.ink)
      .setVisible(false);
    this.pin = scene.make
      .image({ x: rect.x - 3, y: rect.y - 4, key: TEX.pin }, false)
      .setOrigin(0)
      .setVisible(false);
    const zone = mkZone(scene, rect.x, rect.y, rect.w, rect.h);
    zone.setInteractive({ useHandCursor: false });
    zone.on('pointerover', () => {
      audio.play('hover');
      this.hovered = true;
      this.refresh();
      cb.onHover(this, true);
    });
    zone.on('pointerout', () => {
      this.hovered = false;
      this.refresh();
      cb.onHover(this, false);
    });
    // Toggle on release, and only for taps: a drag across the paper (finger or
    // mouse) is inspecting, not pinning, so touch players can use the lens.
    zone.on(
      'pointerdown',
      (p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        if (!p.rightButtonDown()) ev.stopPropagation();
      },
    );
    zone.on(
      'pointerup',
      (p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        if (p.rightButtonReleased() || p.getDistance() > 8) return;
        ev.stopPropagation();
        cb.onToggle(this);
      },
    );
    this.add([this.highlight, this.focusRing, zone, this.pin]);
  }

  setPinned(p: boolean): void {
    this.pinned = p;
    this.refresh();
    if (p && !saveStore.get().settings.reducedMotion) {
      // Drop the pin in from above with a little bounce.
      const y = this.rect.y - 4;
      this.pin.setY(y - 10).setAlpha(0);
      this.scene.tweens.add({
        targets: this.pin,
        y,
        alpha: 1,
        duration: 220,
        ease: 'Bounce.easeOut',
      });
      this.highlight.setScale(1.04);
      this.scene.tweens.add({
        targets: this.highlight,
        scaleX: 1,
        scaleY: 1,
        duration: 160,
        ease: 'Sine.easeOut',
      });
    }
  }

  setFocused(f: boolean): void {
    this.focused = f;
    this.focusRing.setVisible(f);
  }

  private refresh(): void {
    this.pin.setVisible(this.pinned);
    if (this.pinned) {
      this.highlight.setFillStyle(HEX.stampRed, 0.12).setStrokeStyle(1, HEX.stampRed, 0.7);
    } else if (this.hovered || this.focused) {
      this.highlight.setFillStyle(HEX.amber, 0.22).setStrokeStyle(1, HEX.amber, 0.9);
    } else {
      this.highlight.setFillStyle(HEX.amber, 0).setStrokeStyle();
    }
  }
}
