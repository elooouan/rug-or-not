import { makePortrait, PORTRAIT_SIZE } from '@/art/portraits';
import { FONT } from '@/config/layout';
import { HEX } from '@/config/palette';
import type { CaseDocument } from '@/data/schema';
import { DocumentView } from '@/ui/DocumentView';
import { rect } from '@/ui/shapes';
import { charWidth, wrapMono } from '@/ui/text';

type TeamData = Extract<CaseDocument, { type: 'team' }>;

/** Pixel portraits, names, roles and bios. Photo clues anchor with table: "photo". */
export class TeamDoc extends DocumentView {
  protected build(): void {
    const data = (this.doc as TeamData).content;
    const cw = charWidth(this.scene, 'body', FONT.size.body);
    const textX = PORTRAIT_SIZE + 10;
    const textW = this.contentW - textX;
    const maxChars = Math.floor(textW / cw);

    data.members.forEach((m, i) => {
      const bioLines = wrapMono(m.bio, maxChars);
      const clues = this.doc.clues.filter(
        (c) => c.anchor.kind === 'row' && c.anchor.row === i && c.anchor.table !== 'note',
      );
      const bioClues = clues.filter((c) => c.anchor.kind === 'row' && c.anchor.table !== 'photo');
      const photoClues = clues.filter((c) => c.anchor.kind === 'row' && c.anchor.table === 'photo');
      const fineBio = bioClues.find((c) => c.finePrint);
      const textH = this.lh * 2 + bioLines.length * this.lh + (fineBio ? this.lh : 0);
      const h = Math.max(PORTRAIT_SIZE + 8, textH) + 4;
      this.addRow(h, (row) => {
        const key = makePortrait(this.scene, m.portraitSeed, m.style);
        const frame = rect(this.scene, -1, 1, PORTRAIT_SIZE + 2, PORTRAIT_SIZE + 2, HEX.woodDark);
        const img = this.scene.make.image({ x: 0, y: 2, key }, false).setOrigin(0);
        row.add([frame, img]);
        row.add(
          this.text(textX, 0, m.name, { font: 'ui', size: FONT.size.body, color: 'woodDark' }),
        );
        row.add(this.text(textX, this.lh, m.role, { color: 'ink' }));
        bioLines.forEach((l, li) => row.add(this.text(textX, this.lh * 2 + li * this.lh, l)));

        for (const clue of photoClues) {
          const r = { x: -1, y: 1, w: PORTRAIT_SIZE + 2, h: PORTRAIT_SIZE + 2 };
          if (clue.finePrint) {
            if (this.ctx.noMagnifier) {
              const fp = this.addFinePrint(row, clue, 0, PORTRAIT_SIZE + 4, textX + 60);
              r.h = fp.y + fp.h - r.y;
            } else {
              // Diagonal watermark across the portrait, lens-only.
              const t = this.text(PORTRAIT_SIZE / 2, PORTRAIT_SIZE / 2 + 2, clue.text ?? '', {
                size: FONT.size.finePrint,
                color: 'paper',
                resolution: 2,
              })
                .setOrigin(0.5)
                .setAngle(-28)
                .setAlpha(0.9);
              row.add(t);
              this.ctx.registerFinePrint(t);
            }
          }
          this.addSpot(row, clue, r);
        }
        for (const clue of bioClues) {
          let r = { x: textX - 2, y: 0, w: textW + 2, h: textH - (fineBio ? this.lh : 0) };
          if (clue.finePrint) {
            const fp = this.addFinePrint(
              row,
              clue,
              textX,
              this.lh * 2 + bioLines.length * this.lh - 2,
              textW,
            );
            r = { ...r, h: Math.max(r.h, fp.y + fp.h) };
          }
          this.addSpot(row, clue, r);
        }
      });
    });

    if (data.note) {
      const maxNote = Math.floor(this.contentW / cw);
      const lines = wrapMono(data.note, maxNote);
      const clues = this.doc.clues.filter(
        (c) => c.anchor.kind === 'row' && c.anchor.table === 'note',
      );
      const fine = clues.find((c) => c.finePrint);
      this.addRow(lines.length * this.lh + (fine ? this.lh : 0) + 4, (row) => {
        lines.forEach((l, li) => row.add(this.text(0, 4 + li * this.lh, l, { color: 'woodMid' })));
        for (const clue of clues) {
          let r = { x: -2, y: 2, w: this.contentW + 4, h: lines.length * this.lh + 2 };
          if (clue.finePrint) {
            const fp = this.addFinePrint(
              row,
              clue,
              0,
              4 + lines.length * this.lh - 2,
              this.contentW,
            );
            r = { ...r, h: Math.max(r.h, fp.y + fp.h - r.y) };
          }
          this.addSpot(row, clue, r);
        }
      });
    }
  }
}
