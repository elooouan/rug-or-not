import { FONT } from '@/config/layout';
import { HEX, type PaletteKey } from '@/config/palette';
import type { CaseDocument } from '@/data/schema';
import { DocumentView } from '@/ui/DocumentView';
import { charWidth, wrapMono } from '@/ui/text';
import { rect } from '@/ui/shapes';

type ChatData = Extract<CaseDocument, { type: 'chat' }>;

const ROLE_TAG: Record<string, string> = { admin: '[admin]', mod: '[mod]', member: '', bot: '' };
const ROLE_COLOR: Record<string, PaletteKey> = {
  admin: 'stampRed',
  mod: 'ink',
  member: 'woodDark',
  bot: 'woodDark',
};

/** A scrolling chat log. Message clues anchor by message index. */
export class ChatDoc extends DocumentView {
  protected build(): void {
    const data = (this.doc as ChatData).content;
    const cw = charWidth(this.scene, 'body', FONT.size.body);
    const maxChars = Math.floor(this.contentW / cw);

    this.addRow(this.lh + 2, (row) => {
      row.add(this.text(0, 0, `# ${data.channel}`, { color: 'woodDark' }));
      row.add(
        this.text(this.contentW, 0, `${data.messages.length} msgs`, {
          color: 'paperShadow',
        }).setOrigin(1, 0),
      );
      row.add(rect(this.scene, 0, this.lh, this.contentW, 1, HEX.paperShadow));
    });

    data.messages.forEach((m, i) => {
      const tag = ROLE_TAG[m.role];
      const head = `${m.time} ${m.user}${tag ? ' ' + tag : ''}`;
      const body = m.deleted ? '[message deleted]' : m.text;
      const lines = wrapMono(body, maxChars - 2);
      const clues = this.doc.clues.filter(
        (c) => c.anchor.kind === 'message' && c.anchor.index === i,
      );
      const fine = clues.find((c) => c.finePrint);
      const h = this.lh * (1 + lines.length) + (fine ? this.lh : 0) + 2;
      this.addRow(h, (row) => {
        row.add(this.text(0, 0, head, { color: ROLE_COLOR[m.role] }));
        lines.forEach((l, li) =>
          row.add(
            this.text(8, this.lh * (1 + li), l, { color: m.deleted ? 'paperShadow' : 'shadow' }),
          ),
        );
        for (const clue of clues) {
          let rect = { x: -2, y: 0, w: this.contentW + 4, h: this.lh * (1 + lines.length) };
          if (clue.finePrint) {
            const fp = this.addFinePrint(
              row,
              clue,
              8,
              this.lh * (1 + lines.length) - 2,
              this.contentW - 8,
            );
            rect = { ...rect, h: Math.max(rect.h, fp.y + fp.h) };
          }
          this.addSpot(row, clue, rect);
        }
      });
    });
  }
}
