import type Phaser from 'phaser';
import { HEX, type PaletteKey } from '@/config/palette';
import { DESK, DRAWER, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { makeRng } from '@/systems/rng';
import { TEX, STEAM_FRAMES } from './keys';
import { drawPixels, makeCanvasTexture, makeGraphicsTexture, paintRadial } from './pixelUtil';

/** Wood tones can be swapped by cosmetic unlocks, but always stay in-palette. */
export interface WoodStyle {
  dark: PaletteKey;
  mid: PaletteKey;
  light: PaletteKey;
}
export const DEFAULT_WOOD: WoodStyle = { dark: 'woodDark', mid: 'woodMid', light: 'woodLight' };

export function makeWood(scene: Phaser.Scene, key: string, style: WoodStyle): void {
  makeGraphicsTexture(scene, key, GAME_WIDTH, GAME_HEIGHT, (g) => {
    const rng = makeRng('desk-wood');
    const plankH = 26;
    g.fillStyle(HEX[style.mid], 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    for (let py = 0; py < GAME_HEIGHT; py += plankH) {
      // Slight tone variation per plank via sparse dark/light dither.
      const tone = rng.int(0, 2);
      // Grain lines.
      const grainCount = rng.int(4, 7);
      for (let i = 0; i < grainCount; i++) {
        const gy = py + rng.int(2, plankH - 3);
        const gx = rng.int(0, GAME_WIDTH);
        const len = rng.int(30, 160);
        g.fillStyle(HEX[rng.chance(0.6) ? style.dark : style.light], 0.55);
        // Wobbly line: step every ~20px.
        let cy = gy;
        for (let x = gx; x < Math.min(GAME_WIDTH, gx + len); x += 1) {
          if (x % 23 === 0 && rng.chance(0.5)) cy += rng.int(-1, 1);
          g.fillRect(x, cy, 1, 1);
        }
      }
      // Knot occasionally.
      if (rng.chance(0.2)) {
        const kx = rng.int(40, GAME_WIDTH - 40);
        const ky = py + plankH / 2;
        g.fillStyle(HEX[style.dark], 1);
        g.fillRect(kx - 3, ky - 1, 6, 3);
        g.fillRect(kx - 1, ky - 2, 2, 5);
        g.fillStyle(HEX[style.light], 1);
        g.fillRect(kx - 5, ky - 3, 10, 1);
        g.fillRect(kx - 5, ky + 3, 10, 1);
      }
      // Plank seam.
      g.fillStyle(HEX[style.dark], 1);
      g.fillRect(0, py + plankH - 1, GAME_WIDTH, 1);
      if (tone === 2) {
        g.fillStyle(HEX[style.light], 1);
        g.fillRect(0, py, GAME_WIDTH, 1);
      }
      // Vertical joins.
      const joinX = rng.int(0, GAME_WIDTH);
      g.fillStyle(HEX[style.dark], 1);
      g.fillRect(joinX, py, 1, plankH);
    }
  });
}

export function makeLampLight(scene: Phaser.Scene): void {
  makeCanvasTexture(scene, TEX.lampLight, GAME_WIDTH, GAME_HEIGHT, (ctx, w, h) => {
    paintRadial(
      ctx,
      w,
      h,
      DESK.lightCenter.x,
      DESK.lightCenter.y,
      DESK.lightRadius,
      'amber',
      (t) => Math.pow(1 - t, 1.6) * 0.24,
      7,
    );
  });
}

export function makeVignette(scene: Phaser.Scene): void {
  makeCanvasTexture(scene, TEX.vignette, GAME_WIDTH, GAME_HEIGHT, (ctx, w, h) => {
    paintRadial(
      ctx,
      w,
      h,
      DESK.lightCenter.x,
      DESK.lightCenter.y,
      DESK.lightRadius + 60,
      'bg',
      (t) => Math.pow(Math.max(0, t - 0.35) / 0.65, 1.4) * 0.82,
      8,
    );
  });
}

const LAMP_MAP = {
  g: 'lampGreen',
  d: 'shadow',
  b: 'amber',
  k: 'bg',
  w: 'woodLight',
  p: 'paper',
} as const;
const LAMP = [
  '.........................................................',
  '..........ggggggggggggggggggggggggggggggggg..............',
  '........gggggggggggggggggggggggggggggggggggggg...........',
  '......ggggggggggggggggggggggggggggggggggggggggggg........',
  '....gggggggggggggggggggggggggggggggggggggggggggggggg.....',
  '...ggggggggggggggggggggggggggggggggggggggggggggggggggg...',
  '..ggggggggggggggggggggggggggggggggggggggggggggggggggggg..',
  '..ddddddddddddddddddddddddddddddddddddddddddddddddddddd..',
  '..dbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbd..',
  '...bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb..',
  '....pppbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbppp...',
  '......bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.....',
  '.........bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb........',
  '..........................bbb............................',
  '..........................bbb............................',
  '..........................bwb............................',
  '..........................bwb............................',
  '..........................bwb............................',
  '..........................bwb............................',
  '..........................bwb............................',
  '..........................bwb............................',
  '..........................bwb............................',
  '..........................bwb............................',
  '..........................bwb............................',
  '.........................bbwbb...........................',
  '.......................bbbbwbbbb.........................',
  '...................bbbbbbbbbbbbbbbbb.....................',
  '.................bbbbbbbbbbbbbbbbbbbbb...................',
  '................dddddddddddddddddddddddd.................',
  '................kkkkkkkkkkkkkkkkkkkkkkkk.................',
];

export function makeLamp(scene: Phaser.Scene, shade: PaletteKey = 'lampGreen'): void {
  makeGraphicsTexture(scene, TEX.lamp, 116, 62, (g) => {
    drawPixels(g, LAMP, { ...LAMP_MAP, g: shade }, 0, 0, 2);
    // Shade highlight and rim shadow.
    g.fillStyle(HEX.paper, 0.18);
    g.fillRect(24, 6, 36, 2);
    g.fillStyle(HEX.bg, 0.35);
    g.fillRect(4, 12, 108, 2);
  });
}

const MUG_MAP = {
  w: 'paper',
  s: 'paperShadow',
  c: 'woodDark',
  k: 'shadow',
  b: 'ink',
  h: 'paperShadow',
} as const;
const MUG = [
  '....wwwwwwwwwwww......',
  '...wsssssssssssssw....',
  '..wsccccccccccccccsw..',
  '..wsccccccccccccccsw..',
  '..wsscccccccccccccsw..',
  '..wwsssssssssssssww...',
  '..wwwwwwwwwwwwwwwwwwww',
  '..wbbwwwwwwwwwwwwwwssw',
  '..wbbwwwwwwwwwwwwws..w',
  '..wbbwwwwwwwwwwwwws..w',
  '..wbbbbbwwwwwwwwwws..w',
  '..wbbbbbwwwwwwwwwwsssw',
  '..wbbwwwwwwwwwwwwwsw..',
  '..wwwwwwwwwwwwwwwww...',
  '..swwwwwwwwwwwwwws....',
  '...ssssssssssssss.....',
  '....kkkkkkkkkkkk......',
];

export function makeMug(scene: Phaser.Scene): void {
  makeGraphicsTexture(scene, TEX.mug, 44, 34, (g) => drawPixels(g, MUG, MUG_MAP, 0, 0, 2));
  for (let f = 0; f < STEAM_FRAMES; f++) {
    makeGraphicsTexture(scene, `${TEX.steam}-${f}`, 14, 16, (g) => {
      g.fillStyle(HEX.paper, 1);
      // Two wisps, phase shifted per frame.
      for (let w = 0; w < 2; w++) {
        for (let y = 0; y < 16; y += 2) {
          const phase = (y / 4 + f * 0.9 + w * 1.7) % (Math.PI * 2);
          const x = 3 + w * 7 + Math.round(Math.sin(phase) * 2);
          g.fillRect(x, 15 - y, 1, 1);
        }
      }
    });
  }
}

export function makeFolders(scene: Phaser.Scene): void {
  // Single manila folder (used for case intake + case select).
  makeGraphicsTexture(scene, TEX.folder, 80, 56, (g) => {
    g.fillStyle(HEX.shadow, 0.5);
    g.fillRect(3, 5, 78, 53);
    g.fillStyle(HEX.paperShadow, 1);
    g.fillRect(0, 6, 78, 50);
    g.fillRect(0, 0, 28, 8); // tab
    g.fillStyle(HEX.woodLight, 1);
    g.fillRect(0, 55, 78, 1);
    g.fillRect(77, 6, 1, 50);
    g.fillStyle(HEX.paper, 1);
    g.fillRect(1, 7, 76, 1);
    g.fillRect(1, 1, 26, 1);
  });
  // A stack of folders for the desk corner.
  makeGraphicsTexture(scene, TEX.folderStack, 96, 70, (g) => {
    const tones: PaletteKey[] = ['woodLight', 'paperShadow', 'woodLight', 'paperShadow'];
    for (let i = 0; i < 4; i++) {
      const y = 40 - i * 10;
      const x = i % 2 === 0 ? 4 : 8;
      g.fillStyle(HEX.shadow, 0.5);
      g.fillRect(x + 2, y + 3, 80, 26);
      g.fillStyle(HEX[tones[i]], 1);
      g.fillRect(x, y, 80, 26);
      g.fillRect(x + 4, y - 5, 22, 6);
      g.fillStyle(HEX.paper, 1);
      g.fillRect(x + 1, y + 1, 78, 1);
      g.fillStyle(HEX.woodDark, 1);
      g.fillRect(x, y + 25, 80, 1);
    }
  });
}

const STAMP_MAP = { w: 'woodLight', m: 'woodMid', d: 'woodDark', k: 'shadow', b: 'bg' } as const;
const STAMP_BODY = [
  '.................wwwwwwwwwwwwwww.................',
  '................wwmmmmmmmmmmmmmww................',
  '................wmmmmmmmmmmmmmmmw................',
  '................wmmmmmmmmmmmmmmmw................',
  '................wmmmmmmmmmmmmmmmw................',
  '.................wmmmmmmmmmmmmmw.................',
  '..................wdmmmmmmmmmdw..................',
  '...................wdddddddddw...................',
  '....................wdddddddw....................',
  '....................wdddddddw....................',
  '....................wdddddddw....................',
  '....................wdddddddw....................',
  '....................wdddddddw....................',
  '.................wwwwwwwwwwwwwwww................',
  '..............wwwwmmmmmmmmmmmmmmmwww.............',
  '...........wwwmmmmmmmmmmmmmmmmmmmmmmmww..........',
  '.........wwmmmmmmmmmmmmmmmmmmmmmmmmmmmmww........',
  '........wmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmw.......',
  '........wmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmw.......',
  '.......wmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmw......',
  '.......wmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmw......',
  '.......dmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmd......',
  '.......dddddddddddddddddddddddddddddddddddd......',
  '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
  '.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.',
];

export function makeStamps(
  scene: Phaser.Scene,
  rugInk: PaletteKey = 'stampRed',
  legitInk: PaletteKey = 'stampGreen',
): void {
  const build = (key: string, ink: PaletteKey) =>
    makeGraphicsTexture(scene, key, 50, 30, (g) => {
      drawPixels(g, STAMP_BODY, STAMP_MAP);
      // Ink-stained rubber edge to hint the colour without relying on it alone.
      g.fillStyle(HEX[ink], 1);
      g.fillRect(2, 26, 46, 1);
      // Handle highlight.
      g.fillStyle(HEX.paper, 0.25);
      g.fillRect(18, 2, 6, 1);
      g.fillRect(10, 17, 14, 1);
    });
  build(TEX.stampRug, rugInk);
  build(TEX.stampLegit, legitInk);

  makeGraphicsTexture(scene, TEX.inkPad, 62, 26, (g) => {
    g.fillStyle(HEX.bg, 1);
    g.fillRect(0, 4, 62, 22);
    g.fillStyle(HEX.shadow, 1);
    g.fillRect(1, 5, 60, 20);
    g.fillStyle(HEX.stampRed, 1);
    g.fillRect(5, 9, 24, 12);
    g.fillStyle(HEX.stampGreen, 1);
    g.fillRect(33, 9, 24, 12);
    g.fillStyle(HEX.bg, 0.5);
    g.fillRect(5, 9, 24, 2);
    g.fillRect(33, 9, 24, 2);
    // Lid edge.
    g.fillStyle(HEX.woodDark, 1);
    g.fillRect(0, 0, 62, 4);
    g.fillStyle(HEX.woodLight, 1);
    g.fillRect(1, 1, 60, 1);
  });
}

export function makeCorkboard(scene: Phaser.Scene): void {
  const { w, h } = DESK.corkboard;
  makeGraphicsTexture(scene, TEX.corkboard, w, h, (g) => {
    const rng = makeRng('cork');
    g.fillStyle(HEX.woodDark, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(HEX.woodLight, 1);
    g.fillRect(4, 4, w - 8, h - 8);
    g.fillStyle(HEX.woodMid, 1);
    for (let i = 0; i < 140; i++) g.fillRect(rng.int(5, w - 6), rng.int(5, h - 6), 1, 1);
    // Two pinned notes.
    const note = (x: number, y: number, nw: number, nh: number, pin: PaletteKey) => {
      g.fillStyle(HEX.shadow, 0.4);
      g.fillRect(x + 1, y + 2, nw, nh);
      g.fillStyle(HEX.paper, 1);
      g.fillRect(x, y, nw, nh);
      g.fillStyle(HEX.paperShadow, 1);
      for (let l = 0; l < nh - 6; l += 4) g.fillRect(x + 3, y + 4 + l, nw - 7, 1);
      g.fillStyle(HEX[pin], 1);
      g.fillRect(x + nw / 2 - 1, y - 1, 3, 3);
    };
    note(10, 10, 28, 24, 'stampRed');
    note(46, 14, 22, 20, 'ink');
    // A polaroid of the office: click it for the history wall.
    const px = 80;
    const py = 9;
    g.fillStyle(HEX.shadow, 0.4);
    g.fillRect(px + 1, py + 2, 30, 30);
    g.fillStyle(HEX.paper, 1);
    g.fillRect(px, py, 30, 30);
    g.fillStyle(HEX.woodMid, 1);
    g.fillRect(px + 3, py + 3, 24, 19);
    g.fillStyle(HEX.woodDark, 1);
    g.fillRect(px + 3, py + 15, 24, 7);
    g.fillStyle(HEX.amber, 1);
    g.fillRect(px + 6, py + 5, 5, 3);
    g.fillStyle(HEX.paper, 1);
    g.fillRect(px + 12, py + 11, 8, 6);
    g.fillStyle(HEX.stampRed, 1);
    g.fillRect(px + 14, py - 1, 3, 3);
    // String between pins (red thread, classic corkboard).
    g.lineStyle(1, HEX.stampRed, 1);
    g.lineBetween(24, 10, 57, 14);
    g.lineBetween(57, 14, px + 15, py);
  });
}

export function makeClock(scene: Phaser.Scene): void {
  makeGraphicsTexture(scene, TEX.clock, 30, 34, (g) => {
    g.fillStyle(HEX.shadow, 0.5);
    g.fillRect(3, 30, 26, 4);
    g.fillStyle(HEX.woodDark, 1);
    g.fillRect(6, 28, 18, 4);
    g.fillStyle(HEX.amber, 1);
    g.fillCircle(15, 15, 14);
    g.fillStyle(HEX.woodDark, 1);
    g.fillCircle(15, 15, 12);
    g.fillStyle(HEX.paper, 1);
    g.fillCircle(15, 15, 10);
    g.fillStyle(HEX.shadow, 1);
    // Hour ticks.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillRect(Math.round(15 + Math.cos(a) * 8), Math.round(15 + Math.sin(a) * 8), 1, 1);
    }
    g.fillStyle(HEX.amber, 1);
    g.fillRect(14, 0, 2, 3);
  });
}

/** A full-screen cork texture for the evidence wall. */
export function makeCork(scene: Phaser.Scene): void {
  makeGraphicsTexture(scene, TEX.cork, GAME_WIDTH, GAME_HEIGHT, (g) => {
    const rng = makeRng('big-cork');
    g.fillStyle(HEX.woodDark, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.fillStyle(HEX.woodLight, 1);
    g.fillRect(6, 6, GAME_WIDTH - 12, GAME_HEIGHT - 12);
    g.fillStyle(HEX.woodMid, 1);
    for (let i = 0; i < 5200; i++)
      g.fillRect(rng.int(7, GAME_WIDTH - 8), rng.int(7, GAME_HEIGHT - 8), 1, 1);
    g.fillStyle(HEX.paperShadow, 0.35);
    for (let i = 0; i < 900; i++)
      g.fillRect(rng.int(7, GAME_WIDTH - 8), rng.int(7, GAME_HEIGHT - 8), 1, 1);
    // Frame bevel.
    g.fillStyle(HEX.paperShadow, 0.5);
    g.fillRect(6, 6, GAME_WIDTH - 12, 1);
    g.fillRect(6, 6, 1, GAME_HEIGHT - 12);
    g.fillStyle(HEX.bg, 0.5);
    g.fillRect(6, GAME_HEIGHT - 7, GAME_WIDTH - 12, 1);
    g.fillRect(GAME_WIDTH - 7, 6, 1, GAME_HEIGHT - 12);
  });
}

export function makeDrawer(scene: Phaser.Scene): void {
  const { w, h } = DRAWER;
  makeGraphicsTexture(scene, TEX.drawer, w, h, (g) => {
    g.fillStyle(HEX.bg, 1);
    g.fillRect(0, 0, w, h);
    g.fillStyle(HEX.shadow, 1);
    g.fillRect(6, 6, w - 12, h - 12);
    g.fillStyle(HEX.woodDark, 1);
    g.fillRect(0, 0, w, 6);
    g.fillRect(0, h - 6, w, 6);
    g.fillRect(0, 0, 6, h);
    g.fillRect(w - 6, 0, 6, h);
    g.fillStyle(HEX.woodLight, 1);
    g.fillRect(6, 6, w - 12, 1);
    // Hanging rails, one per folder row.
    g.fillStyle(HEX.paperShadow, 1);
    g.fillRect(14, 30, w - 28, 2);
    g.fillRect(14, 30 + DRAWER.folderH + DRAWER.gapY, w - 28, 2);
  });
}
