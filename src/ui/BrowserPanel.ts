import Phaser from 'phaser';
import { DEPTH } from '@/config/depth';
import { BROWSER, FONT, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { HEX } from '@/config/palette';
import { TOKEN } from '@/config/token';
import { audio } from '@/systems/audio';
import type { CaseData } from '@/data/schema';
import { awardBadge, noteSeen } from '@/systems/badges';
import { wallet } from '@/systems/wallet';
import { saveStore } from '@/systems/save';
import { gameState } from '@/systems/gameState';
import { lucienSays } from './DialogueBox';
import { PixelButton } from './PixelButton';
import { rect } from './shapes';
import { attachScroll } from './dragScroll';
import { makeText } from './text';
import { markEscConsumed, modalOpen, popOverlay, pushOverlay } from './escGuard';
import { ALL_PAGES, PageCtx, type PageId } from './browser/PageCtx';
import { PAGES, URLS } from './browser/pages';

/**
 * NetScope: the in-game browser that lives on the phone. Pages are small
 * functions that draw into a scrollable content area.
 */
export class BrowserPanel extends Phaser.GameObjects.Container {
  private content!: Phaser.GameObjects.Container;
  private urlText!: Phaser.GameObjects.Text;
  private page: PageId = 'home';
  private history: PageId[] = [];
  private scrollY = 0;
  private contentHeight = 0;
  private viewH: number;
  private unsubscribeWallet?: () => void;
  private escBinding?: { key: Phaser.Input.Keyboard.Key; fn: () => void };
  private detachScroll?: () => void;
  private static openPanel: BrowserPanel | null = null;
  /** What the RugScan page shows: the current case, the token index, or a chosen token. */
  rugscanView: 'auto' | 'index' | CaseData = 'auto';
  /** Board page: show only entries with the holder mark. */
  holdersOnly = false;

  static get current(): BrowserPanel | null {
    return BrowserPanel.openPanel;
  }

  static toggle(scene: Phaser.Scene, page: PageId = 'home'): void {
    if (BrowserPanel.openPanel?.scene === scene) {
      BrowserPanel.openPanel.close();
      return;
    }
    BrowserPanel.openPanel = new BrowserPanel(scene, page);
  }

  constructor(scene: Phaser.Scene, page: PageId = 'home') {
    super(scene, 0, 0);
    const { x, y, w, h, titleH, toolbarH, padding } = BROWSER;
    this.viewH = h - titleH - toolbarH - padding * 2;

    // Dim everything behind and eat clicks.
    const dim = rect(scene, 0, 0, GAME_WIDTH, GAME_HEIGHT, HEX.bg, 0.55);
    dim.setInteractive({ useHandCursor: false });
    dim.on('pointerdown', () => this.close());
    this.add(dim);

    // Window chrome.
    this.add(rect(scene, x + 4, y + 5, w, h, HEX.bg, 0.6));
    this.add(rect(scene, x - 2, y - 2, w + 4, h + 4, HEX.woodDark));
    const body = rect(scene, x, y, w, h, HEX.paper);
    body.setInteractive({ useHandCursor: false });
    this.add(body);
    this.add(rect(scene, x, y, w, titleH, HEX.shadow));
    this.add(
      makeText(scene, x + 6, y + 2, 'NetScope 2.0', { size: FONT.size.small, color: 'paper' }),
    );
    for (let i = 0; i < 3; i++)
      this.add(
        rect(scene, x + w - 34 + i * 10, y + 4, 6, 6, i === 2 ? HEX.stampRed : HEX.paperShadow),
      );
    const close = scene.add
      .zone(x + w - 16, y, 16, titleH)
      .setOrigin(0)
      .setInteractive({ useHandCursor: false });
    close.on('pointerdown', () => this.close());
    this.add(close);

    // Toolbar: back, home, bookmarks, url.
    const ty = y + titleH + 2;
    this.add(rect(scene, x, y + titleH, w, toolbarH, HEX.paperShadow));
    const tb = (label: string, bx: number, fn: () => void) => {
      const b = new PixelButton(scene, bx, ty, label, fn, { variant: 'paper' });
      scene.children.remove(b);
      this.add(b);
      return b;
    };
    tb('<', x + 4, () => this.back());
    // Bookmarks, with shorter names when the coin's ticker leaves no room for the long ones.
    const rows: [string, PageId][][] = [
      [
        ['Home', 'home'],
        ['RugScan', 'rugscan'],
        [TOKEN.symbol, 'coin'],
        ['Board', 'board'],
        ['News', 'news'],
        ['Market', 'market'],
        ['Badges', 'badges'],
        ['Help', 'help'],
      ],
      [
        ['Home', 'home'],
        ['Scan', 'rugscan'],
        ['Coin', 'coin'],
        ['Board', 'board'],
        ['News', 'news'],
        ['Market', 'market'],
        ['Badges', 'badges'],
        ['Help', 'help'],
      ],
    ];
    for (const marks of rows) {
      let bx = x + 28;
      const made: PixelButton[] = [];
      for (const [label, id] of marks) {
        const b = tb(label, bx, () => this.go(id));
        made.push(b);
        bx += b.bw + 2;
      }
      if (bx - 2 <= x + w - 4) break;
      made.forEach((b) => b.destroy());
    }
    // URL lives in the title bar so the bookmarks have the toolbar to themselves.
    this.urlText = makeText(scene, x + w - 44, y + 3, '', {
      size: FONT.size.tiny,
      color: 'paperShadow',
    }).setOrigin(1, 0);
    this.add(this.urlText);

    // Content viewport with a mask for scrolling.
    this.content = scene.add.container(x + padding, y + titleH + toolbarH + padding);
    this.add(this.content);
    const maskGfx = scene.make.graphics({ x: 0, y: 0 }, false);
    maskGfx.fillStyle(0xffffff, 1);
    maskGfx.fillRect(x, y + titleH + toolbarH, w, h - titleH - toolbarH);
    this.content.setMask(new Phaser.Display.Masks.GeometryMask(scene, maskGfx));

    this.setDepth(DEPTH.overlay);
    scene.add.existing(this);
    pushOverlay(this);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.releaseOverlay());
    scene.events.emit('browser:open');
    audio.play('click');

    this.detachScroll = attachScroll(scene, { step: 26, onScroll: (d) => this.scrollBy(d) });
    const kb = scene.input.keyboard;
    if (kb) {
      const key = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC, false);
      const fn = () => {
        if (modalOpen()) return; // a dialog on top (the name picker) takes this one
        markEscConsumed();
        this.close();
      };
      key.on('down', fn);
      this.escBinding = { key, fn };
    }
    // The coin page follows the wallet; a fresh connection or a refusal gets a sound too.
    let wasConnected = wallet.state.connected;
    let lastError = wallet.state.error;
    this.unsubscribeWallet = wallet.onChange((st) => {
      if (st.connected && !wasConnected) audio.play('unlock');
      else if (st.error && st.error !== lastError) audio.play('wrong');
      wasConnected = st.connected;
      lastError = st.error;
      if (this.page === 'coin') this.render();
    });

    if (!saveStore.get().settings.reducedMotion) {
      this.setScale(0.96).setAlpha(0);
      scene.tweens.add({ targets: this, scale: 1, alpha: 1, duration: 140, ease: 'Quad.easeOut' });
    }
    lucienSays(scene, 'browser');
    this.go(page, false);
  }

  private scrollBy(delta: number): void {
    const max = Math.max(0, this.contentHeight - this.viewH);
    this.scrollY = Phaser.Math.Clamp(this.scrollY + delta, 0, max);
    this.content.setY(
      BROWSER.y + BROWSER.titleH + BROWSER.toolbarH + BROWSER.padding - this.scrollY,
    );
    this.moreHint?.setVisible(this.scrollY < max - 1);
  }

  go(page: PageId, pushHistory = true): void {
    if (pushHistory && page !== this.page) this.history.push(this.page);
    this.page = page;
    this.scrollY = 0;
    if (noteSeen('pagesSeen', page).length >= ALL_PAGES.length)
      awardBadge(this.scene, 'power-user');
    this.content.setY(BROWSER.y + BROWSER.titleH + BROWSER.toolbarH + BROWSER.padding);
    audio.play('hover');
    this.render();
  }

  back(): void {
    const prev = this.history.pop();
    if (prev) this.go(prev, false);
  }

  render(): void {
    if (!this.scene) return;
    this.content.removeAll(true);
    this.urlText.setText(
      URLS[this.page] +
        (this.page === 'rugscan' && gameState.currentCase
          ? `/${gameState.currentCase.ticker}`
          : ''),
    );
    const ctx = new PageCtx(this.scene, this.content, BROWSER.w - BROWSER.padding * 2, this);
    PAGES[this.page](ctx);
    this.contentHeight = ctx.y;
    this.updateMoreHint();
  }

  /** A tap target at the foot of the window when the page runs past it. */
  private moreHint?: Phaser.GameObjects.Text;

  private updateMoreHint(): void {
    const { x, y, w, h } = BROWSER;
    if (!this.moreHint) {
      this.moreHint = makeText(this.scene, x + w - 10, y + h - 4, 'v  more', {
        size: 8,
        color: 'woodMid',
      }).setOrigin(1, 1);
      this.moreHint.setInteractive(
        new Phaser.Geom.Rectangle(-8, -8, this.moreHint.width + 16, this.moreHint.height + 16),
        Phaser.Geom.Rectangle.Contains,
      );
      this.moreHint.on(
        'pointerdown',
        (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
          ev.stopPropagation();
          this.scrollBy(52);
        },
      );
      this.add(this.moreHint);
    }
    this.moreHint.setVisible(this.scrollY < this.contentHeight - this.viewH - 1);
  }

  private overlayHeld = true;

  private releaseOverlay(): void {
    if (!this.overlayHeld) return;
    this.overlayHeld = false;
    popOverlay(this);
  }

  close(): void {
    if (!this.scene) return;
    const scene = this.scene;
    this.detachScroll?.();
    this.escBinding?.key.off('down', this.escBinding.fn);
    this.unsubscribeWallet?.();
    if (BrowserPanel.openPanel === this) BrowserPanel.openPanel = null;
    this.releaseOverlay();
    scene.events.emit('browser:close');
    audio.play('click');
    this.destroy();
  }
}
