import { HEX, type PaletteKey } from '@/config/palette';
import { FONT } from '@/config/layout';
import type { CaseDocument } from '@/data/schema';
import { DocumentView } from '@/ui/DocumentView';
import { charWidth, wrapMono } from '@/ui/text';
import { rect } from '@/ui/shapes';

type TokenomicsData = Extract<CaseDocument, { type: 'tokenomics' }>;

const SLICE_COLORS: PaletteKey[] = [
  'ink',
  'lampGreen',
  'amber',
  'stampRed',
  'woodLight',
  'stampGreen',
  'paperShadow',
  'woodMid',
];

/** Pixel pie chart + allocation table + vesting notes. */
export class TokenomicsDoc extends DocumentView {
  protected build(): void {
    const data = (this.doc as TokenomicsData).content;
    const cw = charWidth(this.scene, 'body', FONT.size.body);
    const tableW = 178;
    const pieR = 38;
    const pieCx = this.contentX + this.contentW - pieR - 8;
    const pieCy = this.contentY + pieR + 14;

    // Pie (fixed, right side). Each slice is numbered so colour is never the only cue.
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
    let start = -Math.PI / 2;
    const total = Math.max(
      1,
      data.allocations.reduce((a, b) => a + b.pct, 0),
    );
    data.allocations.forEach((alloc, i) => {
      const angle = (alloc.pct / total) * Math.PI * 2;
      g.fillStyle(HEX[SLICE_COLORS[i % SLICE_COLORS.length]], 1);
      g.slice(pieCx, pieCy, pieR, start, start + angle, false);
      g.fillPath();
      g.lineStyle(1, HEX.paper, 1);
      g.beginPath();
      g.moveTo(pieCx, pieCy);
      g.lineTo(pieCx + Math.cos(start) * pieR, pieCy + Math.sin(start) * pieR);
      g.strokePath();
      const mid = start + angle / 2;
      const lx = pieCx + Math.cos(mid) * (pieR + 8);
      const ly = pieCy + Math.sin(mid) * (pieR + 8);
      if (alloc.pct / total > 0.03) {
        this.fixed.add(
          this.text(Math.round(lx), Math.round(ly), String(i + 1), {
            size: FONT.size.small,
            font: 'ui',
            color: 'woodDark',
          }).setOrigin(0.5),
        );
      }
      start += angle;
    });
    g.lineStyle(1, HEX.woodDark, 1);
    g.strokeCircle(pieCx, pieCy, pieR);
    this.fixed.add(g);
    this.fixed.add(
      this.text(pieCx, pieCy + pieR + 14, 'supply split', {
        size: FONT.size.tiny,
        font: 'ui',
        color: 'paperShadow',
      }).setOrigin(0.5, 0),
    );

    // Supply line.
    this.addRow(this.lh, (row) =>
      row.add(this.text(0, 0, `Total supply: ${data.totalSupply}`, { color: 'woodDark' })),
    );
    // Table header.
    this.addRow(this.lh, (row) => {
      row.add(this.text(0, 0, '#  Allocation', { color: 'paperShadow' }));
      row.add(this.text(tableW - 58, 0, '%', { color: 'paperShadow' }));
      row.add(this.text(tableW - 40, 0, 'Vesting', { color: 'paperShadow' }));
    });
    data.allocations.forEach((alloc, i) => {
      const clues = this.doc.clues.filter(
        (c) => c.anchor.kind === 'row' && c.anchor.row === i && c.anchor.table !== 'notes',
      );
      const fine = clues.find((c) => c.finePrint);
      const h = fine ? this.lh * 2 : this.lh;
      this.addRow(h, (row) => {
        const sw = rect(this.scene, 0, 3, 6, 6, HEX[SLICE_COLORS[i % SLICE_COLORS.length]]);
        row.add(sw);
        row.add(this.text(9, 0, `${i + 1} ${alloc.label.slice(0, 16)}`));
        row.add(this.text(tableW - 58, 0, `${alloc.pct}`, { color: 'woodDark' }));
        row.add(
          this.text(tableW - 40, 0, alloc.vesting.slice(0, 12), {
            color: alloc.vesting.toLowerCase() === 'none' ? 'stampRed' : 'lampGreen',
          }),
        );
        for (const clue of clues) {
          let rect = { x: -2, y: 0, w: tableW + 4, h: this.lh };
          if (clue.finePrint) {
            const fp = this.addFinePrint(row, clue, 9, this.lh - 2, tableW - 9);
            rect = { ...rect, h: Math.max(rect.h, fp.y + fp.h) };
          }
          this.addSpot(row, clue, rect);
        }
      });
    });
    // Notes.
    if (data.notes.length > 0) {
      this.addRow(this.lh + 4, (row) =>
        row.add(this.text(0, 4, 'Notes', { color: 'paperShadow' })),
      );
      const maxChars = Math.floor(this.contentW / cw) - 2;
      data.notes.forEach((note, i) => {
        const lines = wrapMono(`- ${note}`, maxChars);
        const clues = this.doc.clues.filter(
          (c) => c.anchor.kind === 'row' && c.anchor.table === 'notes' && c.anchor.row === i,
        );
        const fine = clues.find((c) => c.finePrint);
        const h = lines.length * this.lh + (fine ? this.lh : 0);
        this.addRow(h, (row) => {
          lines.forEach((l, li) => row.add(this.text(0, li * this.lh, l)));
          for (const clue of clues) {
            let rect = { x: -2, y: 0, w: this.contentW + 4, h: lines.length * this.lh };
            if (clue.finePrint) {
              const fp = this.addFinePrint(
                row,
                clue,
                10,
                lines.length * this.lh - 2,
                this.contentW - 10,
              );
              rect = { ...rect, h: Math.max(rect.h, fp.y + fp.h) };
            }
            this.addSpot(row, clue, rect);
          }
        });
      });
    }
  }
}
