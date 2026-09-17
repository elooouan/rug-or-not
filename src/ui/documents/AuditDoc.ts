import { FONT } from '@/config/layout';
import { HEX } from '@/config/palette';
import type { CaseDocument } from '@/data/schema';
import { DocumentView } from '@/ui/DocumentView';
import { charWidth, wrapMono } from '@/ui/text';

type AuditData = Extract<CaseDocument, { type: 'audit' }>;

/** A certificate that may be real or forged. Field rows: 0 auditor, 1 contract, 2 date, 3 score. */
export class AuditDoc extends DocumentView {
  protected build(): void {
    const data = (this.doc as AuditData).content;
    const cw = charWidth(this.scene, 'body', FONT.size.body);
    const maxChars = Math.floor((this.contentW - 16) / cw);

    // Ornamental double border and a seal (fixed).
    const g = this.scene.make.graphics({ x: 0, y: 0 }, false);
    g.lineStyle(1, HEX.woodMid, 1);
    g.strokeRect(this.contentX - 4, this.contentY - 2, this.contentW + 8, this.contentH + 2);
    g.lineStyle(1, HEX.paperShadow, 1);
    g.strokeRect(this.contentX - 2, this.contentY, this.contentW + 4, this.contentH - 2);
    const sealX = this.contentX + this.contentW - 26;
    const sealY = this.contentY + this.contentH - 28;
    g.fillStyle(HEX.amber, 0.9);
    g.fillCircle(sealX, sealY, 14);
    g.lineStyle(1, HEX.woodDark, 1);
    g.strokeCircle(sealX, sealY, 14);
    g.strokeCircle(sealX, sealY, 10);
    this.fixed.add(g);
    this.fixed.add(
      this.text(sealX, sealY, 'SEAL', {
        size: FONT.size.tiny,
        font: 'ui',
        color: 'woodDark',
      }).setOrigin(0.5),
    );

    this.addRow(this.lh + 6, (row) =>
      row.add(
        this.text(this.contentW / 2, 2, 'CERTIFICATE OF AUDIT', {
          font: 'ui',
          size: FONT.size.body,
          color: 'woodDark',
        }).setOrigin(0.5, 0),
      ),
    );

    const fields: [string, string][] = [
      ['Auditor', data.auditor],
      ['Contract', data.contractName],
      ['Date', data.date],
      ['Score', data.score],
    ];
    fields.forEach(([label, value], i) => {
      const clues = this.doc.clues.filter(
        (c) =>
          c.anchor.kind === 'row' && (c.anchor.table ?? 'field') === 'field' && c.anchor.row === i,
      );
      const fine = clues.find((c) => c.finePrint);
      this.addRow(this.lh + (fine ? this.lh : 0), (row) => {
        row.add(this.text(8, 0, `${label}:`, { color: 'paperShadow' }));
        row.add(this.text(80, 0, value.slice(0, 30), { color: 'shadow' }));
        for (const clue of clues) {
          let rect = { x: 6, y: 0, w: this.contentW - 12, h: this.lh };
          if (clue.finePrint) {
            const fp = this.addFinePrint(row, clue, 80, this.lh - 2, this.contentW - 88);
            rect = { ...rect, h: Math.max(rect.h, fp.y + fp.h) };
          }
          this.addSpot(row, clue, rect);
        }
      });
    });

    const summary = wrapMono(data.summary, maxChars);
    this.addRow(summary.length * this.lh + 8, (row) =>
      summary.forEach((l, li) => row.add(this.text(8, 6 + li * this.lh, l, { color: 'woodMid' }))),
    );

    if (data.findings.length > 0) {
      this.addRow(this.lh, (row) => row.add(this.text(8, 0, 'Findings', { color: 'paperShadow' })));
      data.findings.forEach((f, i) => {
        const lines = wrapMono(`- ${f}`, maxChars);
        const clues = this.doc.clues.filter(
          (c) => c.anchor.kind === 'row' && c.anchor.table === 'findings' && c.anchor.row === i,
        );
        const fine = clues.find((c) => c.finePrint);
        this.addRow(lines.length * this.lh + (fine ? this.lh : 0), (row) => {
          lines.forEach((l, li) => row.add(this.text(8, li * this.lh, l)));
          for (const clue of clues) {
            let rect = { x: 6, y: 0, w: this.contentW - 12, h: lines.length * this.lh };
            if (clue.finePrint) {
              const fp = this.addFinePrint(
                row,
                clue,
                16,
                lines.length * this.lh - 2,
                this.contentW - 24,
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
