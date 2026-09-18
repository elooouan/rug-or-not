import type Phaser from 'phaser';
import { HEX } from '@/config/palette';
import { DESK } from '@/config/layout';
import { makeRng } from '@/systems/rng';
import { TEX } from './keys';
import { bayer4, drawPixels, makeGraphicsTexture } from './pixelUtil';

/**
 * The night window: frame, rain-streaked glass, a city skyline with lit
 * windows, a moon, and a sill for the cat. Lit windows are a separate layered
 * texture (two frames) so they can twinkle without redrawing the skyline.
 */
/**
 * Where the moon is in its cycle, 0 = new, 0.5 = full, from a known new moon
 * (2000-01-06 18:14 UTC) and the synodic month. Good to a day, which is all a
 * six-pixel moon can show.
 */
export function moonPhase(date: Date = new Date()): number {
  const synodic = 29.530588853;
  const days = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000;
  return (((days % synodic) + synodic) % synodic) / synodic;
}

/** A six-pixel moon: a lit disc with the night's shadow slid across it. */
export function drawMoon(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  phase: number,
): void {
  const lit = (1 - Math.cos(phase * Math.PI * 2)) / 2; // 0 new .. 1 full
  // Faint outline so a new moon still reads as a moon.
  g.fillStyle(HEX.paperShadow, 0.35);
  g.fillCircle(cx, cy, 6);
  g.fillStyle(HEX.paper, 1);
  g.fillCircle(cx, cy, 6);
  if (lit < 0.97) {
    // The shadow disc slides off to one side as the moon waxes, the other as it wanes.
    const dir = phase < 0.5 ? 1 : -1;
    const offset = Math.round(lit * 11);
    g.fillStyle(HEX.bg, 1);
    g.fillCircle(cx + dir * offset, cy - 1, 5.5);
  }
  g.fillStyle(HEX.paperShadow, 1);
  g.fillRect(cx - 3, cy + 2, 1, 1);
}

export function makeWindow(scene: Phaser.Scene): void {
  const { w, h } = DESK.window;
  const frame = 4;
  const sill = 6;
  const glassH = h - frame - sill;

  makeGraphicsTexture(scene, TEX.window, w, h, (g) => {
    const rng = makeRng('window');
    // Frame.
    g.fillStyle(HEX.woodDark, 1);
    g.fillRect(0, 0, w, h);
    // Sky: near-black up top fading to a dithered ink-blue city glow at the horizon.
    g.fillStyle(HEX.bg, 1);
    g.fillRect(frame, frame, w - frame * 2, glassH);
    for (let y = frame; y < frame + glassH; y++) {
      const t = (y - frame) / glassH; // 0 top .. 1 horizon
      for (let x = frame; x < w - frame; x++) {
        const v = Math.pow(t, 2.2) * 0.9;
        if (bayer4(x, y) / 16 < v) {
          g.fillStyle(HEX[v > 0.55 && bayer4(x + 1, y) / 16 < v - 0.4 ? 'ink' : 'shadow'], 1);
          g.fillRect(x, y, 1, 1);
        }
      }
    }
    // Moon (its phase follows the real calendar; see drawMoon).
    drawMoon(g, w - 60, frame + 12, moonPhase());
    // Skyline: overlapping building silhouettes along the horizon.
    const horizon = frame + glassH;
    let x = frame;
    while (x < w - frame) {
      const bw = rng.int(10, 26);
      const bh = rng.int(8, glassH - 8);
      g.fillStyle(HEX.bg, 1);
      g.fillRect(x, horizon - bh, Math.min(bw, w - frame - x), bh);
      // Rooftop details.
      if (rng.chance(0.4)) g.fillRect(x + rng.int(1, Math.max(1, bw - 3)), horizon - bh - 3, 2, 3);
      if (rng.chance(0.15)) {
        g.fillStyle(HEX.stampRed, 1);
        g.fillRect(x + Math.floor(bw / 2), horizon - bh - 4, 1, 1); // aircraft warning light
      }
      x += bw - rng.int(2, 6);
    }
    // A couple of neon signs down in the city.
    g.fillStyle(HEX.stampRed, 1);
    g.fillRect(frame + 40, horizon - 9, 4, 1);
    g.fillRect(frame + 41, horizon - 11, 2, 2);
    g.fillStyle(HEX.lampGreen, 1);
    g.fillRect(w - 110, horizon - 14, 1, 5);
    g.fillRect(w - 108, horizon - 14, 1, 5);
    g.fillStyle(HEX.amber, 1);
    g.fillRect(frame + 190, horizon - 20, 3, 1);
    // Moon glow, then the moon again on top of the skyline.
    const lit = (1 - Math.cos(moonPhase() * Math.PI * 2)) / 2;
    g.fillStyle(HEX.ink, 0.15 + 0.25 * lit);
    g.fillCircle(w - 60, frame + 12, 10);
    drawMoon(g, w - 60, frame + 12, moonPhase());
    // Rain on the glass: a few static droplets.
    g.fillStyle(HEX.ink, 0.7);
    for (let i = 0; i < 26; i++)
      g.fillRect(rng.int(frame, w - frame - 1), rng.int(frame, horizon - 2), 1, rng.int(1, 3));
    // Mullions.
    g.fillStyle(HEX.woodDark, 1);
    const third = Math.floor((w - frame * 2) / 3);
    g.fillRect(frame + third, 0, 3, h);
    g.fillRect(frame + third * 2, 0, 3, h);
    // Sill.
    g.fillStyle(HEX.woodLight, 1);
    g.fillRect(0, h - sill, w, 3);
    g.fillStyle(HEX.woodMid, 1);
    g.fillRect(0, h - sill + 3, w, sill - 3);
    g.fillStyle(HEX.bg, 0.4);
    g.fillRect(0, h - sill + 3, w, 1);
  });

  // Lit windows in the buildings, two frames with different subsets for twinkling.
  for (let f = 0; f < 2; f++) {
    makeGraphicsTexture(scene, `${TEX.windowLights}-${f}`, w, h, (g) => {
      const rng = makeRng('window'); // same seed → same skyline geometry
      const horizon = frame + glassH;
      let x = frame;
      const lights = makeRng(`lights-${f}`);
      while (x < w - frame) {
        const bw = rng.int(10, 26);
        const bh = rng.int(8, glassH - 8);
        if (rng.chance(0.4)) rng.int(1, Math.max(1, bw - 3));
        rng.chance(0.15);
        for (let wy = horizon - bh + 3; wy < horizon - 2; wy += 3) {
          for (let wx = x + 2; wx < Math.min(x + bw, w - frame) - 2; wx += 3) {
            if (lights.chance(0.28)) {
              g.fillStyle(
                HEX[lights.chance(0.8) ? 'amber' : 'paper'],
                lights.chance(0.5) ? 1 : 0.6,
              );
              g.fillRect(wx, wy, 1, 1);
            }
          }
        }
        x += bw - rng.int(2, 6);
      }
    });
  }

  // Lightning flash overlay (glass area only).
  makeGraphicsTexture(scene, TEX.windowFlash, w, h, (g) => {
    g.fillStyle(HEX.paper, 1);
    g.fillRect(frame, frame, w - frame * 2, glassH);
  });

  // Snow, stars (two twinkle frames) and a fog bank for the other weathers.
  makeGraphicsTexture(scene, TEX.snowflake, 2, 2, (g) => {
    g.fillStyle(HEX.paper, 1);
    g.fillRect(0, 0, 2, 2);
  });
  for (let f = 0; f < 2; f++) {
    makeGraphicsTexture(scene, `${TEX.stars}-${f}`, w, h, (g) => {
      const rng = makeRng(`stars-${f}`);
      for (let i = 0; i < 34; i++) {
        g.fillStyle(HEX[rng.chance(0.3) ? 'paperShadow' : 'paper'], rng.chance(0.5) ? 1 : 0.6);
        g.fillRect(
          rng.int(frame + 1, w - frame - 2),
          rng.int(frame + 1, frame + glassH * 0.55),
          1,
          1,
        );
      }
    });
  }
  makeGraphicsTexture(scene, TEX.fog, w * 2, glassH, (g) => {
    const rng = makeRng('fog');
    for (let y = 0; y < glassH; y++) {
      for (let x = 0; x < w * 2; x++) {
        // Soft horizontal bands, denser near the bottom.
        const band = 0.35 + 0.45 * (y / glassH) + 0.2 * Math.sin(x / 23 + y / 5);
        if (bayer4(x, y) / 16 < band * 0.5 && rng.chance(0.9)) {
          g.fillStyle(HEX.paperShadow, 1);
          g.fillRect(x, y, 1, 1);
        }
      }
    }
  });

  makeGraphicsTexture(scene, TEX.raindrop, 1, 5, (g) => {
    g.fillStyle(HEX.paperShadow, 1);
    g.fillRect(0, 0, 1, 3);
    g.fillStyle(HEX.ink, 1);
    g.fillRect(0, 3, 1, 2);
  });
}

