import type Phaser from 'phaser';
import { FONT, RENDER_SCALE } from '@/config/layout';
import { PALETTE, type PaletteKey } from '@/config/palette';

export interface TextOpts {
  size?: number;
  color?: PaletteKey;
  font?: 'ui' | 'body';
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  lineSpacing?: number;
  resolution?: number;
  /** Outline colour + thickness (e.g. for watermarks over images). */
  stroke?: PaletteKey;
  strokeThickness?: number;
}

export function textStyle(opts: TextOpts = {}): Phaser.Types.GameObjects.Text.TextStyle {
  const font = opts.font ?? 'ui';
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: `'${FONT[font]}'`,
    fontSize: `${opts.size ?? FONT.size.body}px`,
    color: PALETTE[opts.color ?? 'paper'],
    align: opts.align ?? 'left',
    resolution: opts.resolution ?? RENDER_SCALE,
  };
  if (opts.wrap) style.wordWrap = { width: opts.wrap, useAdvancedWrap: true };
  if (opts.lineSpacing !== undefined) style.lineSpacing = opts.lineSpacing;
  if (opts.stroke) {
    style.stroke = PALETTE[opts.stroke];
    style.strokeThickness = opts.strokeThickness ?? 2;
  }
  return style;
}

/** Pixel-font text at integer coordinates. */
export function addText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  opts: TextOpts = {},
): Phaser.GameObjects.Text {
  const t = scene.add.text(Math.round(x), Math.round(y), str, textStyle(opts));
  return t;
}

/** Same as addText but not added to the display list (for containers). */
export function makeText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  opts: TextOpts = {},
): Phaser.GameObjects.Text {
  const t = scene.make.text(
    { x: Math.round(x), y: Math.round(y), text: str, style: textStyle(opts) },
    false,
  );
  return t;
}

const charCache = new Map<string, number>();
/** Advance width of one character for a (monospace) font/size. Cached. */
export function charWidth(scene: Phaser.Scene, font: 'ui' | 'body', size: number): number {
  const key = `${font}:${size}`;
  const hit = charCache.get(key);
  if (hit !== undefined) return hit;
  const t = makeText(scene, 0, 0, 'MMMMMMMMMM', { font, size });
  const w = t.width / 10;
  t.destroy();
  charCache.set(key, w);
  return w;
}

/** Height of one line of text for a font/size. Cached. */
export function lineHeightOf(scene: Phaser.Scene, font: 'ui' | 'body', size: number): number {
  const key = `h:${font}:${size}`;
  const hit = charCache.get(key);
  if (hit !== undefined) return hit;
  const t = makeText(scene, 0, 0, 'Mg', { font, size });
  const h = t.height;
  t.destroy();
  charCache.set(key, h);
  return h;
}

/** Greedy word wrap using a monospace char width. Returns lines. */
export function wrapMono(text: string, maxChars: number): string[] {
  // A width that works out to nothing (a measurement gone wrong, a box too narrow) must
  // not become an endless loop of empty lines; one character per line is the floor.
  if (!(maxChars >= 1)) {
    if (import.meta.env.DEV) console.warn('wrapMono: maxChars', maxChars, 'for', text.slice(0, 40));
    maxChars = Number.isNaN(maxChars) ? Infinity : 1;
  }
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      if (line.length === 0) line = w;
      else if (line.length + 1 + w.length <= maxChars) line += ' ' + w;
      else {
        out.push(line);
        line = w;
      }
      while (line.length > maxChars) {
        out.push(line.slice(0, maxChars));
        line = line.slice(maxChars);
      }
    }
    out.push(line);
  }
  return out;
}
