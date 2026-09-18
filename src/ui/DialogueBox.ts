import Phaser from 'phaser';
import { DEPTH } from '@/config/depth';
import { DIALOGUE, FONT } from '@/config/layout';
import { HEX } from '@/config/palette';
import { LUCIEN, type DialogueLine, type ScriptId } from '@/data/dialogue';
import { audio } from '@/systems/audio';
import { claimHint } from '@/systems/hints';
import { saveStore } from '@/systems/save';
import { squish } from './squish';
import { rect } from './shapes';
import { makeText } from './text';
import { markEscConsumed, popOverlay, pushOverlay } from './escGuard';

export const LUCIEN_TEX = 'lucien';
export const LUCIEN_FACE_TEX = 'lucien-face';

export type Conditions = Record<string, () => boolean>;

export interface DialogueOpts {
  /** Predicates for lines that `waitFor` something. */
  conditions?: Conditions;
  onDone?: () => void;
}

/**
 * Pokémon-trainer style dialogue: Lucien stands beside a paper box, lines
 * type out with blips, click/Enter/Space advances, and some lines wait for
 * the player to actually do the thing.
 */
/** The box each scene is showing, so a new one replaces it instead of stacking. */
const OPEN = new WeakMap<Phaser.Scene, DialogueBox>();

export class DialogueBox extends Phaser.GameObjects.Container {
  private lines: DialogueLine[];
  private index = -1;
  private textObj: Phaser.GameObjects.Text;
  private promptObj: Phaser.GameObjects.Text;
  private arrow: Phaser.GameObjects.Text;
  private mascot: Phaser.GameObjects.Image;
  private shown = 0;
  private acc = 0;
  private typing = false;
  private waiting = false;
  private conditions: Conditions;
  private onDone?: () => void;
  private keyBindings: { key: Phaser.Input.Keyboard.Key; fn: () => void }[] = [];
  private finished = false;

