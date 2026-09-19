import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { FONT, LENS, PAPER, RENDER_SCALE } from '@/config/layout';
import { HEX, type PaletteKey } from '@/config/palette';
import { isFlagClue, type CaseDocument, type Clue } from '@/data/schema';
import { audio } from '@/systems/audio';
import { makeRng } from '@/systems/rng';
import { ClueSpot, type SpotRect } from './ClueSpot';
import { makeText, type TextOpts } from './text';
import { rect } from '@/ui/shapes';

export interface DocContext {
  /** Accessibility mode: fine print rendered inline at normal size. */
  noMagnifier: boolean;
  registerFinePrint(obj: Phaser.GameObjects.GameObject): void;
  onPinToggle(clue: Clue, pinned: boolean): void;
  onStrayChange(count: number): void;
  onHoverSpot(over: boolean, clueId: string): void;
  /** Second look after the report: nothing can be pinned, a click on a spot asks about it. */
  review?: boolean;
  onInspect?(clue: Clue): void;
}

export interface Row {
  container: Phaser.GameObjects.Container;
  height: number;
  spots: ClueSpot[];
}

const TYPE_LABEL: Record<CaseDocument['type'], string> = {
  contract: 'CONTRACT',
  tokenomics: 'TOKENOMICS',
  team: 'TEAM',
  chat: 'COMMUNITY',
  liquidity: 'LIQUIDITY',
  audit: 'AUDIT',
};

/**
 * Base class for every evidence document. A sheet of cream paper with a title
 * strip and a stack of rows. Rows that don't fit are hidden and the player
 * scrolls by whole rows (wheel / PageUp / PageDown), which keeps everything
 * pixel-aligned and lens-friendly without masks.
 */
