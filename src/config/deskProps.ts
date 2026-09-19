import { DESK, GAME_HEIGHT, GAME_WIDTH } from './layout';
import type { OrnamentKind } from '@/data/shop';

/**
 * The desk's movable props and the shape of a saved arrangement (see
 * src/systems/deskLayout.ts for reading and changing it). Kept apart from the save so the
 * schema and its sanitiser need nothing but the layout numbers.
 */
export type PropId =
  'mug' | 'radio' | 'ornament' | 'phone' | 'safe' | 'folderStack' | 'inkPad' | 'clock';

export const PROP_IDS: PropId[] = [
  'mug',
  'radio',
  'ornament',
  'phone',
  'safe',
  'folderStack',
  'inkPad',
  'clock',
];

export const PROP_NAME: Record<PropId, string> = {
  mug: 'mug',
  radio: 'radio',
  ornament: 'ornament',
  phone: 'phone',
  safe: 'safe',
  folderStack: 'folders',
  inkPad: 'ink pad',
  clock: 'clock',
};

export interface Pos {
  x: number;
  y: number;
}

export interface DeskExtra extends Pos {
  kind: OrnamentKind;
}

export interface DeskLayout {
  /** Props moved off their default spot (top-left corners). */
  pos: Partial<Record<PropId, Pos>>;
  /** Props taken off the desk. */
  hidden: PropId[];
  /** More ornaments, one per spot, anywhere on the desk. */
  extras: DeskExtra[];
  /** Ornament spots bought at the editor (see SPOT_PRICES). */
  spots: number;
}

export const DEFAULT_DESK_LAYOUT: DeskLayout = { pos: {}, hidden: [], extras: [], spots: 0 };

/** What each further ornament spot costs, in clips. Three is plenty of corner. */
export const SPOT_PRICES = [30, 50, 80] as const;

/** Positions snap to this grid in the editor. */
export const GRID = 4;

/** The desk surface: props stay below the window and inside the screen. */
export const DESK_TOP = DESK.window.y + DESK.window.h;

/** Sanitise a saved layout: only known props, on-screen integers, owned kinds later. */
export function sanitizeDeskLayout(raw: unknown, ornamentKinds: string[]): DeskLayout {
  const out: DeskLayout = { pos: {}, hidden: [], extras: [], spots: 0 };
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  const num = (v: unknown, lo: number, hi: number): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : null;
  if (r.pos && typeof r.pos === 'object') {
    for (const id of PROP_IDS) {
      const p = (r.pos as Record<string, unknown>)[id];
      if (!p || typeof p !== 'object') continue;
      const x = num((p as Record<string, unknown>).x, 0, GAME_WIDTH);
      const y = num((p as Record<string, unknown>).y, DESK_TOP, GAME_HEIGHT);
      if (x !== null && y !== null) out.pos[id] = { x, y };
    }
  }
  const hidden = r.hidden;
  if (Array.isArray(hidden)) out.hidden = PROP_IDS.filter((id) => hidden.includes(id));
  out.spots = Math.min(SPOT_PRICES.length, num(r.spots, 0, SPOT_PRICES.length) ?? 0);
  if (Array.isArray(r.extras)) {
    for (const e of r.extras) {
      if (!e || typeof e !== 'object' || out.extras.length >= out.spots) continue;
      const er = e as Record<string, unknown>;
      const x = num(er.x, 0, GAME_WIDTH);
      const y = num(er.y, DESK_TOP, GAME_HEIGHT);
      if (typeof er.kind !== 'string' || !ornamentKinds.includes(er.kind)) continue;
      if (x !== null && y !== null) out.extras.push({ kind: er.kind as OrnamentKind, x, y });
    }
  }
  return out;
}