  constructor(scene: Phaser.Scene, lines: DialogueLine[], opts: DialogueOpts = {}) {
    super(scene, 0, 0);
    // One Lucien at a time: whatever he was saying ends now, before this box opens. This
    // box claims the slot first so a box opened from the old one's onDone replaces it too.
    const prev = OPEN.get(scene);
    OPEN.set(scene, this);
    prev?.finish(true);
    this.lines = lines;
    this.conditions = opts.conditions ?? {};
    this.onDone = opts.onDone;
    const { x, y, w, h, padding } = DIALOGUE;

    const shadow = rect(scene, x + 3, y + 4, w, h, HEX.bg, 0.55);
    const border = rect(scene, x - 2, y - 2, w + 4, h + 4, HEX.woodDark);
    const paper = rect(scene, x, y, w, h, HEX.paper);
    const inner = rect(scene, x + 2, y + 2, w - 4, h - 4).setStrokeStyle(1, HEX.paperShadow);
    const tag = rect(scene, x + 8, y - 8, 52, 12, HEX.stampRed);
    const tagText = makeText(scene, x + 34, y - 7, 'LUCIEN', {
      size: FONT.size.small,
      color: 'paper',
    }).setOrigin(0.5, 0);
    this.add([shadow, border, paper, inner, tag, tagText]);

    this.textObj = makeText(scene, x + padding, y + padding, '', {
      size: FONT.size.bodyLarge,
      font: 'body',
      color: 'shadow',
      wrap: DIALOGUE.textWidth,
      lineSpacing: -2,
    });
    this.promptObj = makeText(scene, x + w - padding, y + h - 12, '', {
      size: FONT.size.tiny,
      color: 'ink',
    }).setOrigin(1, 0);
    this.arrow = makeText(scene, x + w - padding, y + h - 13, 'v', {
      size: FONT.size.small,
      color: 'woodDark',
    })
      .setOrigin(1, 0)
      .setVisible(false);
    const skip = makeText(scene, x + w - padding, y + 3, 'skip [Esc]', {
      size: FONT.size.tiny,
      color: 'paperShadow',
    }).setOrigin(1, 0);
    skip.setInteractive({ useHandCursor: false });
    skip.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        this.finish();
      },
    );
    this.add([this.textObj, this.promptObj, this.arrow, skip]);

    // Lucien himself, feet on the baseline, bobbing gently.
    const m = DIALOGUE.mascot;
    this.mascot = scene.make.image({ x: m.x, y: m.y, key: LUCIEN_TEX }, false).setOrigin(0, 1);
    this.mascot.setDisplaySize(
      Math.round(this.mascot.width * (m.height / this.mascot.height)),
      m.height,
    );
    this.add(this.mascot);
    if (!saveStore.get().settings.reducedMotion) {
      scene.tweens.add({
        targets: this.mascot,
        y: m.y - 2,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Clicking the box advances.
    paper.setInteractive({ useHandCursor: false });
    paper.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        this.advance();
      },
    );
    const kb = scene.input.keyboard;
    if (kb) {
      // Keys are shared per scene (addKey returns the same object), so we only
      // ever add and remove our own listeners, never destroy the Key.
      const bind = (code: number, fn: () => void) => {
        const key = kb.addKey(code, false);
        key.on('down', fn);
        this.keyBindings.push({ key, fn });
      };
      bind(Phaser.Input.Keyboard.KeyCodes.ENTER, () => this.advance());
      bind(Phaser.Input.Keyboard.KeyCodes.SPACE, () => this.advance());
      bind(Phaser.Input.Keyboard.KeyCodes.ESC, () => {
        markEscConsumed();
        this.finish();
      });
    }

    this.setDepth(DEPTH.toast);
    scene.add.existing(this);
    // Containers aren't on the update list; hook the scene's update event instead.
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.onSceneUpdate, this);
    this.once(Phaser.GameObjects.Events.DESTROY, () =>
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.onSceneUpdate, this),
    );

    // Slide in.
    if (!saveStore.get().settings.reducedMotion) {
      this.setY(40).setAlpha(0);
      scene.tweens.add({ targets: this, y: 0, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    }
    pushOverlay();
    this.overlayHeld = true;
    // A scene shutdown can destroy us without finish(); keep the overlay count honest.
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.releaseOverlay());
    audio.play('slide');
    scene.events.emit('dialogue:open');
    this.nextLine();
  }

  get isActive(): boolean {
    return !this.finished;
  }

  private nextLine(): void {
    this.index++;
    const line = this.lines[this.index];
    if (!line) {
      this.finish();
      return;
    }
    this.shown = 0;
    this.acc = 0;
    this.typing = true;
    this.waiting = false;
    this.textObj.setText('');
    this.arrow.setVisible(false);
    this.promptObj.setText('');
    if (!saveStore.get().settings.reducedMotion) squish(this.scene, this.mascot);
  }

  /** Click / Enter: finish typing, or move on when allowed. */
  advance(): void {
    if (this.finished) return;
    const line = this.lines[this.index];
    if (!line) return;
    if (this.typing) {
      this.shown = line.text.length;
      this.textObj.setText(line.text);
      this.typing = false;
      this.afterTyped();
      return;
    }
    if (this.waiting) return; // must do the thing
    audio.play('ui');
    this.nextLine();
  }

  private afterTyped(): void {
    const line = this.lines[this.index];
    if (line?.waitFor) {
      const cond = this.conditions[line.waitFor];
      if (cond && !cond()) {
        this.waiting = true;
        this.promptObj.setText(`> ${line.prompt ?? 'go ahead'}`);
        return;
      }
      // Already done it: move along without asking for a click.
      this.scene.time.delayedCall(
        600,
        () => !this.finished && this.index < this.lines.length && this.nextLine(),
      );
      return;
    }
    this.arrow.setVisible(true);
  }

  private onSceneUpdate(_time: number, delta: number): void {
    this.tick(delta);
  }

  tick(delta: number): void {
    if (this.finished) return;
    const line = this.lines[this.index];
    if (!line) return;
    if (this.typing) {
      const reduced = saveStore.get().settings.reducedMotion;
      this.acc += delta;
      const speed = reduced ? 1 : DIALOGUE.typeSpeedMs;
      while (this.acc >= speed && this.shown < line.text.length) {
        this.acc -= speed;
        this.shown++;
        if (this.shown % 3 === 0 && line.text[this.shown - 1] !== ' ') audio.play('hover');
      }
      this.textObj.setText(line.text.slice(0, this.shown));
      if (this.shown >= line.text.length) {
        this.typing = false;
        this.afterTyped();
      }
      return;
    }
    if (this.waiting) {
      const cond = line.waitFor ? this.conditions[line.waitFor] : undefined;
      if (!cond || cond()) {
        this.waiting = false;
        this.promptObj.setText('');
        audio.play('correct');
        this.scene.time.delayedCall(500, () => !this.finished && this.nextLine());
      }
      return;
    }
    // Blink the advance arrow.
    this.arrow.setVisible(Math.floor(this.scene.time.now / 400) % 2 === 0);
  }

  private overlayHeld = false;

  private releaseOverlay(): void {
    if (!this.overlayHeld) return;
    this.overlayHeld = false;
    popOverlay();
  }

  /** Close the box; `now` skips the slide-out (another box is taking the spot). */
  finish(now = false): void {
    if (this.finished) return;
    this.finished = true;
    this.releaseOverlay();
    if (OPEN.get(this.scene) === this) OPEN.delete(this.scene);
    this.keyBindings.forEach(({ key, fn }) => key.off('down', fn));
    this.keyBindings = [];
    const done = () => {
      const scene = this.scene;
      this.destroy();
      scene?.events.emit('dialogue:close');
      this.onDone?.();
    };
    if (now || saveStore.get().settings.reducedMotion) done();
    else
      this.scene.tweens.add({
        targets: this,
        y: 40,
        alpha: 0,
        duration: 200,
        ease: 'Quad.easeIn',
        onComplete: done,
      });
  }
}

/** Show a script once (per save). Returns null when it was already seen or hints are off. */
export function lucienSays(
  scene: Phaser.Scene,
  id: ScriptId,
  opts: DialogueOpts = {},
): DialogueBox | null {
  if (!claimHint(id)) return null;
  return new DialogueBox(scene, LUCIEN[id], opts);
}

/** Always show (for easter eggs / replays). */
export function lucienSaysNow(
  scene: Phaser.Scene,
  id: ScriptId,
  opts: DialogueOpts = {},
): DialogueBox {
  return new DialogueBox(scene, LUCIEN[id], opts);
}
