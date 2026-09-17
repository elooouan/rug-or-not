import { TEX } from '@/art/keys';
import { FONT } from '@/config/layout';
import { HEX } from '@/config/palette';
import type { CaseDocument, Clue } from '@/data/schema';
import type Phaser from 'phaser';
import { DocumentView } from '@/ui/DocumentView';
import { rect } from '@/ui/shapes';

type LiquidityData = Extract<CaseDocument, { type: 'liquidity' }>;

/** Liquidity lock status, top holders with bars, and recent large transfers. */
export class LiquidityDoc extends DocumentView {
  protected build(): void {
    const data = (this.doc as LiquidityData).content;
    const cluesFor = (table: string, row: number) =>
      this.doc.clues.filter(
        (c) =>
          c.anchor.kind === 'row' &&
          (c.anchor.table ?? 'holders') === table &&
          c.anchor.row === row,
      );

    this.addRow(this.lh, (row) => {
      row.add(this.text(0, 0, `Pool: ${data.pool}`, { color: 'woodDark' }));
      row.add(
        this.text(this.contentW, 0, `Liquidity ${data.liquidityUsd}`, {
          color: 'woodDark',
        }).setOrigin(1, 0),
      );
    });

    // Lock status.
    const lockClues = cluesFor('lock', 0);
    const lockFine = lockClues.find((c) => c.finePrint);
    this.addRow(this.lh + (lockFine ? this.lh : 0) + 2, (row) => {
      const icon = this.scene.make
        .image({ x: 0, y: 2, key: data.lock.locked ? TEX.iconLock : TEX.iconUnlock }, false)
        .setOrigin(0);
      row.add(icon);
      const status = data.lock.locked
        ? `Locked ${data.lock.pct}%${data.lock.provider ? ` via ${data.lock.provider}` : ''}${data.lock.expires ? ` until ${data.lock.expires}` : ''}`
        : `NOT LOCKED (${data.lock.pct}% in team wallet)`;
      row.add(this.text(12, 0, status, { color: data.lock.locked ? 'lampGreen' : 'stampRed' }));
      this.spotsWithFine(row, lockClues, 12, this.lh - 2, this.contentW - 12, {
        x: -2,
        y: 0,
        w: this.contentW + 4,
        h: this.lh,
      });
    });

    // Holders.
    this.addRow(this.lh + 4, (row) =>
      row.add(this.text(0, 4, 'Top holders', { color: 'woodMid' })),
    );
    const barX = 150;
    const barW = this.contentW - barX - 34;
    data.holders.forEach((h, i) => {
      const clues = cluesFor('holders', i);
      const fine = clues.find((c) => c.finePrint);
      this.addRow(this.lh + (fine ? this.lh : 0), (row) => {
        row.add(this.text(0, 0, `${i + 1}. ${h.label.slice(0, 22)}`));
        if (h.tag)
          row.add(
            this.text(barX - 4, 0, h.tag, {
              size: FONT.size.tiny,
              font: 'ui',
              color: 'ink',
            }).setOrigin(1, 0),
          );
        row.add(rect(this.scene, barX, 3, barW, 7, HEX.paperShadow));
        row.add(
          rect(this.scene, barX, 3, Math.max(1, Math.round((h.pct / 100) * barW)), 7, HEX.woodDark),
        );
        row.add(this.text(this.contentW, 0, `${h.pct}%`, { color: 'woodDark' }).setOrigin(1, 0));
        this.spotsWithFine(row, clues, 0, this.lh - 2, this.contentW, {
          x: -2,
          y: 0,
          w: this.contentW + 4,
          h: this.lh,
        });
      });
    });

    if (data.transfers.length > 0) {
      this.addRow(this.lh + 4, (row) =>
        row.add(this.text(0, 4, 'Recent large transfers', { color: 'woodMid' })),
      );
      data.transfers.forEach((t, i) => {
        const clues = cluesFor('transfers', i);
        const fine = clues.find((c) => c.finePrint);
        this.addRow(this.lh + (fine ? this.lh : 0), (row) => {
          row.add(this.text(0, 0, `${t.when}  ${t.from} -> ${t.to}`.slice(0, 34)));
          row.add(this.text(this.contentW, 0, t.amount, { color: 'woodDark' }).setOrigin(1, 0));
          this.spotsWithFine(row, clues, 0, this.lh - 2, this.contentW, {
            x: -2,
            y: 0,
            w: this.contentW + 4,
            h: this.lh,
          });
        });
      });
    }
  }

  private spotsWithFine(
    row: Phaser.GameObjects.Container,
    clues: Clue[],
    fx: number,
    fy: number,
    fw: number,
    base: { x: number; y: number; w: number; h: number },
  ): void {
    for (const clue of clues) {
      let rect = { ...base };
      if (clue.finePrint) {
        const fp = this.addFinePrint(row, clue, fx, fy, fw);
        rect = { ...rect, h: Math.max(rect.h, fp.y + fp.h) };
      }
      this.addSpot(row, clue, rect);
    }
  }
}
