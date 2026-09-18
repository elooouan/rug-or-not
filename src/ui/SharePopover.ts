import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { DEPTH } from '@/config/depth';
import { HEX } from '@/config/palette';
import { audio } from '@/systems/audio';
import { shareText } from '@/systems/share';
import { PixelButton } from './PixelButton';
import { StickyNote } from './StickyNote';
import { toast } from './Toast';

export interface ShareOptions {
  /** The result as lines; the first http(s) line is the link. */
  lines: () => string[];
  /** Extra entry, e.g. "Save card". */
  extra?: { label: string; run: () => void };
}

/**
 * A small menu above a Share button: copy / share sheet, an optional extra,
 * and prefilled X and Telegram intents. Click anywhere else to close.
 */
export class SharePopover {
  private static open?: { scene: Phaser.Scene; c: Phaser.GameObjects.Container };

  static toggle(scene: Phaser.Scene, bx: number, by: number, opts: ShareOptions): void {
    if (SharePopover.open) {
      SharePopover.open.c.destroy();
      SharePopover.open = undefined;
      return;
    }
    audio.play('ui');
    const c = scene.add.container(0, 0).setDepth(DEPTH.overlay);
    const close = () => {
      c.destroy();
      if (SharePopover.open?.c === c) SharePopover.open = undefined;
    };
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (SharePopover.open?.c === c) SharePopover.open = undefined;
    });
    const outside = scene.add.zone(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0);
    outside.setInteractive({ useHandCursor: false });
    outside.on('pointerdown', close);
    scene.children.remove(outside);
    c.add(outside);

    const entries: { label: string; run: () => void }[] = [
      { label: 'Copy text', run: () => SharePopover.send(scene, opts.lines().join('\n')) },
    ];
    if (opts.extra) entries.push(opts.extra);
    const intent = (build: (text: string, url: string) => string) => () => {
      const lines = opts.lines();
      const url = lines.find((l) => l.startsWith('http')) ?? '';
      const text = lines.filter((l) => l !== url).join('\n');
      window.open(build(encodeURIComponent(text), encodeURIComponent(url)), '_blank', 'noopener');
    };
    entries.push({
      label: 'Post on X',
      run: intent((text, url) => `https://twitter.com/intent/tweet?text=${text}&url=${url}`),
    });
    entries.push({
      label: 'Telegram',
      run: intent((text, url) => `https://t.me/share/url?url=${url}&text=${text}`),
    });

    const w = 96;
    const h = 8 + entries.length * 22;
    const px = Phaser.Math.Clamp(bx - 20, 4, GAME_WIDTH - w - 4);
    const py = by - h - 6;
    c.add(scene.add.rectangle(px + 3, py + 4, w, h, HEX.bg, 0.5).setOrigin(0));
    c.add(scene.add.rectangle(px - 2, py - 2, w + 4, h + 4, HEX.woodDark).setOrigin(0));
    c.add(scene.add.rectangle(px, py, w, h, HEX.paper).setOrigin(0));
    entries.forEach((e, i) => {
      const b = new PixelButton(
        scene,
        px + 6,
        py + 5 + i * 22,
        e.label,
        () => {
          close();
          e.run();
        },
        { width: w - 12, variant: 'ink' },
      );
      scene.children.remove(b);
      c.add(b);
    });
    SharePopover.open = { scene, c };
  }

  /** Share sheet on phones, clipboard elsewhere, a note with the text if neither works. */
  static send(scene: Phaser.Scene, text: string): void {
    void shareText(text).then((how) => {
      if (!scene.scene.isActive()) return;
      if (how === 'shared') toast(scene, 'SHARED', 'off it goes');
      else if (how === 'copied') toast(scene, 'COPIED', 'result on the clipboard');
      else new StickyNote(scene, 160, 100, 'share text', text, 320);
    });
  }
}
