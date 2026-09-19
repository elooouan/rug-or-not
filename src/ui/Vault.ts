import Phaser from 'phaser';
import changelog from '../../CHANGELOG.md?raw';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { HEX } from '@/config/palette';
import { FLAG_IDS } from '@/data/flags';
import { audio } from '@/systems/audio';
import { awardBadge, hasBadge } from '@/systems/badges';
import { saveStore } from '@/systems/save';
import { markEscConsumed, popOverlay, pushOverlay } from './escGuard';
import { LucienBubble } from './LucienBubble';
import { PixelButton } from './PixelButton';
import { rect } from './shapes';
import { attachScroll } from './dragScroll';
import { touchScreen } from './lensLift';
import { charWidth, makeText, wrapMono } from './text';

/** The combination is the number of red flags in the notebook, zero-padded. */
export const VAULT_COMBO = String(FLAG_IDS.length).padStart(3, '0');

/**
 * The floor safe: a three-dial combination lock. Crack it for the
 * developer's ledger (the changelog) and the Safecracker badge.
 */
export class Vault extends Phaser.GameObjects.Container {
  private dials = [0, 0, 0];
  private dialTexts: Phaser.GameObjects.Text[] = [];
  private door!: Phaser.GameObjects.Container;
  private attempts = 0;
  private escBinding?: { key: Phaser.Input.Keyboard.Key; fn: () => void };
  private overlayHeld = true;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    const dim = rect(scene, 0, 0, GAME_WIDTH, GAME_HEIGHT, HEX.bg, 0.65);
    dim.setInteractive({ useHandCursor: false });
    dim.on('pointerdown', () => this.close());
    this.add(dim);

    const w = 220;
    const h = 150;
    const x = (GAME_WIDTH - w) / 2;
    const y = (GAME_HEIGHT - h) / 2;
    this.door = scene.add.container(0, 0);
    this.door.add(rect(scene, x + 4, y + 5, w, h, HEX.bg, 0.6));
    this.door.add(rect(scene, x - 3, y - 3, w + 6, h + 6, HEX.bg));
    const body = rect(scene, x, y, w, h, HEX.shadow);
    body.setInteractive({ useHandCursor: false });
    this.door.add(body);
    this.door.add(rect(scene, x + 8, y + 8, w - 16, h - 16, HEX.woodDark));
    this.door.add(rect(scene, x + 8, y + 8, w - 16, 1, HEX.paperShadow, 0.4));
    this.door.add(
      makeText(scene, x + w / 2, y + 14, 'FLOOR SAFE', {
        size: FONT.size.small,
        color: 'paper',
      }).setOrigin(0.5, 0),
    );
    this.door.add(
      makeText(scene, x + w / 2, y + 26, 'three numbers. one hint: the notebook counts them.', {
        size: FONT.size.tiny,
        color: 'paperShadow',
      }).setOrigin(0.5, 0),
    );

    const slotW = 44;
    const sx = x + (w - slotW * 3) / 2;
    for (let i = 0; i < 3; i++) {
      const cx = sx + i * slotW + slotW / 2;
      this.door.add(rect(scene, cx - 14, y + 58, 28, 28, HEX.bg));
      const t = makeText(scene, cx, y + 72, '0', {
        size: FONT.size.heading,
        color: 'amber',
      }).setOrigin(0.5);
      this.dialTexts.push(t);
      const up = new PixelButton(scene, cx - 9, y + 40, '+', () => this.turn(i, 1), {
        variant: 'paper',
      });
      const down = new PixelButton(scene, cx - 9, y + 88, '-', () => this.turn(i, -1), {
        variant: 'paper',
      });
      scene.children.remove(up);
      scene.children.remove(down);
      this.door.add([t, up, down]);
    }
    const open = new PixelButton(scene, x + w / 2 - 30, y + h - 30, 'OPEN', () => this.tryOpen(), {
      width: 60,
    });
    scene.children.remove(open);
    this.door.add(open);
    const handle = scene.make
      .image({ x: x + w - 22, y: y + h / 2, key: TEX.iconLock }, false)
      .setOrigin(0.5)
      .setScale(1.4);
    this.door.add(handle);
    this.add(this.door);

