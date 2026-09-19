import { DESK, NOTEBOOK, PAPER, STAMP, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import {
  DESK_TOP,
  GRID,
  SPOT_PRICES,
  type DeskExtra,
  type DeskLayout,
  type Pos,
  type PropId,
} from '@/config/deskProps';
import { SHOP, type OrnamentKind } from '@/data/shop';
import { clipBalance, owns } from './clips';
import { saveStore } from './save';

export {
  DEFAULT_DESK_LAYOUT,
  DESK_TOP,
  GRID,
  PROP_IDS,
  PROP_NAME,
  SPOT_PRICES,
  sanitizeDeskLayout,
} from '@/config/deskProps';
export type { DeskExtra, DeskLayout, Pos, PropId } from '@/config/deskProps';

/**
 * Where things sit on the desk. The layout in `src/config/layout.ts` is the default; the
 * desk editor (on the title) lets the player drag the props about, take some off, and put
 * more ornaments down on spots bought with clips. Every screen that draws the desk reads
 * positions from here, so a moved radio is moved everywhere. Pure logic: no Phaser.
 */
/** Where paperwork lives while a file is open; a prop under it would never be seen. */
export const PAPERWORK: { x: number; y: number; w: number; h: number; name: string }[] = [
  { x: PAPER.x, y: PAPER.y, w: PAPER.w, h: PAPER.h, name: 'the file' },
  { x: NOTEBOOK.x, y: NOTEBOOK.y, w: NOTEBOOK.w, h: NOTEBOOK.h, name: 'the notebook' },
  {
    x: DESK.stampRug.x,
    y: DESK.stampRug.y,
    w: DESK.stampLegit.x + STAMP.w - DESK.stampRug.x,
    h: STAMP.h,
    name: 'the stamps',
  },
];

export function deskLayout(): DeskLayout {
  return saveStore.get().desk;
}

/** Default top-left corner of a prop, from the layout config. */
export function defaultPos(id: PropId): Pos {
  const p = DESK[id];
  return { x: p.x, y: p.y };
}

/** Where a prop sits right now: moved, or where the config puts it. */
export function deskPos(id: PropId): Pos {
  return deskLayout().pos[id] ?? defaultPos(id);
}

export function propHidden(id: PropId): boolean {
  return deskLayout().hidden.includes(id);
}

export function deskExtras(): DeskExtra[] {
  return deskLayout().extras;
}

export function spotsFree(): number {
  return Math.max(0, deskLayout().spots - deskLayout().extras.length);
}

/** The next spot's price, or null once every spot is bought. */
export function nextSpotPrice(): number | null {
  return SPOT_PRICES[deskLayout().spots] ?? null;
}

/** Ornament kinds the desk can put on a spot: bought at the market (or the free one). */
export function ownedOrnamentKinds(): OrnamentKind[] {
  const kinds: OrnamentKind[] = [];
  for (const item of SHOP) {
    if (item.style.slot !== 'ornament' || item.style.kind === 'none') continue;
    if (owns(item.id)) kinds.push(item.style.kind);
  }
  return kinds;
}

/** Why a spot can't be bought right now, or null when it can. */
export function spotBlocker(): string | null {
  const price = nextSpotPrice();
  if (price === null) return 'no more room on the desk';
  if (ownedOrnamentKinds().length === 0) return 'buy an ornament at the market first';
  if (clipBalance() < price) return `${price - clipBalance()} more clips`;
  return null;
}

/** Buy the next spot with clips. Returns false when it couldn't. */
export function buySpot(): boolean {
  const price = nextSpotPrice();
  if (price === null || spotBlocker()) return false;
  saveStore.update((d) => {
    d.clips.spent += price;
    d.desk.spots += 1;
  });
  return true;
}

export interface Box extends Pos {
  w: number;
  h: number;
}

const overlaps = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** The paperwork a box would hide under, or null when it's in the clear. */
export function underPaperwork(box: Box): string | null {
  return PAPERWORK.find((p) => overlaps(box, p))?.name ?? null;
}

/** Snap a top-left corner to the grid and keep the box on the desk. */
export function clampPos(x: number, y: number, w: number, h: number): Pos {
  const snap = (v: number) => Math.round(v / GRID) * GRID;
  return {
    x: Math.min(Math.max(0, snap(x)), Math.max(0, GAME_WIDTH - w)),
    y: Math.min(Math.max(DESK_TOP, snap(y)), Math.max(DESK_TOP, GAME_HEIGHT - h)),
  };
}

export function moveProp(id: PropId, pos: Pos): void {
  saveStore.update((d) => {
    const def = defaultPos(id);
    if (pos.x === def.x && pos.y === def.y) delete d.desk.pos[id];
    else d.desk.pos[id] = { x: pos.x, y: pos.y };
  });
}

export function setPropHidden(id: PropId, hidden: boolean): void {
  saveStore.update((d) => {
    d.desk.hidden = d.desk.hidden.filter((h) => h !== id);
    if (hidden) d.desk.hidden.push(id);
  });
}

/** Put an ornament on a free spot. Returns its index, or -1 without a spot or the kind. */
export function placeExtra(kind: OrnamentKind, pos: Pos): number {
  if (spotsFree() <= 0 || !ownedOrnamentKinds().includes(kind)) return -1;
  let index = -1;
  saveStore.update((d) => {
    index = d.desk.extras.push({ kind, x: pos.x, y: pos.y }) - 1;
  });
  return index;
}

export function moveExtra(index: number, pos: Pos): void {
  saveStore.update((d) => {
    const e = d.desk.extras[index];
    if (e) {
      e.x = pos.x;
      e.y = pos.y;
    }
  });
}

export function setExtraKind(index: number, kind: OrnamentKind): void {
  if (!ownedOrnamentKinds().includes(kind)) return;
  saveStore.update((d) => {
    const e = d.desk.extras[index];
    if (e) e.kind = kind;
  });
}

/** Take an ornament off its spot; the spot stays bought. */
export function removeExtra(index: number): void {
  saveStore.update((d) => {
    d.desk.extras.splice(index, 1);
  });
}

/** Everything back where the desk came: positions, hidden props, extras. Spots stay. */
export function resetLayout(): void {
  saveStore.update((d) => {
    d.desk.pos = {};
    d.desk.hidden = [];
    d.desk.extras = [];
  });
}

/** True when anything is off its default place (the Feng Shui badge). */
export function layoutChanged(layout: DeskLayout = deskLayout()): boolean {
  return Object.keys(layout.pos).length > 0 || layout.hidden.length > 0 || layout.extras.length > 0;
}
