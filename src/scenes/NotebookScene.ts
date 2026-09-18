import Phaser from 'phaser';
import { TEX } from '@/art/keys';
import { DEPTH } from '@/config/depth';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { HEX, type PaletteKey } from '@/config/palette';
import {
  FLAG_IDS,
  FLAGS,
  HERRINGS,
  type FlagId,
  type HerringId,
  type Severity,
} from '@/data/flags';
import { makePortrait } from '@/art/portraits';
import { isFlagClue, type CaseData } from '@/data/schema';
import { rogueOf } from '@/systems/rogues';
import { secretUnlocked } from '@/systems/secretCase';
import { audio } from '@/systems/audio';
import { awardBadge } from '@/systems/badges';
import { gameState } from '@/systems/gameState';
import { saveStore } from '@/systems/save';
import { DeskBackground } from '@/ui/DeskBackground';
import { lucienSays } from '@/ui/DialogueBox';
import { PixelButton } from '@/ui/PixelButton';
import { addText, charWidth, makeText, wrapMono } from '@/ui/text';
import { setupScene } from './sceneUtil';

const BOOK = { x: 70, y: 30, w: 500, h: 300, gutter: 8, pad: 14, lineH: 14, rowH: 15 } as const;
const SEV_COLOR: Record<Severity, PaletteKey> = {
  minor: 'ink',
  major: 'amber',
  critical: 'stampRed',
};
const SEV_MARK: Record<Severity, string> = { minor: '!', major: '!!', critical: '!!!' };
const HERRING_IDS = Object.keys(HERRINGS) as HerringId[];

type Chapter = 'flags' | 'herrings' | 'rogues';
const CHAPTERS: Chapter[] = ['flags', 'herrings', 'rogues'];

/**
 * The Detective's Notebook: three chapters. Red flags (unlocked as you meet
 * them), yellow herrings (the scary-looking things that are fine) and the
 * rogues gallery (wanted posters for every rug you've called correctly).
 */
export class NotebookScene extends Phaser.Scene {
  static readonly KEY = 'NotebookScene';
  private chapter: Chapter = 'flags';
  private selected = 0;
  private listPage!: Phaser.GameObjects.Container;
  private detail!: Phaser.GameObjects.Container;
  private entries: Phaser.GameObjects.Text[] = [];
  private overlay = false;
  private returnTo = 'TitleScene';
  private tabButtons: PixelButton[] = [];
  /** Hover-select only after the pointer has actually moved (a link click lands here mid-list). */
  private hoverArmed = false;

  constructor() {
    super(NotebookScene.KEY);
  }

  private openAt: { chapter: Chapter; id: string } | null = null;

  init(
    data: { overlay?: boolean; returnTo?: string; chapter?: Chapter; id?: string } | undefined,
  ): void {
    this.overlay = !!data?.overlay;
    this.returnTo = data?.returnTo ?? 'TitleScene';
    this.openAt = data?.chapter && data?.id ? { chapter: data.chapter, id: data.id } : null;
  }

  private close(): void {
    if (this.overlay) {
      this.scene.stop();
      this.scene.resume(this.returnTo);
    } else this.scene.start(this.returnTo);
  }

  private get rugs(): CaseData[] {
    return gameState.cases.filter((c) => c.verdict === 'rug');
  }

  private get ids(): string[] {
    if (this.chapter === 'rogues') return this.rugs.map((c) => c.id);
    return this.chapter === 'flags' ? FLAG_IDS : HERRING_IDS;
  }

  private known(id: string): boolean {
    const save = saveStore.get();
    if (this.chapter === 'rogues') return save.caseResults[id]?.solved === true;
    return this.chapter === 'flags'
      ? save.unlockedFlags.includes(id)
      : save.unlockedHerrings.includes(id);
  }

  create(): void {
    setupScene(this);
    if (this.overlay)
      this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, HEX.bg, 0.7).setOrigin(0).setInteractive();
    else new DeskBackground(this, { props: false, stamps: false });
    const { x, y, w, h } = BOOK;
    const pageW = w / 2 - BOOK.gutter;

    // Cover + two pages.
    this.add
      .rectangle(x + 5, y + 6, w, h, HEX.bg, 0.55)
      .setOrigin(0)
      .setDepth(DEPTH.documents);
    this.add
      .rectangle(x - 6, y - 6, w + 12, h + 12, HEX.woodDark)
      .setOrigin(0)
      .setDepth(DEPTH.documents);
    this.add.image(x, y, TEX.paper).setOrigin(0).setDisplaySize(pageW, h).setDepth(DEPTH.documents);
    this.add
      .image(x + pageW + BOOK.gutter * 2, y, TEX.paper)
      .setOrigin(0)
      .setDisplaySize(pageW, h)
      .setDepth(DEPTH.documents);
    this.add
      .rectangle(x + pageW + BOOK.gutter, y, 2, h, HEX.shadow)
      .setOrigin(0)
      .setDepth(DEPTH.pins);