    const kb = scene.input.keyboard;
    if (kb) {
      const key = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC, false);
      const fn = () => {
        markEscConsumed();
        this.close();
      };
      key.on('down', fn);
      this.escBinding = { key, fn };
    }
    pushOverlay(this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.release());
    this.setDepth(DEPTH.overlay);
    scene.add.existing(this);
    audio.play('click');
  }

  private release(): void {
    if (!this.overlayHeld) return;
    this.overlayHeld = false;
    popOverlay(this);
    this.escBinding?.key.off('down', this.escBinding.fn);
  }

  private turn(i: number, d: number): void {
    this.dials[i] = (this.dials[i] + d + 10) % 10;
    this.dialTexts[i].setText(String(this.dials[i]));
    audio.play('tick');
  }

  private tryOpen(): void {
    if (this.dials.join('') === VAULT_COMBO) {
      audio.play('caseClosed');
      awardBadge(this.scene, 'safecracker');
      this.showLedger();
      return;
    }
    this.attempts++;
    audio.play('wrong');
    if (!saveStore.get().settings.reducedMotion) {
      this.scene.tweens.add({
        targets: this.door,
        x: { from: -3, to: 3 },
        duration: 40,
        yoyo: true,
        repeat: 3,
        onComplete: () => this.door.setX(0),
      });
    }
    if (this.attempts === 2)
      LucienBubble.say(
        this.scene,
        "Three digits. How many red flags does the notebook hold? That's your number.",
        5000,
      );
    if (this.attempts === 5)
      LucienBubble.say(
        this.scene,
        `Fine. Zero, ${VAULT_COMBO[1]}, ${VAULT_COMBO[2]}. I didn't tell you.`,
        5000,
      );
  }

  /** The changelog, typed on ledger paper. */
  private showLedger(): void {
    this.door.destroy();
    const scene = this.scene;
    const w = 440;
    const h = 300;
    const x = (GAME_WIDTH - w) / 2;
    const y = (GAME_HEIGHT - h) / 2;
    const pad = 12;
    this.add(rect(scene, x + 4, y + 5, w, h, HEX.bg, 0.6));
    const paper = rect(scene, x, y, w, h, HEX.paper);
    paper.setInteractive({ useHandCursor: false });
    this.add(paper);
    this.add(
      makeText(scene, x + pad, y + pad - 2, "DEVELOPER'S LEDGER", {
        size: FONT.size.body,
        color: 'stampRed',
      }),
    );
    this.add(
      makeText(
        scene,
        x + w - pad,
        y + pad,
        touchScreen()
          ? 'drag to scroll  ·  tap outside to close'
          : 'wheel to scroll  ·  Esc to close',
        {
          size: FONT.size.tiny,
          color: 'woodMid',
        },
      ).setOrigin(1, 0),
    );

    const content = scene.add.container(x + pad, y + pad + 18);
    this.add(content);
    const maskGfx = scene.make.graphics({ x: 0, y: 0 }, false);
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(x, y + pad + 16, w, h - pad * 2 - 16);
    content.setMask(new Phaser.Display.Masks.GeometryMask(scene, maskGfx));
    const cw = charWidth(scene, 'body', FONT.size.body);
    const maxChars = Math.floor((w - pad * 2) / cw);
    // Markdown hard-wraps bullets; stitch continuation lines back onto their bullet.
    const lines: string[] = [];
    for (const raw of changelog.split('\n')) {
      if (/^\s{2,}\S/.test(raw) && lines.length) lines[lines.length - 1] += ' ' + raw.trim();
      else lines.push(raw);
    }
    let cy = 0;
    // After the nameless file: a folded note on top of the ledger.
    if (hasBadge('tailor-made')) {
      const note = [
        'A folded note, in a hand you do not recognise:',
        '"You read it twice. Next time I will use smaller stitches. - T."',
      ];
      for (const l of note.flatMap((n) => wrapMono(n, maxChars))) {
        content.add(
          makeText(scene, 0, cy, l, { font: 'body', size: FONT.size.body, color: 'stampRed' }),
        );
        cy += 12;
      }
      cy += 8;
    }
    for (const raw of lines) {
      const line = raw.replace(/^#+\s*/, '').replace(/`/g, '');
      if (raw.startsWith('#')) {
        cy += raw === lines[0] ? 0 : 6;
        content.add(
          makeText(scene, 0, cy, line.toUpperCase(), { size: FONT.size.small, color: 'woodDark' }),
        );
        cy += 14;
        continue;
      }
      if (!line.trim()) continue;
      for (const l of wrapMono(line, maxChars)) {
        content.add(
          makeText(scene, 0, cy, l, { font: 'body', size: FONT.size.body, color: 'shadow' }),
        );
        cy += 12;
      }
    }
    const viewH = h - pad * 2 - 16;
    const maxScroll = Math.max(0, cy - viewH);
    let scroll = 0;
    const detach = attachScroll(scene, {
      step: 24,
      onScroll: (d) => {
        scroll = Phaser.Math.Clamp(scroll + d, 0, maxScroll);
        content.setY(y + pad + 18 - scroll);
      },
    });
    this.once(Phaser.GameObjects.Events.DESTROY, detach);
    audio.play('paper');
  }

  close(): void {
    audio.play('click');
    this.release();
    this.destroy();
  }
}
