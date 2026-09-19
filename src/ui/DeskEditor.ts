import Phaser from 'phaser';
import { DEPTH } from '@/config/depth';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { HEX } from '@/config/palette';
import { audio } from '@/systems/audio';
import { awardBadge } from '@/systems/badges';
import { clipBalance } from '@/systems/clips';
import {
  buySpot,
  clampPos,
  deskExtras,
  defaultPos,
  DESK_TOP,
  layoutChanged,
  moveExtra,
  moveProp,
  nextSpotPrice,
  ownedOrnamentKinds,
  PAPERWORK,
  placeExtra,
  PROP_NAME,
  removeExtra,
  resetLayout,
  setExtraKind,
  setPropHidden,
  spotBlocker,
  spotsFree,
  underPaperwork,
  type PropId,
} from '@/systems/deskLayout';
import { saveStore } from '@/systems/save';
import { shareOrDownloadCanvas } from '@/systems/shareCard';
import { floatText, type DeskBackground } from './DeskBackground';
import { dialogueOpen, lucienSays } from './DialogueBox';
import { markEscConsumed, popModal, popOverlay, pushModal, pushOverlay } from './escGuard';
import { touchScreen } from './lensLift';
import { PixelButton } from './PixelButton';
import { rect } from './shapes';
import { makeText } from './text';

/** Something the editor can pick up: a desk prop, an extra ornament, or a scene-owned piece. */
interface Item {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  shown: boolean;
  move(x: number, y: number): void;
  show(on: boolean): void;
}

/** A piece the scene owns (the clock) that should move with the desk too. */
export interface ExternalProp {
  id: PropId;
  obj: Phaser.GameObjects.Container | Phaser.GameObjects.Image;
  w: number;
  h: number;
}

export interface DeskEditorOptions {
  /** The paperwork on the desk (the title card): it slides off while editing. */
  paperwork: Phaser.GameObjects.Container;
  /** Buttons and chrome that fade out while editing. */
  chrome: Phaser.GameObjects.Container[];
  external?: ExternalProp[];
  onClose?: () => void;
}

interface Handle {
  item: Item;
  frame: Phaser.GameObjects.Rectangle;
  cross: Phaser.GameObjects.Container;
  tag: Phaser.GameObjects.Container;
  /** Put the parts where the item is. */
  layout(): void;
  destroy(): void;
}

const GRID_TEX = 'desk-editor-grid';
const TOOLBAR_H = 34;
const TRAY_H = 22;
/** Where a new ornament lands: the clear corner past the stamps. */
const NEW_SPOT = { x: 604, y: 324 };

/**
 * The desk editor. The lamp dims, the paperwork slides off, a grid rises through the wood
 * and every prop on the desk gets a handle: drag it about, cross it off, put it back from
 * the strip at the top. Ornaments from the market can stand on extra spots bought with
 * clips. Everything is saved as it happens; every screen reads the same layout.
 */
export class DeskEditor extends Phaser.GameObjects.Container {
  static current: DeskEditor | null = null;

  private items: Item[] = [];
  private handles: Handle[] = [];
  /** The squared paper, drawn once into a texture: a few hundred lines a frame is a lot for a phone. */
  private grid: Phaser.GameObjects.Image;
  private toolbar: Phaser.GameObjects.Container;
  private escBinding?: { key: Phaser.Input.Keyboard.Key; fn: () => void };
  private held = true;
  private closing = false;
  private shooting = false;
  private readonly motion: boolean;
  private readonly paperworkY: number;
  private readonly changedBefore: boolean;

