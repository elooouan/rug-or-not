import type Phaser from 'phaser';
import type { CaseDocument } from '@/data/schema';
import type { DocContext, DocumentView } from '@/ui/DocumentView';
import { AuditDoc } from './AuditDoc';
import { ChatDoc } from './ChatDoc';
import { ContractDoc } from './ContractDoc';
import { LiquidityDoc } from './LiquidityDoc';
import { TeamDoc } from './TeamDoc';
import { TokenomicsDoc } from './TokenomicsDoc';

/** Factory: one reusable view class per document type. */
export function createDocumentView(
  scene: Phaser.Scene,
  doc: CaseDocument,
  ctx: DocContext,
): DocumentView {
  switch (doc.type) {
    case 'contract':
      return new ContractDoc(scene, doc, ctx);
    case 'tokenomics':
      return new TokenomicsDoc(scene, doc, ctx);
    case 'team':
      return new TeamDoc(scene, doc, ctx);
    case 'chat':
      return new ChatDoc(scene, doc, ctx);
    case 'liquidity':
      return new LiquidityDoc(scene, doc, ctx);
    case 'audit':
      return new AuditDoc(scene, doc, ctx);
  }
}
