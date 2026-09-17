import { TEX } from '@/art/keys';
import { FONT } from '@/config/layout';
import type { PaletteKey } from '@/config/palette';
import type { CaseDocument } from '@/data/schema';
import { charWidth } from '@/ui/text';
import { DocumentView } from '@/ui/DocumentView';

type ContractData = Extract<CaseDocument, { type: 'contract' }>;

const KEYWORDS = new Set([
  'pragma',
  'solidity',
  'contract',
  'function',
  'mapping',
  'address',
  'uint256',
  'uint',
  'bool',
  'string',
  'public',
  'private',
  'external',
  'internal',
  'require',
  'returns',
  'modifier',
  'if',
  'else',
  'return',
  'constructor',
  'event',
  'emit',
  'view',
  'pure',
  'payable',
  'memory',
  'storage',
  'override',
  'is',
  'import',
  'true',
  'false',
  'msg',
  'sender',
  'revert',
  'immutable',
  'constant',
  'onlyOwner',
  'onlyAdmin',
  'virtual',
  'interface',
  'library',
  'using',
  'for',
  'while',
  'new',
  'delete',
  'unchecked',
]);

interface Token {
  text: string;
  color: PaletteKey;
}

/** Very small tokenizer: comments, strings, numbers, keywords, everything else. */
export function tokenize(line: string): Token[] {
  const out: Token[] = [];
  const re = /(\/\/.*$)|("[^"]*"|'[^']*')|(\b\d[\d_]*\b)|(\b[A-Za-z_]\w*\b)|(\s+|.)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m[1]) out.push({ text: m[1], color: 'woodMid' });
    else if (m[2]) out.push({ text: m[2], color: 'lampGreen' });
    else if (m[3]) out.push({ text: m[3], color: 'stampRed' });
    else if (m[4]) out.push({ text: m[4], color: KEYWORDS.has(m[4]) ? 'ink' : 'shadow' });
    else out.push({ text: m[5], color: 'shadow' });
    if (m[0].length === 0) re.lastIndex++;
  }
  // Merge adjacent same-colour tokens to keep Text object count low.
  const merged: Token[] = [];
  for (const t of out) {
    const last = merged[merged.length - 1];
    if (last && last.color === t.color) last.text += t.text;
    else merged.push({ ...t });
  }
  return merged;
}

/** A Solidity-flavoured code excerpt with per-line clue spots. */
export class ContractDoc extends DocumentView {
  protected build(): void {
    const data = (this.doc as ContractData).content;
    const cw = charWidth(this.scene, 'body', FONT.size.body);
    const gutter = 3; // chars for the line number
    const maxChars = Math.floor(this.contentW / cw) - gutter - 1;

    // Header row: file name + verification badge.
    const header = this.addRow(this.lh + 2, (row) => {
      row.add(this.text(0, 0, data.fileName, { color: 'woodDark' }));
      const badge = data.verified ? 'verified source' : 'SOURCE NOT VERIFIED';
      const icon = this.scene.make
        .image(
          { x: this.contentW - 9, y: 2, key: data.verified ? TEX.iconCheck : TEX.iconWarn },
          false,
        )
        .setOrigin(0);
      const t = this.text(this.contentW - 12, 0, badge, {
        color: data.verified ? 'lampGreen' : 'stampRed',
        size: FONT.size.small,
        font: 'ui',
      }).setOrigin(1, 0);
      row.add([t, icon]);
    });
    for (const clue of this.doc.clues) {
      if (clue.anchor.kind === 'row' && clue.anchor.table === 'header') {
        const rect = { x: this.contentW - 130, y: -1, w: 130, h: header.height };
        if (clue.finePrint) {
          const fp = this.addFinePrint(header, clue, 0, this.lh - 2, this.contentW);
          rect.x = 0;
          rect.w = this.contentW;
          rect.h = Math.max(rect.h, fp.y + fp.h + 1);
          header.height = rect.h + 2;
        }
        this.addSpot(header, clue, rect);
      }
    }

    const fineCw = charWidth(this.scene, 'body', FONT.size.finePrint);
    data.lines.forEach((line, i) => {
      const clues = this.doc.clues.filter((c) => c.anchor.kind === 'line' && c.anchor.line === i);
      const fine = clues.find((c) => c.finePrint);
      const codeEnd = Math.round((gutter + Math.min(line.length, maxChars)) * cw);
      // Fine print sits after the code when there's room, otherwise on its own line under it.
      const fineFits =
        !!fine &&
        !this.ctx.noMagnifier &&
        codeEnd + 8 + (fine.text ?? '').length * fineCw <= this.contentW;
      const fineBelow = !!fine && !fineFits;
      const rowH = fineBelow ? this.lh * 2 : this.lh;
      this.addRow(rowH, (row) => {
        row.add(this.text(0, 0, String(i + 1).padStart(2, ' '), { color: 'paperShadow' }));
        let x = Math.round(gutter * cw);
        let chars = 0;
        for (const tok of tokenize(line)) {
          let txt = tok.text;
          if (chars + txt.length > maxChars)
            txt = txt.slice(0, Math.max(0, maxChars - chars - 1)) + '~';
          if (txt.length === 0) break;
          row.add(this.text(x, 0, txt, { color: tok.color }));
          x += Math.round(txt.length * cw);
          chars += txt.length;
          if (chars >= maxChars) break;
        }
        for (const clue of clues) {
          let rect = {
            x: Math.round(gutter * cw) - 2,
            y: 0,
            w: Math.max(40, x - Math.round(gutter * cw) + 4),
            h: this.lh,
          };
          if (clue.finePrint) {
            const fpX = fineBelow ? Math.round(gutter * cw) + 8 : x + 8;
            const fpY = fineBelow ? this.lh : 2;
            const fp = this.addFinePrint(row, clue, fpX, fpY, this.contentW - fpX);
            rect = {
              x: rect.x,
              y: 0,
              w: Math.max(rect.w, fp.x + fp.w - rect.x + 2),
              h: Math.max(this.lh, fp.y + fp.h),
            };
          }
          this.addSpot(row, clue, rect);
        }
      });
    });
  }
}
