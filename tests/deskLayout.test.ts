import { beforeEach, describe, expect, it } from 'vitest';
import { DESK, GAME_HEIGHT, GAME_WIDTH, PAPER } from '@/config/layout';
import {
  buySpot,
  clampPos,
  defaultPos,
  deskExtras,
  deskPos,
  DESK_TOP,
  layoutChanged,
  moveExtra,
  moveProp,
  nextSpotPrice,
  ownedOrnamentKinds,
  placeExtra,
  propHidden,
  removeExtra,
  resetLayout,
  sanitizeDeskLayout,
  setExtraKind,
  setPropHidden,
  spotBlocker,
  SPOT_PRICES,
  spotsFree,
  underPaperwork,
} from '@/systems/deskLayout';
import { clipBalance } from '@/systems/clips';
import { sanitizeSave, saveStore } from '@/systems/save';

beforeEach(() => saveStore.reset());

describe('positions', () => {
  it('reads the config until something moves', () => {
    expect(deskPos('mug')).toEqual({ x: DESK.mug.x, y: DESK.mug.y });
    moveProp('mug', { x: 200, y: 300 });
    expect(deskPos('mug')).toEqual({ x: 200, y: 300 });
    expect(layoutChanged()).toBe(true);
    // Back on its default spot: no override kept.
    moveProp('mug', defaultPos('mug'));
    expect(saveStore.get().desk.pos.mug).toBeUndefined();
    expect(layoutChanged()).toBe(false);
  });
  it('hides and shows props', () => {
    setPropHidden('radio', true);
    expect(propHidden('radio')).toBe(true);
    setPropHidden('radio', true);
    expect(saveStore.get().desk.hidden).toEqual(['radio']);
    setPropHidden('radio', false);
    expect(propHidden('radio')).toBe(false);
  });
  it('snaps to the grid and keeps boxes on the desk', () => {
    expect(clampPos(13, 10, 20, 20)).toEqual({ x: 12, y: DESK_TOP });
    expect(clampPos(700, 700, 20, 20)).toEqual({ x: GAME_WIDTH - 20, y: GAME_HEIGHT - 20 });
  });
  it('knows what sits under the paperwork', () => {
    expect(underPaperwork({ x: PAPER.x + 10, y: PAPER.y + 10, w: 20, h: 20 })).toBe('the file');
    expect(underPaperwork({ x: DESK.stampRug.x, y: DESK.stampRug.y, w: 8, h: 8 })).toBe(
      'the stamps',
    );
    expect(underPaperwork({ x: DESK.mug.x, y: DESK.mug.y, w: 20, h: 20 })).toBeNull();
  });
});

describe('spots and extras', () => {
  it('needs an owned ornament and the clips', () => {
    expect(spotBlocker()).toBe('buy an ornament at the market first');
    saveStore.update((d) => d.owned.push('orn-plant'));
    expect(spotBlocker()).toBe(`${SPOT_PRICES[0]} more clips`);
    saveStore.update((d) => (d.clips.earned = 100));
    expect(spotBlocker()).toBeNull();
    expect(buySpot()).toBe(true);
    expect(clipBalance()).toBe(100 - SPOT_PRICES[0]);
    expect(spotsFree()).toBe(1);
    expect(nextSpotPrice()).toBe(SPOT_PRICES[1]);
  });
  it('places, moves, swaps and removes extras', () => {
    saveStore.update((d) => {
      d.owned.push('orn-plant', 'orn-globe');
      d.clips.earned = 500;
    });
    expect(ownedOrnamentKinds()).toEqual(['plant', 'globe']);
    expect(placeExtra('plant', { x: 600, y: 320 })).toBe(-1);
    buySpot();
    expect(placeExtra('skull', { x: 600, y: 320 })).toBe(-1);
    expect(placeExtra('plant', { x: 600, y: 320 })).toBe(0);
    expect(spotsFree()).toBe(0);
    moveExtra(0, { x: 560, y: 320 });
    setExtraKind(0, 'globe');
    setExtraKind(0, 'skull');
    expect(deskExtras()).toEqual([{ kind: 'globe', x: 560, y: 320 }]);
    removeExtra(0);
    expect(deskExtras()).toEqual([]);
    expect(spotsFree()).toBe(1);
  });
  it('stops at the last spot', () => {
    saveStore.update((d) => {
      d.owned.push('orn-plant');
      d.clips.earned = 1000;
    });
    for (let i = 0; i < SPOT_PRICES.length; i++) expect(buySpot()).toBe(true);
    expect(buySpot()).toBe(false);
    expect(spotBlocker()).toBe('no more room on the desk');
  });
  it('reset keeps the spots', () => {
    saveStore.update((d) => {
      d.owned.push('orn-plant');
      d.clips.earned = 100;
    });
    buySpot();
    placeExtra('plant', { x: 600, y: 320 });
    moveProp('safe', { x: 300, y: 300 });
    setPropHidden('mug', true);
    resetLayout();
    expect(saveStore.get().desk).toEqual({ pos: {}, hidden: [], extras: [], spots: 1 });
  });
});

describe('sanitising', () => {
  it('drops unknown props, off-desk positions and unowned kinds', () => {
    const out = sanitizeDeskLayout(
      {
        pos: { mug: { x: 10.4, y: 100 }, lamp: { x: 1, y: 1 }, radio: { x: 'a', y: 2 } },
        hidden: ['radio', 'lamp', 5],
        extras: [
          { kind: 'plant', x: 600, y: 320 },
          { kind: 'bobble', x: 600, y: 320 },
          { kind: 'plant', x: 500, y: 300 },
        ],
        spots: 2.7,
      },
      ['plant'],
    );
    expect(out).toEqual({
      pos: { mug: { x: 10, y: 100 } },
      hidden: ['radio'],
      extras: [
        { kind: 'plant', x: 600, y: 320 },
        { kind: 'plant', x: 500, y: 300 },
      ],
      spots: 3,
    });
    expect(sanitizeDeskLayout(null, [])).toEqual({ pos: {}, hidden: [], extras: [], spots: 0 });
  });
  it('a save only keeps extras it can draw', () => {
    const s = sanitizeSave({
      owned: ['orn-globe'],
      desk: {
        spots: 1,
        extras: [
          { kind: 'skull', x: 600, y: 320 },
          { kind: 'globe', x: 600, y: 320 },
        ],
      },
    });
    expect(s.desk.extras).toEqual([{ kind: 'globe', x: 600, y: 320 }]);
    expect(s.desk.spots).toBe(1);
  });
});
