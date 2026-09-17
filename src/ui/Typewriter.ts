import type Phaser from 'phaser';
import type { PaletteKey } from '@/config/palette';
import { audio } from '@/systems/audio';
import { makeText, type TextOpts } from './text';

export interface TypedLine {
  text: string;
  color?: PaletteKey;
  font?: 'ui' | 'body';
  size?: number;
  indent?: number;
  /** Extra vertical gap before this line. */
  gap?: number;
}

/**
 * Types a list of lines into a container, one character at a time, with a
 * typewriter tick. Click / Space skips to the end.
 */
export class Typewriter {
  private texts: Phaser.GameObjects.Text[] = [];
  private lineIndex = 0;
  private charIndex = 0;
  private acc = 0;
  private done = false;
  readonly height: number;
  private onDone?: () => void;

  constructor(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    private lines: TypedLine[],
    private lineHeight: number,
    private speedMs: number,
    instant = false,
  ) {
    let y = 0;
    for (const line of lines) {
      y += line.gap ?? 0;
      const opts: TextOpts = {
        font: line.font ?? 'body',
        size: line.size ?? 12,
        color: line.color ?? 'shadow',
      };
      const t = makeText(scene, line.indent ?? 0, y, '', opts);
      container.add(t);
      this.texts.push(t);
      y += Math.max(this.lineHeight, line.size ? line.size + 2 : this.lineHeight);
    }
    this.height = y;
    if (instant) this.skip();
  }

  update(delta: number): void {
    if (this.done) return;
    this.acc += delta;
    while (this.acc >= this.speedMs && !this.done) {
      this.acc -= this.speedMs;
      this.step();
    }
  }

  private step(): void {
    const line = this.lines[this.lineIndex];
    if (!line) {
      this.finish();
      return;
    }
    this.charIndex++;
    this.texts[this.lineIndex].setText(line.text.slice(0, this.charIndex));
    if (this.charIndex % 3 === 0 && line.text[this.charIndex - 1] !== ' ') audio.play('tick');
    if (this.charIndex >= line.text.length) {
      this.lineIndex++;
      this.charIndex = 0;
      // Brief pause at line ends reads better.
      this.acc -= this.speedMs * 3;
    }
  }

  skip(): void {
    this.lines.forEach((l, i) => this.texts[i].setText(l.text));
    this.finish();
  }

  get finished(): boolean {
    return this.done;
  }

  then(fn: () => void): void {
    if (this.done) fn();
    else this.onDone = fn;
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.onDone?.();
  }
}