    addText(this, x + BOOK.pad, y + BOOK.pad - 4, "DETECTIVE'S NOTEBOOK", {
      size: FONT.size.body,
      color: 'woodDark',
    }).setDepth(DEPTH.pins);

    // Chapter tabs on the cover edge.
    const tab = (label: string, ch: Chapter, tx: number) => {
      const b = new PixelButton(this, tx, y + h + 8, label, () => this.setChapter(ch), {
        width: 118,
      });
      b.setDepth(DEPTH.hud);
      return b;
    };
    this.tabButtons = [
      tab('Red flags', 'flags', x),
      tab('Yellow herrings', 'herrings', x + 124),
      tab('Rogues', 'rogues', x + 248),
    ];

    this.listPage = this.add.container(x + BOOK.pad, y + BOOK.pad).setDepth(DEPTH.pins);
    this.detail = this.add
      .container(x + pageW + BOOK.gutter * 2 + BOOK.pad, y + BOOK.pad)
      .setDepth(DEPTH.pins);
    const back = new PixelButton(
      this,
      GAME_WIDTH - 100,
      GAME_HEIGHT - 24,
      'Back  [Esc]',
      () => this.close(),
      { hotkey: 'ESC', width: 88 },
    );
    back.setDepth(DEPTH.hud);

