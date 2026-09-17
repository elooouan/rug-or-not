import { z } from 'zod';
import { FLAGS, HERRINGS, isFlagId, isHerringId } from './flags';

/** Where a clue sits inside its document. */
export const AnchorSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('line'), line: z.number().int().min(0) }),
  z.object({ kind: z.literal('row'), row: z.number().int().min(0), table: z.string().optional() }),
  z.object({ kind: z.literal('message'), index: z.number().int().min(0) }),
  z.object({
    kind: z.literal('xy'),
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
  }),
]);
export type Anchor = z.infer<typeof AnchorSchema>;

const ClueBase = {
  id: z.string().min(1),
  /** Short label for the Suspicions list. */
  label: z.string().min(1).max(22),
  /** Only visible through the magnifying glass. */
  finePrint: z.boolean().default(false),
  /** Text rendered as fine print (required when finePrint is true). */
  text: z.string().optional(),
  anchor: AnchorSchema,
};

export const FlagClueSchema = z.object({
  ...ClueBase,
  flagId: z.string().refine(isFlagId, { message: 'unknown flagId' }),
  herring: z.literal(false).optional(),
});
export const HerringClueSchema = z.object({
  ...ClueBase,
  herring: z.literal(true),
  herringId: z.string().refine(isHerringId, { message: 'unknown herringId' }),
});
export const ClueSchema = z.union([FlagClueSchema, HerringClueSchema]);
export type Clue = z.infer<typeof ClueSchema>;
export type FlagClue = z.infer<typeof FlagClueSchema>;
export type HerringClue = z.infer<typeof HerringClueSchema>;

export function isFlagClue(c: Clue): c is FlagClue {
  return 'flagId' in c;
}

export const PortraitStyleSchema = z.enum(['normal', 'stock', 'ai', 'anon']);

const DocBase = {
  title: z.string().min(1).max(40),
  clues: z.array(ClueSchema).default([]),
};

export const ContractDocSchema = z.object({
  ...DocBase,
  type: z.literal('contract'),
  content: z.object({
    fileName: z.string(),
    verified: z.boolean(),
    lines: z.array(z.string()).min(1).max(60),
  }),
});

export const TokenomicsDocSchema = z.object({
  ...DocBase,
  type: z.literal('tokenomics'),
  content: z.object({
    totalSupply: z.string(),
    allocations: z
      .array(z.object({ label: z.string(), pct: z.number().min(0).max(100), vesting: z.string() }))
      .min(1)
      .max(8),
    notes: z.array(z.string()).max(8).default([]),
  }),
});

export const TeamDocSchema = z.object({
  ...DocBase,
  type: z.literal('team'),
  content: z.object({
    members: z
      .array(
        z.object({
          name: z.string(),
          role: z.string(),
          bio: z.string(),
          portraitSeed: z.string(),
          style: PortraitStyleSchema.default('normal'),
        }),
      )
      .min(1)
      .max(4),
    note: z.string().optional(),
  }),
});

export const ChatDocSchema = z.object({
  ...DocBase,
  type: z.literal('chat'),
  content: z.object({
    channel: z.string(),
    messages: z
      .array(
        z.object({
          user: z.string(),
          role: z.enum(['admin', 'mod', 'member', 'bot']).default('member'),
          time: z.string(),
          text: z.string(),
          deleted: z.boolean().default(false),
        }),
      )
      .min(1)
      .max(40),
  }),
});

export const LiquidityDocSchema = z.object({
  ...DocBase,
  type: z.literal('liquidity'),
  content: z.object({
    pool: z.string(),
    liquidityUsd: z.string(),
    lock: z.object({
      locked: z.boolean(),
      provider: z.string().optional(),
      expires: z.string().optional(),
      pct: z.number().min(0).max(100),
    }),
    holders: z
      .array(
        z.object({
          label: z.string(),
          pct: z.number().min(0).max(100),
          tag: z.string().optional(),
        }),
      )
      .min(1)
      .max(8),
    transfers: z
      .array(z.object({ when: z.string(), from: z.string(), to: z.string(), amount: z.string() }))
      .max(6)
      .default([]),
  }),
});

export const AuditDocSchema = z.object({
  ...DocBase,
  type: z.literal('audit'),
  content: z.object({
    auditor: z.string(),
    contractName: z.string(),
    date: z.string(),
    score: z.string(),
    summary: z.string(),
    findings: z.array(z.string()).max(6).default([]),
  }),
});