  constructor(
    scene: Phaser.Scene,
    private desk: DeskBackground,
    private opts: DeskEditorOptions,
  ) {
    super(scene, 0, 0);
    DeskEditor.current?.destroy();
    DeskEditor.current = this;
    this.motion = !saveStore.get().settings.reducedMotion;
    this.paperworkY = opts.paperwork.y;
    this.changedBefore = layoutChanged();
    this.setDepth(DEPTH.hud);
    scene.add.existing(this);

    this.grid = this.makeGrid().setDepth(DEPTH.notebook).setAlpha(0);
    this.toolbar = scene.add.container(0, -TOOLBAR_H - TRAY_H - 8).setDepth(DEPTH.hud + 1);
    this.collectItems();
    this.buildHandles(true);
    this.buildToolbar();

    const kb = scene.input.keyboard;
    if (kb) {
      const key = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC, false);
      const fn = () => {
        // Lucien is talking over the grid: that Esc is his to take.
        if (dialogueOpen(scene)) return;
        markEscConsumed();
        this.close();
      };
      key.on('down', fn);
      this.escBinding = { key, fn };
    }
    pushOverlay(this);
    // Typed words on the title (a stamp, the shop) stay quiet while the desk is in pieces.
    pushModal();
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.release());
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    this.open();
  }

  // ---- items ---------------------------------------------------------------------

  private collectItems(): void {
    const desk = this.desk;
    this.items = desk.movables().map((m) => ({
      ...m,
      move: (x, y) => desk.movePart(m.id, x, y),
      show: (on) => desk.showPart(m.id, on),
    }));
    for (const ext of this.opts.external ?? []) {
      const obj = ext.obj;
      this.items.push({
        id: ext.id,
        name: PROP_NAME[ext.id],
        x: obj.x,
        y: obj.y,
        w: ext.w,
        h: ext.h,
        shown: obj.visible,
        move: (x, y) => obj.setPosition(x, y),
        show: (on) => {
          obj.setVisible(on);
          if (obj.input) obj.input.enabled = on;
        },
      });
    }
  }

  private extraIndex(id: string): number {
    return id.startsWith('extra-') ? Number(id.slice(6)) : -1;
  }

  /** Persist an item's place. */
  private commit(item: Item): void {
    const i = this.extraIndex(item.id);
    if (i >= 0) moveExtra(i, { x: item.x, y: item.y });
    else moveProp(item.id as PropId, { x: item.x, y: item.y });
  }

  private place(item: Item, x: number, y: number): void {
    item.x = x;
    item.y = y;
    item.move(x, y);
    this.handles.find((h) => h.item === item)?.layout();
  }

  /** Cross a thing off: hidden props wait in the strip, an extra ornament leaves its spot. */
  private takeOff(item: Item): void {
    const i = this.extraIndex(item.id);
    audio.play('paper');
    floatText(this.scene, item.x + item.w / 2, item.y - 2, 'off the desk', 'paperShadow');
    if (i >= 0) {
      removeExtra(i);
      this.desk.rebuildExtras();
      this.rebuild();
      return;
    }
    item.shown = false;
    item.show(false);
    setPropHidden(item.id as PropId, true);
    this.rebuild();
  }

  private putBack(id: PropId): void {
    setPropHidden(id, false);
    const item = this.items.find((it) => it.id === id);
    if (!item) return;
    item.shown = true;
    item.show(true);
    audio.play('click');
    this.rebuild();
    const h = this.handles.find((hh) => hh.item.id === id);
    if (h && this.motion)
      this.scene.tweens.add({ targets: h.frame, alpha: { from: 0, to: 1 }, duration: 200 });
  }

  /** Buy a spot if need be, then stand an owned ornament on it. */
  private addOrnament(): void {
    if (spotsFree() <= 0) {
      const blocker = spotBlocker();
      // Said on the strip, not as a toast: toasts land on the Done button.
      if (blocker) {
        audio.play('wrong');
        floatText(this.scene, 320, TOOLBAR_H + 30, blocker, 'stampRed');
        return;
      }
      if (!buySpot()) return;
      audio.play('buy');
      this.buildToolbar();
    }
    const kinds = ownedOrnamentKinds();
    if (kinds.length === 0) {
      audio.play('wrong');
      floatText(this.scene, 320, TOOLBAR_H + 30, 'buy an ornament at the market first', 'stampRed');
      return;
    }
    const taken = deskExtras().length;
    const pos = clampPos(NEW_SPOT.x - taken * 36, NEW_SPOT.y, 28, 28);
    const index = placeExtra(kinds[taken % kinds.length], pos);
    if (index < 0) return;
    this.desk.rebuildExtras();
    this.rebuild();
    const h = this.handles.find((hh) => hh.item.id === `extra-${index}`);
    if (h) floatText(this.scene, h.item.x + 14, h.item.y - 2, `${clipBalance()} clips left`);
    if (h && this.motion) {
      h.frame.setScale(1.3);
      this.scene.tweens.add({ targets: h.frame, scale: 1, duration: 220, ease: 'Back.easeOut' });
    }
  }

  private cycleKind(item: Item): void {
    const i = this.extraIndex(item.id);
    const kinds = ownedOrnamentKinds();
    const extra = deskExtras()[i];
    if (i < 0 || !extra || kinds.length < 2) {
      if (kinds.length < 2) floatText(this.scene, item.x + 14, item.y - 2, 'the only one you own');
      return;
    }
    const next = kinds[(kinds.indexOf(extra.kind) + 1) % kinds.length];
    setExtraKind(i, next);
    audio.play('click');
    this.desk.rebuildExtras();
    this.rebuild();
  }

  private reset(): void {
    resetLayout();
    for (const item of this.items) {
      if (this.extraIndex(item.id) >= 0) continue;
      const def = defaultPos(item.id as PropId);
      item.x = def.x;
      item.y = def.y;
      item.move(def.x, def.y);
      if (!item.shown) {
        item.shown = true;
        item.show(true);
      }
    }
    this.desk.rebuildExtras();
    audio.play('paper');
    this.rebuild();
    floatText(this.scene, 320, TOOLBAR_H + 30, 'the desk as it came');
  }

  /** The extras changed under us (an index shift): handles and the strip from scratch. */
  private rebuild(): void {
    for (const h of this.handles) h.destroy();
    this.handles = [];
    const external = this.items.filter((it) => !this.desk.movables().some((m) => m.id === it.id));
    this.collectItems();
    // Scene-owned pieces keep the state we've been tracking (the desk doesn't know them).
    for (const it of this.items)
      if (!this.desk.movables().some((m) => m.id === it.id)) {
        const prev = external.find((e) => e.id === it.id);
        if (prev) Object.assign(it, { x: prev.x, y: prev.y, shown: prev.shown });
      }
    this.buildHandles(false);
    this.buildToolbar();
  }

  // ---- drawing --------------------------------------------------------------------

  /** Squared paper through the wood, and the paperwork's places hatched out. */
  private makeGrid(): Phaser.GameObjects.Image {
    const scene = this.scene;
    if (scene.textures.exists(GRID_TEX)) scene.textures.remove(GRID_TEX);
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    g.lineStyle(1, HEX.amber, 0.13);
    for (let x = 0; x <= GAME_WIDTH; x += 16) g.lineBetween(x, DESK_TOP, x, GAME_HEIGHT);
    for (let y = DESK_TOP; y <= GAME_HEIGHT; y += 16) g.lineBetween(0, y, GAME_WIDTH, y);
    for (const p of PAPERWORK) {
      // The notebook's patch is only covered while a file is open: a lighter hatch, no fill.
      if (!p.soft) {
        g.fillStyle(HEX.bg, 0.22);
        g.fillRect(p.x, p.y, p.w, p.h);
      }
      g.lineStyle(1, HEX.paperShadow, p.soft ? 0.16 : 0.35);
      g.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);
      for (let d = -p.h; d < p.w; d += p.soft ? 24 : 12) {
        const x0 = Math.max(p.x, p.x + d);
        const y0 = p.y + (x0 - (p.x + d));
        const x1 = Math.min(p.x + p.w, p.x + d + p.h);
        const y1 = p.y + (x1 - (p.x + d));
        if (x1 > x0) g.lineBetween(x0, y0, x1, y1);
      }
    }
    g.generateTexture(GRID_TEX, GAME_WIDTH, GAME_HEIGHT);
    g.destroy();
    return scene.add.image(0, 0, GRID_TEX).setOrigin(0);
  }

  private buildHandles(entering: boolean): void {
    let i = 0;
    for (const item of this.items) {
      if (!item.shown) continue;
      const h = this.makeHandle(item);
      this.handles.push(h);
      if (entering && this.motion) {
        h.frame.setAlpha(0);
        h.cross.setAlpha(0);
        h.tag.setAlpha(0);
        this.scene.tweens.add({
          targets: [h.frame, h.cross, h.tag],
          alpha: 1,
          duration: 180,
          delay: 260 + i * 45,
        });
      }
      i++;
    }
  }

  private makeHandle(item: Item): Handle {
    const scene = this.scene;
    const isExtra = this.extraIndex(item.id) >= 0;
    const frame = scene.add
      .rectangle(0, 0, item.w + 4, item.h + 4, HEX.amber, 0.06)
      .setOrigin(0)
      .setStrokeStyle(1, HEX.amber, 0.9)
      .setDepth(DEPTH.hud);
    frame.setInteractive({ useHandCursor: false, draggable: true });

    const cross = scene.add.container(0, 0).setDepth(DEPTH.hud + 1);
    const crossBox = rect(scene, 0, 0, 12, 12, HEX.stampRed);
    crossBox.setInteractive({ useHandCursor: false });
    cross.add([
      crossBox,
      makeText(scene, 6, 6, 'x', { size: FONT.size.small, color: 'paper' }).setOrigin(0.5, 0.55),
    ]);
    crossBox.on('pointerover', () => audio.play('hover'));
    crossBox.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        this.takeOff(item);
      },
    );

    const kind = isExtra ? deskExtras()[this.extraIndex(item.id)]?.kind : null;
    const label = isExtra
      ? `${kind ?? 'ornament'}${ownedOrnamentKinds().length > 1 ? ' ▸' : ''}`
      : item.name;
    const tag = scene.add.container(0, 0).setDepth(DEPTH.hud + 1);
    const tagText = makeText(scene, 3, 1, label, { size: FONT.size.tiny, color: 'shadow' });
    const tagBox = rect(scene, 0, 0, Math.ceil(tagText.width) + 6, 11, HEX.paper);
    tag.add([tagBox, tagText]);
    if (isExtra) {
      tagBox.setInteractive({ useHandCursor: false });
      tagBox.on('pointerover', () => audio.play('hover'));
      tagBox.on(
        'pointerdown',
        (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
          ev.stopPropagation();
          this.cycleKind(item);
        },
      );
    }

    const layout = () => {
      frame.setPosition(item.x - 2, item.y - 2);
      cross.setPosition(item.x + item.w - 4, item.y - 8);
      const below = item.y + item.h + 4;
      tag.setPosition(item.x - 2, below + 11 > GAME_HEIGHT ? item.y - 14 : below);
    };
    layout();

    let start = { x: item.x, y: item.y };
    let moved = 0;
    frame.on('pointerover', () => frame.setFillStyle(HEX.amber, 0.16));
    frame.on('pointerout', () => frame.setFillStyle(HEX.amber, 0.06));
    frame.on('dragstart', () => {
      start = { x: item.x, y: item.y };
      moved = 0;
      audio.play('tick');
      frame.setStrokeStyle(1, HEX.paper, 1);
    });
    frame.on('drag', (_p: Phaser.Input.Pointer, dx: number, dy: number) => {
      moved++;
      this.place(item, Math.round(dx) + 2, Math.round(dy) + 2);
      const bad = underPaperwork(item);
      frame.setStrokeStyle(1, bad ? HEX.stampRed : HEX.paper, 1);
    });
    frame.on('dragend', () => {
      frame.setStrokeStyle(1, HEX.amber, 0.9);
      if (moved < 2) {
        this.place(item, start.x, start.y);
        return;
      }
      const snapped = clampPos(item.x, item.y, item.w, item.h);
      const under = underPaperwork({ ...snapped, w: item.w, h: item.h });
      if (under) {
        audio.play('wrong');
        floatText(scene, item.x + item.w / 2, item.y - 2, `under ${under}`, 'stampRed');
        if (!this.motion) {
          this.place(item, start.x, start.y);
          return;
        }
        const from = { x: item.x, y: item.y };
        scene.tweens.addCounter({
          from: 0,
          to: 1,
          duration: 220,
          ease: 'Quad.easeOut',
          onUpdate: (tw) => {
            const t = tw.getValue() ?? 1;
            this.place(
              item,
              Math.round(from.x + (start.x - from.x) * t),
              Math.round(from.y + (start.y - from.y) * t),
            );
          },
          onComplete: () => this.place(item, start.x, start.y),
        });
        return;
      }
      this.place(item, snapped.x, snapped.y);
      this.commit(item);
      audio.play('click');
    });

    return {
      item,
      frame,
      cross,
      tag,
      layout,
      destroy: () => {
        frame.destroy();
        cross.destroy();
        tag.destroy();
      },
    };
  }

  private buildToolbar(): void {
    const scene = this.scene;
    const tb = this.toolbar;
    tb.removeAll(true);
    const hidden = this.items.filter((it) => !it.shown);
    const h = TOOLBAR_H + (hidden.length ? TRAY_H : 0);
    tb.add(rect(scene, 0, 0, GAME_WIDTH, h + 3, HEX.bg, 0.5));
    tb.add(rect(scene, 0, 0, GAME_WIDTH, h, HEX.paper));
    tb.add(rect(scene, 0, h - 2, GAME_WIDTH, 2, HEX.paperShadow));
    const verb = touchScreen()
      ? 'drag a thing, tap x to take it off'
      : 'drag a thing, x takes it off';
    tb.add(makeText(scene, 8, 6, 'ARRANGE THE DESK', { size: FONT.size.small, color: 'stampRed' }));
    tb.add(
      makeText(scene, 8, 18, `${verb}  ·  ${clipBalance()} clips`, {
        font: 'body',
        size: FONT.size.body,
        color: 'shadow',
      }),
    );
    // Buttons sit mid-strip: the right end is where toasts land (a bought spot, a badge).
    let bx = 250;
    const btn = (label: string, fn: () => void, variant: 'paper' | 'ink' = 'paper') => {
      const b = new PixelButton(scene, bx, 8, label, fn, { variant });
      bx += b.bw + 4;
      scene.children.remove(b);
      tb.add(b);
      return b;
    };
    const price = nextSpotPrice();
    const free = spotsFree();
    btn(
      free > 0
        ? `+ ornament (${free} spot${free > 1 ? 's' : ''} free)`
        : price === null
          ? 'No more spots'
          : `+ spot (${price} clips)`,
      () => this.addOrnament(),
    );
    btn('Reset', () => this.reset());
    btn('Photo', () => void this.photo());
    btn(touchScreen() ? 'Done' : 'Done [Esc]', () => this.close(), 'ink');
    if (hidden.length) {
      tb.add(
        makeText(scene, 8, TOOLBAR_H + 5, 'off the desk:', {
          font: 'body',
          size: FONT.size.body,
          color: 'woodMid',
        }),
      );
      let tx = 84;
      for (const it of hidden) {
        const b = new PixelButton(scene, tx, TOOLBAR_H + 2, `+ ${it.name}`, () =>
          this.putBack(it.id as PropId),
        );
        scene.children.remove(b);
        tb.add(b);
        tx += b.bw + 4;
      }
    }
  }

  /**
   * A picture of the desk as arranged, lamp up, handles and strip out of frame: the share
   * sheet on a phone, a download elsewhere.
   */
  private async photo(): Promise<void> {
    if (this.closing || this.shooting) return;
    this.shooting = true;
    const scene = this.scene;
    const hidden = [
      ...this.handles.flatMap((h) => [h.frame, h.cross, h.tag]),
      this.grid,
      this.toolbar,
    ];
    const light = this.desk.light.alpha;
    hidden.forEach((o) => o.setVisible(false));
    this.desk.light.setAlpha(1);
    audio.play('click');
    try {
      // The snapshot is taken after the next render, with the desk dressed for it.
      const img = await new Promise<HTMLImageElement>((res) =>
        scene.game.renderer.snapshot((i) => res(i as HTMLImageElement)),
      );
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      c.getContext('2d')?.drawImage(img, 0, 0);
      const out = await shareOrDownloadCanvas(
        c,
        'rug-or-not-desk.png',
        'My desk, arranged. Rug or Not?',
      );
      const word = { shared: 'shared', downloaded: 'saved', cancelled: 'kept', failed: 'no photo' }[
        out
      ];
      floatText(scene, 320, TOOLBAR_H + 30, word, out === 'failed' ? 'stampRed' : 'paper');
    } finally {
      if (this.active) {
        hidden.forEach((o) => o.active && o.setVisible(true));
        this.desk.light.setAlpha(light);
      }
      this.shooting = false;
    }
  }

  // ---- in and out -------------------------------------------------------------------

  private open(): void {
    const scene = this.scene;
    const { paperwork, chrome } = this.opts;
    lucienSays(scene, 'editor');
    audio.play('slide');
    this.desk.setFlicker(false);
    if (!this.motion) {
      paperwork.setY(this.paperworkY + GAME_HEIGHT);
      for (const c of chrome) c.setVisible(false);
      this.desk.light.setAlpha(0.4);
      this.grid.setAlpha(1);
      this.toolbar.setY(0);
      return;
    }
    scene.tweens.add({
      targets: paperwork,
      y: this.paperworkY + GAME_HEIGHT,
      duration: 340,
      ease: 'Quad.easeIn',
    });
    scene.tweens.add({
      targets: chrome,
      alpha: 0,
      duration: 180,
      onComplete: () => chrome.forEach((c) => c.setVisible(false)),
    });
    scene.tweens.add({ targets: this.desk.light, alpha: 0.4, duration: 420 });
    scene.tweens.add({ targets: this.grid, alpha: 1, duration: 420, delay: 140 });
    scene.tweens.add({
      targets: this.toolbar,
      y: 0,
      duration: 380,
      delay: 220,
      ease: 'Back.easeOut',
    });
  }

  close(): void {
    if (this.closing) return;
    this.closing = true;
    const scene = this.scene;
    const { paperwork, chrome, onClose } = this.opts;
    if (!this.changedBefore && layoutChanged()) awardBadge(scene, 'feng-shui');
    const s = saveStore.get().settings;
    const finish = () => {
      this.desk.light.setAlpha(1);
      this.desk.setFlicker(s.lampFlicker && this.motion);
      paperwork.setY(this.paperworkY);
      for (const c of chrome) c.setVisible(true).setAlpha(1);
      this.destroy();
      onClose?.();
    };
    audio.play('paper');
    if (!this.motion) {
      finish();
      return;
    }
    for (const h of this.handles) h.frame.disableInteractive();
    scene.tweens.add({
      targets: this.handles.flatMap((h) => [h.frame, h.cross, h.tag]),
      alpha: 0,
      duration: 160,
    });
    scene.tweens.add({ targets: this.grid, alpha: 0, duration: 260 });
    scene.tweens.add({
      targets: this.toolbar,
      y: -TOOLBAR_H - TRAY_H - 8,
      duration: 220,
      ease: 'Quad.easeIn',
    });
    // The lamp comes up, with the little stutter a real bulb has.
    scene.tweens.chain({
      targets: this.desk.light,
      tweens: [
        { alpha: 1, duration: 240, delay: 120 },
        { alpha: 0.78, duration: 50, yoyo: true, repeat: 1 },
      ],
    });
    chrome.forEach((c) => c.setVisible(true));
    scene.tweens.add({ targets: chrome, alpha: 1, duration: 200, delay: 320 });
    scene.tweens.add({
      targets: paperwork,
      y: this.paperworkY,
      duration: 420,
      delay: 140,
      ease: 'Back.easeOut',
      onComplete: finish,
    });
  }

  private release(): void {
    if (!this.held) return;
    this.held = false;
    popOverlay(this);
    popModal();
    this.escBinding?.key.off('down', this.escBinding.fn);
    for (const h of this.handles) h.destroy();
    this.handles = [];
    this.grid.destroy();
    this.toolbar.destroy();
    if (DeskEditor.current === this) DeskEditor.current = null;
  }
}