    this.hoverArmed = false;
    this.input.once('pointermove', () => (this.hoverArmed = true));
    const kb = this.input.keyboard;
    kb?.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'TAB']);
    kb?.on('keydown-DOWN', () => this.select((this.selected + 1) % this.ids.length));
    kb?.on('keydown-TAB', () => this.select((this.selected + 1) % this.ids.length));
    kb?.on('keydown-UP', () =>
      this.select((this.selected - 1 + this.ids.length) % this.ids.length),
    );
    const step = (d: number) =>
      this.setChapter(
        CHAPTERS[(CHAPTERS.indexOf(this.chapter) + d + CHAPTERS.length) % CHAPTERS.length],
      );
    kb?.on('keydown-LEFT', () => step(-1));
    kb?.on('keydown-RIGHT', () => step(1));
    this.setChapter(this.openAt?.chapter ?? 'flags');
    if (this.openAt) {
      const idx = this.ids.indexOf(this.openAt.id);
      if (idx >= 0) this.select(idx);
    }
    lucienSays(this, 'notebook');
  }

  private setChapter(ch: Chapter): void {
    this.chapter = ch;
    this.tabButtons.forEach((b, i) => b.setAlpha(CHAPTERS[i] === ch ? 1 : 0.6));
    this.listPage.removeAll(true);
    const learned = this.ids.filter((id) => this.known(id)).length;
    const pageW = BOOK.w / 2 - BOOK.gutter;
    const verb = ch === 'flags' ? 'learned' : ch === 'herrings' ? 'met' : 'caught';
    this.listPage.add(
      makeText(this, pageW - BOOK.pad * 2, 2, `${learned}/${this.ids.length} ${verb}`, {
        size: FONT.size.tiny,
        color: 'paperShadow',
      }).setOrigin(1, 0),
    );
    if (ch === 'rogues' && learned === this.ids.length && this.ids.length > 0)
      awardBadge(this, 'most-wanted');
    if (ch === 'rogues') lucienSays(this, 'rogues');
    this.entries = this.ids.map((id, i) => {
      const known = this.known(id);
      const title =
        ch === 'flags'
          ? FLAGS[id as FlagId].title
          : ch === 'herrings'
            ? HERRINGS[id as HerringId].title
            : this.rogueTitle(id);
      const t = makeText(this, 14, 16 + i * BOOK.rowH, known ? title : '? ? ? ? ?', {
        size: FONT.size.body,
        font: 'body',
        color: known ? 'shadow' : 'paperShadow',
      });
      t.setInteractive({ useHandCursor: false });
      t.on('pointerover', () => this.hoverArmed && this.select(i));
      this.listPage.add(t);
      if (ch === 'flags') {
        const sev = FLAGS[id as FlagId].severity;
        this.listPage.add(
          makeText(this, 0, 18 + i * BOOK.rowH, known ? SEV_MARK[sev] : '', {
            size: FONT.size.tiny,
            color: SEV_COLOR[sev],
          }),
        );
      } else if (ch === 'rogues') {
        this.listPage.add(
          makeText(this, 0, 18 + i * BOOK.rowH, known ? 'x' : '', {
            size: FONT.size.tiny,
            color: 'stampRed',
          }),
        );
      } else {
        this.listPage.add(
          makeText(this, 0, 18 + i * BOOK.rowH, known ? 'ok' : '', {
            size: FONT.size.tiny,
            color: 'stampGreen',
          }),
        );
      }
      return t;
    });
    const first = this.ids.findIndex((id) => this.known(id));
    this.select(Math.max(0, first));
  }

  private select(i: number): void {
    this.selected = i;
    this.entries.forEach((t, idx) =>
      t.setColor(idx === i ? '#5b6f8a' : this.known(this.ids[idx]) ? '#2b2530' : '#b8a88a'),
    );
    this.detail.removeAll(true);
    const id = this.ids[i];
    const known = this.known(id);
    const pageW = BOOK.w / 2 - BOOK.gutter - BOOK.pad * 2;
    const cw = charWidth(this, 'body', 12);
    const maxChars = Math.floor(pageW / cw);
    let y = 0;
    const add = (text: string, opts: Parameters<typeof makeText>[4]) => {
      const t = makeText(this, 0, y, text, opts);
      this.detail.add(t);
      y += BOOK.lineH;
      return t;
    };
    if (this.chapter === 'rogues') {
      this.wantedPoster(id, known, pageW);
      audio.play('tick');
      return;
    }
    if (!known) {
      add('UNKNOWN PATTERN', { size: FONT.size.body, color: 'paperShadow' });
      y += 4;
      const msg =
        this.chapter === 'flags'
          ? 'You have not met this red flag yet. Close more cases to fill in this page.'
          : 'You have not run into this one yet. It looks suspicious and is not.';
      wrapMono(msg, maxChars).forEach((l) => add(l, { font: 'body', color: 'paperShadow' }));
      return;
    }
    if (this.chapter === 'flags') {
      const flag = FLAGS[id as FlagId];
      // Titles in the UI font are wider than the body font; wrap them by words.
      wrapMono(flag.title.toUpperCase(), 26).forEach((l) =>
        add(l, { size: FONT.size.body, color: 'woodDark' }),
      );
      add(`severity: ${flag.severity}  ${SEV_MARK[flag.severity]}`, {
        size: FONT.size.tiny,
        color: SEV_COLOR[flag.severity],
      });
      y += 6;
      add('What it is', { size: FONT.size.tiny, color: 'paperShadow' });
      wrapMono(flag.explanation, maxChars).forEach((l) =>
        add(l, { font: 'body', color: 'shadow' }),
      );
      y += 6;
      add('How to spot it', { size: FONT.size.tiny, color: 'paperShadow' });
      wrapMono(flag.howToSpot, maxChars).forEach((l) => add(l, { font: 'body', color: 'ink' }));
      const misses = saveStore.get().stats.flagMisses[id] ?? 0;
      const hits = saveStore.get().stats.flagHits[id] ?? 0;
      if (misses + hits > 0) {
        y += 6;
        add(
          `Your record: pinned ${hits}, missed ${misses}${misses > hits ? '. Look harder.' : '.'}`,
          { font: 'body', color: misses > hits ? 'stampRed' : 'stampGreen' },
        );
      }
      // Drill: five generated pages that all hide this flag. Not from an overlay,
      // where it would abandon the case underneath.
      // Not from a live investigation (it would abandon the case underneath); from the
      // report it's fine, the case is closed.
      if (!this.overlay || this.returnTo === 'ReportScene') {
        y += 8;
        const drilled = saveStore.get().stats.drilled.includes(id);
        const b = new PixelButton(
          this,
          0,
          y,
          drilled ? 'Drill again' : 'Drill this flag',
          () => {
            if (this.overlay) this.scene.stop(this.returnTo);
            this.scene.start('RushScene', { drill: id });
          },
          { variant: 'ink' },
        );
        this.children.remove(b);
        this.detail.add(b);
        if (drilled)
          this.detail.add(
            makeText(this, b.bw + 8, y + 4, 'drilled', {
              size: FONT.size.tiny,
              color: 'stampGreen',
            }),
          );
        y += b.bh + 4;
      }
    } else {
      const h = HERRINGS[id as HerringId];
      wrapMono(h.title.toUpperCase(), 26).forEach((l) =>
        add(l, { size: FONT.size.body, color: 'woodDark' }),
      );
      add('yellow herring: looks scary, is fine', { size: FONT.size.tiny, color: 'stampGreen' });
      y += 6;
      add('Why it is fine', { size: FONT.size.tiny, color: 'paperShadow' });
      wrapMono(h.reassurance, maxChars).forEach((l) => add(l, { font: 'body', color: 'shadow' }));
    }
    audio.play('tick');
  }

  private rogueTitle(caseId: string): string {
    const c = gameState.cases.find((x) => x.id === caseId);
    if (!c) return caseId;
    return `${c.ticker}  ${rogueOf(c).name}`;
  }

  /** A WANTED poster on the right-hand page: mugshot, charges, reward, and a CAUGHT stamp. */
  private wantedPoster(caseId: string, known: boolean, pageW: number): void {
    const c = gameState.cases.find((x) => x.id === caseId);
    if (!c) return;
    const d = this.detail;
    const w = pageW;
    const cw = charWidth(this, 'body', 12);
    const maxChars = Math.floor((w - 8) / cw);
    d.add(this.add.rectangle(2, 2, w, 252, HEX.bg, 0.25).setOrigin(0));
    d.add(this.add.rectangle(0, 0, w, 252, HEX.paperShadow, 0.35).setOrigin(0));
    d.add(
      this.add
        .rectangle(3, 3, w - 6, 246)
        .setOrigin(0)
        .setStrokeStyle(1, HEX.woodDark),
    );
    d.add(
      makeText(this, w / 2, 8, 'WANTED', { size: FONT.size.heading, color: 'stampRed' }).setOrigin(
        0.5,
        0,
      ),
    );
    d.add(
      makeText(this, w / 2, 30, known ? 'for questioning' : 'still at large', {
        size: FONT.size.tiny,
        color: 'woodMid',
      }).setOrigin(0.5, 0),
    );
    const rogue = rogueOf(c);
    const key = makePortrait(this, known ? rogue.seed : caseId, known ? rogue.style : 'anon');
    const img = this.add.image(w / 2, 70, key).setDisplaySize(56, 56);
    d.add(this.add.rectangle(w / 2, 70, 60, 60, HEX.woodDark).setOrigin(0.5));
    d.add(img);
    if (!known) {
      d.add(
        makeText(this, w / 2, 104, '? ? ? ? ?', {
          size: FONT.size.body,
          color: 'woodDark',
        }).setOrigin(0.5, 0),
      );
      const hidden = c.secret && !secretUnlocked(saveStore.get(), gameState.cases);
      wrapMono(
        hidden
          ? 'No file, no ticker, no face. Some folders only turn up when the rest are closed.'
          : `Last seen behind ${c.ticker}. Stamp the right verdict on that file to put a face here.`,
        maxChars,
      ).forEach((l, i) =>
        d.add(makeText(this, 6, 124 + i * BOOK.lineH, l, { font: 'body', color: 'woodMid' })),
      );
      return;
    }
    d.add(
      makeText(this, w / 2, 104, rogue.name.toUpperCase(), {
        size: FONT.size.body,
        color: 'woodDark',
      }).setOrigin(0.5, 0),
    );
    d.add(
      makeText(this, w / 2, 118, `${rogue.role}  ·  ${c.ticker}`, {
        size: FONT.size.tiny,
        color: 'ink',
      }).setOrigin(0.5, 0),
    );
    const charges = [
      ...new Set(
        c.documents.flatMap((doc) =>
          doc.clues.filter(isFlagClue).map((cl) => FLAGS[cl.flagId as FlagId].title),
        ),
      ),
    ];
    let y = 134;
    d.add(makeText(this, 6, y, 'charges', { size: FONT.size.tiny, color: 'paperShadow' }));
    y += 11;
    for (const ch of charges.slice(0, 5)) {
      d.add(makeText(this, 6, y, `- ${ch}`.slice(0, maxChars), { font: 'body', color: 'shadow' }));
      y += 12;
    }
    if (charges.length > 5)
      d.add(
        makeText(this, 6, y, `...and ${charges.length - 5} more`, {
          font: 'body',
          color: 'woodMid',
        }),
      );
    const r = saveStore.get().caseResults[caseId];
    d.add(
      makeText(
        this,
        w / 2,
        232,
        `reward  ${r?.bestScore ?? 0} pts  ·  grade ${r?.bestGrade ?? '-'}`,
        {
          size: FONT.size.tiny,
          color: 'woodMid',
        },
      ).setOrigin(0.5, 0),
    );
    // CAUGHT, stamped across the mugshot.
    const stamp = this.add
      .container(w / 2 + 34, 86)
      .setAngle(-18)
      .setAlpha(0.85);
    stamp.add(this.add.rectangle(0, 0, 58, 16).setStrokeStyle(2, HEX.stampRed).setOrigin(0.5));
    stamp.add(
      makeText(this, 0, 0, 'CAUGHT', { size: FONT.size.small, color: 'stampRed' }).setOrigin(0.5),
    );
    this.children.remove(stamp);
    d.add(stamp);
  }
}
