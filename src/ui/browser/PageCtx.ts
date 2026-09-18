import type Phaser from 'phaser';
import { BROWSER, FONT } from '@/config/layout';
import { HEX, type PaletteKey } from '@/config/palette';
import { PixelButton } from '../PixelButton';
import { rect } from '../shapes';
import { charWidth, makeText, wrapMono, type TextOpts } from '../text';
import type { BrowserPanel } from '../BrowserPanel';

export type PageId =
  'home' | 'rugscan' | 'coin' | 'board' | 'news' | 'help' | 'badges' | 'about' | '404';
export const ALL_PAGES: PageId[] = [
  'home',
  'rugscan',
  'coin',
  'board',
  'news',
  'help',
  'badges',
  'about',
  '404',
];

/** Helpers a page uses to lay out its content top to bottom. */
export class PageCtx {
  y = 0;
  constructor(
    readonly scene: Phaser.Scene,
    readonly content: Phaser.GameObjects.Container,
    readonly width: number,
    readonly panel: BrowserPanel,
  ) {}

  heading(text: string, color: PaletteKey = 'shadow'): void {
    this.content.add(makeText(this.scene, 0, this.y, text, { size: FONT.size.body, color }));
    this.y += BROWSER.lineH + 3;
  }

  line(text: string, opts: TextOpts = {}): void {
    const cw = charWidth(this.scene, 'body', FONT.size.body);
    const lines = wrapMono(text, Math.floor(this.width / cw));
    for (const l of lines) {
      this.content.add(
        makeText(this.scene, 0, this.y, l, {
          font: 'body',
          size: FONT.size.body,
          color: 'shadow',
          ...opts,
        }),
      );
      this.y += BROWSER.lineH;
    }
  }

  small(text: string, color: PaletteKey = 'woodMid'): void {
    this.content.add(makeText(this.scene, 0, this.y, text, { size: FONT.size.tiny, color }));
    this.y += 10;
  }

  gap(n = 6): void {
    this.y += n;
  }

  button(
    label: string,
    onClick: () => void,
    opts: { x?: number; variant?: 'paper' | 'ink'; sameLine?: boolean; icon?: string } = {},
  ): PixelButton {
    const b = new PixelButton(this.scene, opts.x ?? 0, this.y, label, onClick, {
      variant: opts.variant ?? 'ink',
      icon: opts.icon,
    });
    this.scene.children.remove(b);
    this.content.add(b);
    if (!opts.sameLine) this.y += b.bh + 6;
    return b;
  }

  rule(): void {
    this.content.add(rect(this.scene, 0, this.y + 2, this.width, 1, HEX.paperShadow));
    this.y += 7;
  }
}