export abstract class DocumentView extends Phaser.GameObjects.Container {
  readonly doc: CaseDocument;
  protected readonly ctx: DocContext;
  protected rows: Row[] = [];
  protected firstRow = 0;
  protected readonly contentX = PAPER.padding;
  protected readonly contentY = PAPER.padding + PAPER.titleHeight;
  protected readonly contentW = PAPER.w - PAPER.padding * 2;
  protected readonly contentH = PAPER.h - PAPER.padding * 2 - PAPER.titleHeight;
  private strayPins: Phaser.GameObjects.Image[] = [];
  private scrollDown: Phaser.GameObjects.Text;
  private scrollUp: Phaser.GameObjects.Text;
  private focusIndex = -1;
  /** Extra rows drawn absolutely (pie charts etc.) live here, unaffected by scrolling. */
  protected fixed: Phaser.GameObjects.Container;
  protected scrollArea: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, doc: CaseDocument, ctx: DocContext) {
    super(scene, PAPER.x, PAPER.y);
    this.doc = doc;
    this.ctx = ctx;
    const rng = makeRng(`doc:${doc.title}`);

    const shadow = scene.make
      .image({ x: PAPER.shadowOffset, y: PAPER.shadowOffset, key: TEX.paper }, false)
      .setOrigin(0)
      .setTint(HEX.bg)
      .setAlpha(0.55);
    const paper = scene.make.image({ x: 0, y: 0, key: TEX.paper }, false).setOrigin(0);
    paper.setInteractive({ useHandCursor: false });
    // Taps on empty paper drop a stray pin; drags (inspecting with the lens) don't, and
    // neither does a release whose press landed elsewhere: an overlay that closes on
    // pointerdown (the pause menu's Resume, the phone's dim) must not pin the paper under it.
    let pressedHere = false;
    paper.on('pointerdown', () => (pressedHere = true));
    paper.on('pointerout', () => (pressedHere = false));
    paper.on('pointerup', (p: Phaser.Input.Pointer, lx: number, ly: number) => {
      const ok = pressedHere;
      pressedHere = false;
      if (!ok || p.rightButtonReleased() || p.getDistance() > 8 || ctx.review) return;
      this.addStrayPin(Math.round(lx), Math.round(ly));
    });
    this.add([shadow, paper]);

    // Paper dressing: a coffee ring on some docs, a clip on the corner.
    if (rng.chance(0.5)) {
      this.add(
        scene.make
          .image(
            {
              x: rng.int(PAPER.w - 90, PAPER.w - 50),
              y: rng.int(PAPER.h - 80, PAPER.h - 50),
              key: TEX.coffeeRing,
            },
            false,
          )
          .setOrigin(0),
      );
    }
    this.add(
      scene.make.image({ x: rng.int(20, 60), y: -6, key: TEX.paperclip }, false).setOrigin(0),
    );

    // Title strip.
    const title = makeText(scene, PAPER.padding, PAPER.padding - 2, doc.title.toUpperCase(), {
      size: 12,
      color: 'woodDark',
      font: 'ui',
    });
    const typeLabel = makeText(
      scene,
      PAPER.w - PAPER.padding,
      PAPER.padding - 1,
      TYPE_LABEL[doc.type],
      { size: 8, color: 'paperShadow' },
    ).setOrigin(1, 0);
    const rule = rect(
      scene,
      PAPER.padding,
      PAPER.padding + PAPER.titleHeight - 5,
      this.contentW,
      1,
      HEX.paperShadow,
    );
    this.add([title, typeLabel, rule]);

    this.scrollArea = scene.make.container({ x: 0, y: 0 }, false);
    this.fixed = scene.make.container({ x: 0, y: 0 }, false);
    this.add([this.scrollArea, this.fixed]);
    // Scroll hints double as tap targets for touch screens (no wheel there).
    const hint = (x: number, label: string, originX: number, dir: number) => {
      const t = makeText(scene, x, PAPER.h - PAPER.padding + 2, label, {
        size: 8,
        color: 'woodMid',
      })
        .setOrigin(originX, 0)
        .setVisible(false);
      // A fatter hit box than the 8px text, for thumbs.
      t.setInteractive(
        new Phaser.Geom.Rectangle(-8, -8, t.width + 16, t.height + 16),
        Phaser.Geom.Rectangle.Contains,
      );
      let pressed = false;
      t.on(
        'pointerdown',
        (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
          pressed = true;
          ev.stopPropagation();
        },
      );
      t.on(
        'pointerup',
        (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
          ev.stopPropagation();
          if (!pressed) return;
          pressed = false;
          this.scroll(dir);
        },
      );
      this.add(t);
      return t;
    };
    this.scrollUp = hint(PAPER.padding, '^  up', 0, -1);
    this.scrollDown = hint(PAPER.w - PAPER.padding, 'v  more', 1, 1);

    this.build();
    this.layout();
    scene.add.existing(this);
  }

  /** Subclasses add rows and fixed elements here. */
  protected abstract build(): void;

  // ---- row API -------------------------------------------------------------

  protected addRow(
    height: number,
    build: (row: Phaser.GameObjects.Container, rowIndex: number) => void,
  ): Row {
    const container = this.scene.make.container({ x: this.contentX, y: 0 }, false);
    const row: Row = { container, height: Math.ceil(height), spots: [] };
    this.rows.push(row);
    this.scrollArea.add(container);
    build(container, this.rows.length - 1);
    return row;
  }

  private rowOf(c: Phaser.GameObjects.Container | Row): Row {
    if (!(c instanceof Phaser.GameObjects.Container)) return c;
    const row = this.rows.find((r) => r.container === c);
    if (!row) throw new Error('DocumentView: unknown row container');
    return row;
  }

  protected addSpot(
    rowRef: Phaser.GameObjects.Container | Row,
    clue: Clue,
    rect: SpotRect,
  ): ClueSpot {
    const row = this.rowOf(rowRef);
    const spot = new ClueSpot(this.scene, clue, rect, {
      onToggle: (s) => this.togglePin(s),
      onHover: (s, over) => this.ctx.onHoverSpot(over, s.clue.id),
    });
    row.spots.push(spot);
    row.container.add(spot);
    return spot;
  }

  /**
   * Render a clue's fine print. With the magnifier enabled it's tiny and
   * hidden from the main camera; in accessibility mode it's normal-sized with
   * a dotted underline. Returns the rect it occupies (relative to the row).
   */
  protected addFinePrint(
    rowRef: Phaser.GameObjects.Container | Row,
    clue: Clue,
    x: number,
    y: number,
    maxW: number,
    color: PaletteKey = 'woodMid',
  ): SpotRect {
    const row = this.rowOf(rowRef);
    const text = clue.text ?? '';
    if (this.ctx.noMagnifier) {
      const t = makeText(this.scene, x, y, text, {
        size: FONT.size.body,
        font: 'body',
        color: 'ink',
        wrap: maxW,
      });
      const underline = this.scene.make.graphics({ x: 0, y: 0 }, false);
      underline.fillStyle(HEX.ink, 1);
      const uy = y + t.height - 1;
      for (let dx = 0; dx < Math.min(t.width, maxW); dx += 4) underline.fillRect(x + dx, uy, 2, 1);
      row.container.add([t, underline]);
      // Inline print can wrap where the tiny print wouldn't; the row makes room for it
      // instead of running into the one below.
      row.height = Math.max(row.height, Math.ceil(y + t.height) + 2);
      return { x, y, w: Math.ceil(t.width), h: Math.ceil(t.height) };
    }
    const t = makeText(this.scene, x, y, text, {
      size: FONT.size.finePrint,
      font: 'body',
      color,
      wrap: maxW,
      resolution: LENS.zoom * RENDER_SCALE,
    });
    row.container.add(t);
    this.ctx.registerFinePrint(t);
    return { x, y, w: Math.ceil(t.width), h: Math.ceil(t.height) };
  }

  /**
   * Faint text that only the lens picks up (deleted chat messages linger in the
   * cache). Like fine print, but flavour rather than a clue: no spot, no points.
   */
  protected addGhost(
    rowRef: Phaser.GameObjects.Container | Row,
    text: string,
    x: number,
    y: number,
    maxW: number,
  ): void {
    const row = this.rowOf(rowRef);
    if (this.ctx.noMagnifier) {
      row.container.add(
        makeText(this.scene, x, y, text, {
          size: FONT.size.body,
          font: 'body',
          color: 'paperShadow',
          wrap: maxW,
        }),
      );
      return;
    }
    const t = makeText(this.scene, x, y, text, {
      size: FONT.size.finePrint,
      font: 'body',
      color: 'paperShadow',
      wrap: maxW,
      resolution: LENS.zoom * RENDER_SCALE,
    });
    row.container.add(t);
    this.ctx.registerFinePrint(t);
  }

  protected text(x: number, y: number, str: string, opts: TextOpts = {}): Phaser.GameObjects.Text {
    return makeText(this.scene, x, y, str, {
      font: 'body',
      size: FONT.size.body,
      color: 'shadow',
      ...opts,
    });
  }

  /** Height of one body line. */
  protected get lh(): number {
    return PAPER.lineHeight;
  }

  // ---- layout / scrolling ---------------------------------------------------

  layout(): void {
    let y = this.contentY;
    let lastVisible = -1;
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      const visible = i >= this.firstRow && y + row.height <= this.contentY + this.contentH;
      row.container.setVisible(visible).setY(y);
      if (visible) {
        y += row.height;
        lastVisible = i;
      }
    }
    this.scrollDown.setVisible(lastVisible < this.rows.length - 1);
    this.scrollUp.setVisible(this.firstRow > 0);
  }

  scroll(dir: number): boolean {
    const maxFirst = this.maxFirstRow();
    const next = Phaser.Math.Clamp(this.firstRow + dir, 0, maxFirst);
    if (next === this.firstRow) return false;
    this.firstRow = next;
    this.layout();
    audio.play('tick');
    return true;
  }

  private maxFirstRow(): number {
    // Smallest firstRow such that the remaining rows all fit.
    let h = 0;
    for (let i = this.rows.length - 1; i >= 0; i--) {
      h += this.rows[i].height;
      if (h > this.contentH) return Math.min(i + 1, this.rows.length - 1);
    }
    return 0;
  }

  /** World-space hit test against the paper. */
  containsPoint(x: number, y: number): boolean {
    return (
      this.visible && x >= this.x && x < this.x + PAPER.w && y >= this.y && y < this.y + PAPER.h
    );
  }

  // ---- pins ------------------------------------------------------------------

  private togglePin(spot: ClueSpot): void {
    if (this.ctx.review) {
      this.ctx.onInspect?.(spot.clue);
      return;
    }
    spot.setPinned(!spot.pinned);
    audio.play(spot.pinned ? 'pin' : 'unpin');
    this.ctx.onPinToggle(spot.clue, spot.pinned);
  }

  private addStrayPin(x: number, y: number): void {
    const pin = this.scene.make
      .image({ x: x - 4, y: y - 10, key: TEX.pinStray }, false)
      .setOrigin(0);
    pin.setInteractive({ useHandCursor: false });
    pin.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) =>
        ev.stopPropagation(),
    );
    pin.on(
      'pointerup',
      (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev.stopPropagation();
        pin.destroy();
        this.strayPins = this.strayPins.filter((s) => s !== pin);
        audio.play('unpin');
        this.ctx.onStrayChange(this.strayPins.length);
      },
    );
    this.add(pin);
    this.strayPins.push(pin);
    audio.play('pin');
    this.ctx.onStrayChange(this.strayPins.length);
  }

  get strayCount(): number {
    return this.strayPins.length;
  }

  allSpots(): ClueSpot[] {
    return this.rows.flatMap((r) => r.spots);
  }

  /** Spots in rows currently on the page (not scrolled away). */
  visibleSpots(): ClueSpot[] {
    return this.rows.filter((r) => r.container.visible).flatMap((r) => r.spots);
  }

  pinnedIds(): string[] {
    return this.allSpots()
      .filter((s) => s.pinned)
      .map((s) => s.clue.id);
  }

  /**
   * The second look: the run's pins go back where they were and every red flag that
   * went unpinned gets an amber mark. Returns how many marks this page carries.
   */
  reveal(pinned: Set<string>): number {
    let marks = 0;
    for (const s of this.allSpots()) {
      if (pinned.has(s.clue.id)) s.setPinned(true, false);
      else if (isFlagClue(s.clue)) {
        s.setMissed(400 + marks * 120);
        marks++;
      }
    }
    return marks;
  }

  // ---- keyboard focus --------------------------------------------------------

  focusMove(dir: number): void {
    const spots = this.allSpots();
    if (spots.length === 0) return;
    spots.forEach((s) => s.setFocused(false));
    this.focusIndex =
      this.focusIndex < 0
        ? dir > 0
          ? 0
          : spots.length - 1
        : (this.focusIndex + dir + spots.length) % spots.length;
    const spot = spots[this.focusIndex];
    spot.setFocused(true);
    // Scroll so the focused row is visible.
    const rowIndex = this.rows.findIndex((r) => r.spots.includes(spot));
    if (rowIndex >= 0 && !this.rows[rowIndex].container.visible) {
      this.firstRow = Math.min(rowIndex, this.maxFirstRow());
      this.layout();
    }
  }

  /** Focus a clue by id (from the suspicions list) and scroll it into view. */
  focusClue(id: string): boolean {
    const spots = this.allSpots();
    const idx = spots.findIndex((s) => s.clue.id === id);
    if (idx < 0) return false;
    this.focusIndex = idx - 1;
    this.focusMove(1);
    return true;
  }

  activateFocused(): void {
    const spots = this.allSpots();
    const spot = spots[this.focusIndex];
    if (spot) this.togglePin(spot);
  }

  clearFocus(): void {
    this.allSpots().forEach((s) => s.setFocused(false));
    this.focusIndex = -1;
  }

  /** Spot rect for a whole row (used by list-style documents). */
  protected rowRect(row: Row, x = 0, w = this.contentW): SpotRect {
    return { x, y: 0, w, h: row.height };
  }
}