const CAT_MAP = { b: 'woodDark', d: 'shadow', e: 'amber', p: 'stampRed' } as const;
// Frame 0: eyes open, tail down. Frame 1: eyes open, tail up. Frame 2: blink.
const CAT_FRAMES = [
  [
    '.b.b..........',
    'bbbbb.........',
    'bebeb.........',
    'bbbbb.........',
    '.bbbbbbbb.....',
    '.bbbbbbbbb....',
    '.bbbbbbbbbb...',
    '.bbbbbbbbbb.b.',
    '.bbbbbbbbbbbb.',
    '..bb..bb.bbb..',
  ],
  [
    '.b.b..........',
    'bbbbb.........',
    'bebeb.........',
    'bbbbb.........',
    '.bbbbbbbb....b',
    '.bbbbbbbbb...b',
    '.bbbbbbbbbb.bb',
    '.bbbbbbbbbbbb.',
    '.bbbbbbbbbbb..',
    '..bb..bb.bbb..',
  ],
  [
    '.b.b..........',
    'bbbbb.........',
    'bdbdb.........',
    'bbbbb.........',
    '.bbbbbbbb.....',
    '.bbbbbbbbb....',
    '.bbbbbbbbbb...',
    '.bbbbbbbbbb.b.',
    '.bbbbbbbbbbbb.',
    '..bb..bb.bbb..',
  ],
];

export function makeCat(scene: Phaser.Scene): void {
  CAT_FRAMES.forEach((rows, i) => {
    makeGraphicsTexture(scene, `${TEX.cat}-${i}`, 28, 20, (g) => {
      drawPixels(g, rows, CAT_MAP, 0, 0, 2);
      // Rim light along the back so the silhouette reads against the night sky.
      g.fillStyle(HEX.woodLight, 0.7);
      g.fillRect(2, 8, 2, 2);
      g.fillRect(2, 10, 2, 6);
    });
  });
  makeGraphicsTexture(scene, TEX.heart, 7, 6, (g) =>
    drawPixels(g, ['.pp.pp.', 'ppppppp', 'ppppppp', '.ppppp.', '..ppp..', '...p...'], {
      p: 'stampRed',
    }),
  );
  makeGraphicsTexture(scene, TEX.steamPuff, 12, 8, (g) => {
    g.fillStyle(HEX.paper, 1);
    g.fillRect(2, 2, 8, 4);
    g.fillRect(4, 0, 4, 8);
    g.fillRect(0, 3, 12, 2);
  });
}