export const DocumentSchema = z.discriminatedUnion('type', [
  ContractDocSchema,
  TokenomicsDocSchema,
  TeamDocSchema,
  ChatDocSchema,
  LiquidityDocSchema,
  AuditDocSchema,
]);
export type CaseDocument = z.infer<typeof DocumentSchema>;
export type DocumentType = CaseDocument['type'];
export const DOCUMENT_TYPES: DocumentType[] = [
  'contract',
  'tokenomics',
  'team',
  'chat',
  'liquidity',
  'audit',
];

export const CaseSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'id must be kebab-case'),
    title: z.string().min(1).max(40),
    ticker: z.string().regex(/^\$[A-Z0-9]{2,8}$/, 'ticker like $MOONPUP'),
    pitch: z.string().min(1).max(90),
    difficulty: z.number().int().min(1).max(5),
    verdict: z.enum(['rug', 'legit']),
    timeLimitSec: z.number().int().min(30).max(900),
    documents: z.array(DocumentSchema).min(2).max(6),
    debrief: z.string().min(1),
  })
  .superRefine((c, ctx) => {
    const ids = new Set<string>();
    let flagClues = 0;
    c.documents.forEach((doc, di) => {
      const path = (i: number, ...rest: (string | number)[]) => [
        'documents',
        di,
        'clues',
        i,
        ...rest,
      ];
      doc.clues.forEach((clue, ci) => {
        if (ids.has(clue.id))
          ctx.addIssue({
            code: 'custom',
            path: path(ci, 'id'),
            message: `duplicate clue id "${clue.id}"`,
          });
        ids.add(clue.id);
        if (isFlagClue(clue)) flagClues++;
        if (clue.finePrint && !clue.text) {
          ctx.addIssue({
            code: 'custom',
            path: path(ci, 'text'),
            message: 'fine print clues need `text`',
          });
        }
        const bad = (msg: string) =>
          ctx.addIssue({ code: 'custom', path: path(ci, 'anchor'), message: msg });
        const a = clue.anchor;
        switch (doc.type) {
          case 'contract':
            if (a.kind === 'row') {
              if (a.table !== 'header' || a.row !== 0)
                bad('contract row anchors must be { row: 0, table: "header" }');
            } else if (a.kind !== 'line')
              bad('contract clues use line anchors (or the header row)');
            else if (a.line >= doc.content.lines.length) bad(`line ${a.line} out of range`);
            break;
          case 'tokenomics':
            if (a.kind !== 'row') bad('tokenomics clues use row anchors');
            else if (a.table === 'notes') {
              if (a.row >= doc.content.notes.length) bad(`note row ${a.row} out of range`);
            } else if (a.row >= doc.content.allocations.length)
              bad(`allocation row ${a.row} out of range`);
            break;
          case 'team':
            if (a.kind !== 'row')
              bad('team clues use row anchors (table: "photo" | "bio" | "note")');
            else if (a.table === 'note') {
              if (!doc.content.note) bad('team doc has no note to anchor');
            } else if (a.row >= doc.content.members.length) bad(`member ${a.row} out of range`);
            break;
          case 'chat':
            if (a.kind !== 'message') bad('chat clues use message anchors');
            else if (a.index >= doc.content.messages.length) bad(`message ${a.index} out of range`);
            break;
          case 'liquidity':
            if (a.kind !== 'row')
              bad('liquidity clues use row anchors (table: "lock" | "holders" | "transfers")');
            else if (a.table === 'lock') {
              if (a.row !== 0) bad('lock row must be 0');
            } else if (a.table === 'transfers') {
              if (a.row >= doc.content.transfers.length) bad(`transfer ${a.row} out of range`);
            } else if (a.row >= doc.content.holders.length) bad(`holder ${a.row} out of range`);
            break;
          case 'audit':
            if (a.kind !== 'row') bad('audit clues use row anchors (table: "field" | "findings")');
            else if (a.table === 'findings') {
              if (a.row >= doc.content.findings.length) bad(`finding ${a.row} out of range`);
            } else if (a.row > 3)
              bad('audit field rows are 0 auditor, 1 contract, 2 date, 3 score');
            break;
        }
      });
    });
    if (c.verdict === 'legit' && flagClues > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['verdict'],
        message: 'legit cases must not contain red-flag clues',
      });
    }
    if (c.verdict === 'rug' && flagClues === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['verdict'],
        message: 'rug cases need at least one red-flag clue',
      });
    }
  });

export type CaseData = z.infer<typeof CaseSchema>;

export type ValidationResult = { ok: true; case: CaseData } | { ok: false; errors: string[] };

/** Validate raw JSON; never throws. Errors are human-readable "path: message" lines. */
export function validateCase(raw: unknown): ValidationResult {
  const res = CaseSchema.safeParse(raw);
  if (res.success) return { ok: true, case: res.data };
  const errors = res.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
  return { ok: false, errors };
}

export { FLAGS, HERRINGS };
