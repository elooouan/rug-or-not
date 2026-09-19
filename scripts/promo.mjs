/**
 * Marketing shots: PNG screenshots and short GIF clips of the game, driven through a
 * headless Chromium at 1280x720 (twice the 640x360 world, so every pixel is crisp and
 * the frame is Twitter's 16:9). Output lands in assets/marketing/ named
 * `<tag>-<what>.png` / `<tag>-clip-<what>.gif`.
 *
 *   npm run dev            (in another terminal; the script drives the dev server)
 *   node scripts/promo.mjs [only]      e.g. `node scripts/promo.mjs lens` or `clips`
 *
 *   PROMO_BASE=http://localhost:5173  PROMO_OUT=assets/marketing  PROMO_TAG=v0.8
 *
 * GIFs are encoded in the page with gifenc (dev dependency); there is no ffmpeg here.
 * Twitter turns GIFs into video on upload. For proper MP4s, run the clips through
 * ffmpeg: `ffmpeg -i clip.gif -movflags faststart -pix_fmt yuv420p clip.mp4`.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = process.env.PROMO_BASE ?? 'http://localhost:5173';
const OUT = resolve(process.env.PROMO_OUT ?? 'assets/marketing');
const TAG = process.env.PROMO_TAG ?? 'v0.8';
const only = process.argv[2] ?? '';
const W = 1280;
const H = 720;
const SLOW = 30_000;

mkdirSync(OUT, { recursive: true });
// gifenc's ESM build, plus a line that hangs its exports on window (the minified
// export list maps local names to public ones, so read it instead of guessing).
const gifencSrc = readFileSync(resolve('node_modules/gifenc/dist/gifenc.esm.js'), 'utf8');
const exportsLine = /export\{([^}]+)\}/.exec(gifencSrc)?.[1] ?? '';
const gifencMap = exportsLine
  .split(',')
  .map((e) => e.trim().split(' as '))
  .filter(([local, pub]) => local && pub)
  .map(([local, pub]) => `${pub}: ${local}`)
  .join(', ');
const gifenc = `${gifencSrc}\nwindow.__gifenc = { ${gifencMap} };`;

/** A save with a few weeks of play in it: full menu, learned flags, a streak, some badges. */
const VETERAN = {
  version: 1,
  totalScore: 1063,
  campaignUnlocked: 8,
  caseResults: Object.fromEntries(
    [
      ['moonpup', 'A', 230],
      ['bean', 'S', 180],
      ['safeyield', 'B', 205],
      ['pixelforge', 'A', 140],
      ['grandma', 'C', 96],
      ['harbor', 'A', 120],
      ['oracle', 'B', 92],
    ].map(([id, g, s]) => [
      id,
      { bestScore: s, bestGrade: g, completions: 1, lastVerdictCorrect: true, solved: true },
    ]),
  ),
  unlockedFlags: [
    'mint-unlimited',
    'sell-tax-adjustable',
    'honeypot',
    'liquidity-unlocked',
    'anon-team-stock-photos',
    'bot-chat',
    'fake-renounce',
  ],
  unlockedHerrings: ['small-fixed-tax', 'doxxed-meme-name', 'community-jokes'],
  // Every badge the rest of this save already qualifies for, or a toast lands mid-clip.
  badges: ['first-case', 'clean-sweep', 'rush-hour', 'historian', 'streak-3', 's-grade'],
  daily: { lastPlayed: null, streak: 3, bestStreak: 5, played: [], freezes: 1 },
  // No film grain: it changes every pixel every frame, which makes the GIFs huge.
  settings: { hints: false, quips: true, music: false, weather: 'rain', grain: false },
  discovered: ['drawer', 'rush', 'cold', 'weekly'],
  detectiveName: 'LUCIEN',
  stats: { runs: 9, correct: 8, rushRuns: 3, rushBest: 1450, rushBestStreak: 6, coldRuns: 2 },
};
const FRESH = { version: 1, settings: { music: false, grain: false } };
/** The veteran with a pocket of clips and a few things from the market already on the desk. */
const SHOPPER = { ...VETERAN, clips: { earned: 320, spent: 0 } };
const DRESSED = {
  ...VETERAN,
  clips: { earned: 900, spent: 405 },
  owned: [
    'coat-oxblood',
    'hat-black',
    'cat-soot',
    'orn-globe',
    'mug-red',
    'cur-velvet',
    'radio-cherry',
  ],
  look: {
    coat: 'coat-oxblood',
    hat: 'hat-black',
    cat: 'cat-soot',
    ornament: 'orn-globe',
    mug: 'mug-red',
    curtains: 'cur-velvet',
    radio: 'radio-bakelite',
  },
};

/** Phantom's injected provider, faked, plus an RPC that answers locally. */
const FAKE_WALLET = `
  const key = { toString: () => '7xAbQ3kLmN9pR2sT5uV8wX1yZ4aB6cD8eF0gH2iJ4kL9Qk' };
  window.phantom = { solana: { isPhantom: true, publicKey: null,
    connect: async () => ({ publicKey: key }), disconnect: async () => undefined, on() {} } };
  const realFetch = window.fetch.bind(window);
  window.fetch = async (url, init) => {
    if (init && init.body && String(init.body).includes('jsonrpc')) {
      const { method } = JSON.parse(init.body);
      const result = method === 'getBalance' ? { value: 1_530_000_000 }
        : method === 'getGenesisHash' ? '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d' : { value: [] };
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), { headers: { 'content-type': 'application/json' } });
    }
    return realFetch(url, init);
  };`;

/** A few other desks and runs on the (local) boards, so the Hall has company. */
const BOARDS = `
  const day = (n) => new Date(Date.now() - n * 864e5).toISOString();
  const runs = [
    ['MARLOWE', 260, 'safeyield', 'S', 1], ['SPADE', 245, 'harbor', 'A', 2],
    ['LUCIEN', 230, 'moonpup', 'A', 0], ['NOIR', 210, 'bean', 'B', 3],
    ['VESPER', 190, 'oracle', 'B', 4], ['BISCUIT', 120, 'grandma', 'C', 5],
  ].map(([name, score, caseId, grade, d]) => ({ name, score, caseId, grade, date: day(d), holder: name === 'MARLOWE' || undefined }));
  const rush = [['SPADE', 2310, 2], ['LUCIEN', 1450, 0], ['NOIR', 980, 1]]
    .map(([name, score, d]) => ({ name, score, caseId: 'rush', grade: 'A', date: day(d), mode: 'rush' }));
  localStorage.setItem('rug-or-not:board:v1', JSON.stringify([...runs, ...rush]));
  const desks = [
    ['0000000000000001', 'MARLOWE', 2140, 'Inspector', 610, 14, 19, 5, true],
    ['0000000000000002', 'SPADE', 1720, 'Inspector', 240, 12, 15, 1],
    ['0000000000000003', 'LUCIEN', 1063, 'Gumshoe', 95, 7, 6, 0],
    ['0000000000000004', 'NOIR', 880, 'Gumshoe', 360, 6, 8, 2, true],
    ['0000000000000005', 'VESPER', 640, 'Gumshoe', 40, 5, 4, 3],
    ['0000000000000006', 'BISCUIT', 120, 'Rookie', 12, 1, 1, 6],
  ].map(([id, name, total, rank, clips, solved, badges, d, holder]) =>
    ({ id, name, total, rank, clips, solved, badges, date: day(d), holder: holder || undefined }));
  localStorage.setItem('rug-or-not:desks:v1', JSON.stringify(desks));`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function boot(page, save, hash = '', extraInit = '') {
  await page.addInitScript(
    ({ save, extraInit }) => {
      localStorage.setItem('rug-or-not:save:v1', JSON.stringify(save));
      if (extraInit) new Function(extraInit)();
    },
    { save, extraInit },
  );
  await page.goto(`${BASE}/?p=${Date.now()}${hash}`);
  await page.waitForFunction(() => typeof window.__game !== 'undefined', null, { timeout: SLOW });
  // Past the boot scene, then long enough for the title card to slide in and settle.
  await page.waitForFunction(
    () =>
      window.__game.scene
        .getScenes(true)
        .some((s) => s.scene.key !== 'BootScene' && s.scene.key !== 'CursorScene'),
    null,
    { timeout: SLOW },
  );
  await sleep(2200);
}

const skipTalk = (page) =>
  page.evaluate(() => {
    for (const s of window.__game.scene.getScenes(true))
      for (const o of s.children.list) if (o.constructor.name === 'DialogueBox') o.finish(true);
  });

const startScene = (page, key, data) =>
  page.evaluate(
    ([key, data]) => {
      const cur = window.__game.scene.getScenes(true).find((s) => s.scene.key !== 'CursorScene');
      cur.scene.start(key, data);
    },
    [key, data ?? null],
  );

const waitScene = (page, key) =>
  page.waitForFunction(
    (k) => window.__game.scene.getScenes(true).some((s) => s.scene.key === k),
    key,
    { timeout: SLOW },
  );

/** World (640x360) to page pixels. */
const px = (v) => v * (W / 640);
const move = (page, x, y, steps = 12) => page.mouse.move(px(x), px(y), { steps });
const click = async (page, x, y) => {
  await move(page, x, y);
  await page.mouse.down();
  await sleep(60);
  await page.mouse.up();
};

/** Clue spots of the current document, world coordinates, flags first. */
const clueSpots = (page) =>
  page.evaluate(() => {
    const sc = window.__game.scene.getScene('InvestigationScene');
    const d = sc.docs[sc.current];
    const out = [];
    d.rows.forEach((r) =>
      r.spots.forEach((s) => {
        const b = s.getBounds();
        out.push({ x: b.centerX, y: b.centerY, flag: !!s.clue?.flagId });
      }),
    );
    return out.sort((a, b) => Number(b.flag) - Number(a.flag));
  });

/** A button's centre in world coordinates, by label. */
const buttonAt = (page, sceneKey, label) =>
  page.evaluate(
    ([sceneKey, label]) => {
      const sc = window.__game.scene.getScene(sceneKey);
      let found = null;
      const walk = (list) =>
        list.forEach((o) => {
          if (found) return;
          if (
            o.constructor.name === 'PixelButton' &&
            o.list?.some((c) => c.type === 'Text' && c.text.includes(label))
          )
            found = o;
          else if (o.list) walk(o.list);
        });
      walk(sc.children.list);
      if (!found) return null;
      const m = found.getWorldTransformMatrix();
      return { x: m.tx + found.bw / 2, y: m.ty + found.bh / 2 };
    },
    [sceneKey, label],
  );

async function shot(page, name) {
  const file = `${OUT}/${TAG}-${name}.png`;
  await page.screenshot({ path: file });
  console.log('shot', file);
}

async function record(page, fps = 12) {
  await page.addScriptTag({ type: 'module', content: gifenc });
  await page.waitForFunction(() => typeof window.__gifenc !== 'undefined', null, { timeout: SLOW });
  await page.evaluate((fps) => {
    const { GIFEncoder, quantize, applyPalette } = window.__gifenc;
    const src = document.querySelector('canvas');
    const w = 640;
    const h = 360;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const gif = GIFEncoder();
    const interval = 1000 / fps;
    let last = 0;
    let frames = 0;
    let prev = null;
    const onRender = () => {
      const now = performance.now();
      if (now - last < interval) return;
      const delay = last ? now - last : interval;
      last = now;
      ctx.drawImage(src, 0, 0, w, h);
      const { data } = ctx.getImageData(0, 0, w, h);
      // 255 colours plus one transparent index: pixels that didn't change since the last
      // frame are left transparent so a mostly still desk costs almost nothing.
      const palette = quantize(data, 255);
      const index = applyPalette(data, palette);
      if (prev) {
        for (let i = 0, p = 0; i < index.length; i++, p += 4) {
          if (
            data[p] === prev[p] &&
            data[p + 1] === prev[p + 1] &&
            data[p + 2] === prev[p + 2] &&
            data[p + 3] === prev[p + 3]
          )
            index[i] = 255;
        }
      }
      palette.push([0, 0, 0]);
      gif.writeFrame(index, w, h, {
        palette,
        delay: Math.round(delay),
        transparent: !!prev,
        transparentIndex: 255,
        dispose: 1,
      });
      prev = new Uint8ClampedArray(data);
      frames++;
    };
    window.__game.events.on('postrender', onRender);
    window.__rec = {
      stop() {
        window.__game.events.off('postrender', onRender);
        gif.finish();
        const bytes = gif.bytes();
        let s = '';
        for (let i = 0; i < bytes.length; i += 0x8000)
          s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return { b64: btoa(s), frames };
      },
    };
  }, fps);
}

async function stopRecording(page, name) {
  const { b64, frames } = await page.evaluate(() => window.__rec.stop());
  const file = `${OUT}/${TAG}-clip-${name}.gif`;
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(file, buf);
  console.log('clip', file, frames, 'frames', Math.round(buf.length / 1024), 'KB');
}

/** Open a case to the investigating phase, Lucien quiet. */
async function openCase(page, id) {
  await page.evaluate((id) => window.__debug.startCase(id), id);
  await sleep(1500);
  await skipTalk(page);
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    () => window.__game.scene.getScene('InvestigationScene').phase === 'investigating',
    null,
    { timeout: SLOW },
  );
  await sleep(600);
  await skipTalk(page);
}

/**
 * From an open file to the second look: pin the first flag on the first page only, stamp
 * RUG, then take the report's offer. Lands on the first page with something marked.
 */
async function secondLook(page) {
  const spots = await clueSpots(page);
  const first = spots.find((s) => s.flag);
  if (first) await click(page, first.x, first.y);
  await sleep(400);
  await page.keyboard.press('r');
  await waitScene(page, 'ReportScene');
  await sleep(1500);
  await skipTalk(page);
  await page.evaluate(() => {
    const rs = window.__game.scene.getScene('ReportScene');
    rs.typewriter.skip();
  });
  await sleep(400);
  await skipTalk(page);
  // Scroll the offer into view and click it where it sits.
  const at = await page.evaluate(() => {
    const rs = window.__game.scene.getScene('ReportScene');
    const line = rs.content.list.find((o) => /SECOND LOOK/.test(o.text ?? ''));
    if (!line) return null;
    rs.scrollBy(line.y - 120);
    const m = line.getWorldTransformMatrix();
    return { x: m.tx + 40, y: m.ty + 6 };
  });
  if (!at) throw new Error('no second look on the report');
  await sleep(300);
  await move(page, at.x, at.y, 15);
  await click(page, at.x, at.y);
  await waitScene(page, 'InvestigationScene');
  await sleep(1200);
}

/** The phone on the desk, then a NetScope bookmark. */
async function openPhone(page, bookmark) {
  await click(page, 129, 314);
  await sleep(700);
  await skipTalk(page);
  if (bookmark) {
    const b = await buttonAt(page, 'TitleScene', bookmark);
    await click(page, b.x, b.y);
    await sleep(500);
    await skipTalk(page);
  }
}

const SHOTS = {
  async 'market-page'(page) {
    await boot(page, SHOPPER);
    await skipTalk(page);
    await openPhone(page, 'Market');
    const buy = await buttonAt(page, 'TitleScene', 'Buy 100');
    await move(page, buy.x, buy.y, 16);
    await sleep(600);
    await shot(page, 'market-page');
  },
  async 'dressed-desk'(page) {
    await boot(page, DRESSED);
    await skipTalk(page);
    await move(page, 330, 140);
    await sleep(1500);
    await shot(page, 'dressed-desk');
  },
  async 'title-fresh'(page) {
    await boot(page, { ...FRESH, settings: { ...FRESH.settings, hints: true } });
    await sleep(2600);
    await shot(page, 'title-first-night');
  },
  async 'title-desk'(page) {
    await boot(page, VETERAN);
    await skipTalk(page);
    await move(page, 320, 120);
    await sleep(1500);
    await shot(page, 'title-the-desk');
  },
  async folder(page) {
    await boot(page, VETERAN);
    await page.evaluate(() => window.__debug.startCase('moonpup'));
    await sleep(1800);
    await shot(page, 'case-folder-intake');
  },
  async lens(page) {
    await boot(page, VETERAN);
    await openCase(page, 'moonpup');
    const spots = await clueSpots(page);
    await move(page, spots[0].x, spots[0].y);
    await sleep(700);
    await shot(page, 'lens-fine-print');
    await click(page, spots[0].x, spots[0].y);
    await sleep(400);
    await click(page, spots[1].x, spots[1].y);
    await sleep(400);
    await move(page, spots[2]?.x ?? 300, spots[2]?.y ?? 300);
    await sleep(700);
    await shot(page, 'pins-and-suspicions');
    await page.keyboard.press('r');
    await waitScene(page, 'ReportScene');
    await sleep(1200);
    await skipTalk(page);
    await page.keyboard.press('Space');
    await sleep(800);
    await page.keyboard.press('Space');
    await sleep(1500);
    await move(page, 320, 200);
    await shot(page, 'case-report');
    const share = await buttonAt(page, 'ReportScene', 'Share');
    if (share) {
      await click(page, share.x, share.y);
      await sleep(1200);
      await shot(page, 'share-card');
    }
  },
  async 'second-look'(page) {
    await boot(page, VETERAN);
    await openCase(page, 'safeyield');
    await secondLook(page);
    // The tokenomics page: its missed row sits high on the paper, clear of the bubble.
    await page.keyboard.press('3');
    await sleep(900);
    const marks = await page.evaluate(() => {
      const sc = window.__game.scene.getScene('InvestigationScene');
      return sc.docs[sc.current]
        .allSpots()
        .filter((s) => s.missed)
        .map((s) => {
          const b = s.getBounds();
          return { x: b.centerX, y: b.centerY };
        });
    });
    if (marks[0]) {
      await move(page, marks[0].x, marks[0].y, 20);
      await sleep(400);
      await click(page, marks[0].x, marks[0].y);
      // Off the paper, so the lens doesn't sit on the mark or the bubble.
      await move(page, 600, 250, 15);
      await sleep(900);
    }
    await shot(page, 'second-look');
  },
  async notebook(page) {
    await boot(page, VETERAN);
    await startScene(page, 'NotebookScene');
    await sleep(1200);
    await skipTalk(page);
    await move(page, 150, 90);
    await sleep(400);
    await shot(page, 'notebook-red-flags');
    await startScene(page, 'NotebookScene', { chapter: 'handbook', id: 'lens' });
    await sleep(1200);
    await skipTalk(page);
    await shot(page, 'handbook-how-to-play');
    await startScene(page, 'NotebookScene', { chapter: 'rogues', id: 'moonpup' });
    await sleep(1200);
    await skipTalk(page);
    await shot(page, 'rogues-gallery');
  },
  async drawer(page) {
    await boot(page, VETERAN);
    await startScene(page, 'CaseSelectScene');
    await sleep(1200);
    await skipTalk(page);
    await move(page, 230, 170);
    await sleep(700);
    await shot(page, 'case-files-drawer');
  },
  async rush(page) {
    await boot(page, VETERAN, '#rush');
    await sleep(800);
    await skipTalk(page);
    await page.waitForFunction(
      () => window.__game.scene.getScene('RushScene').phase === 'playing',
      null,
      { timeout: SLOW },
    );
    // Clear a couple of pages so the HUD has numbers on it.
    for (let i = 0; i < 3; i++) {
      const spots = await page.evaluate(() => {
        const r = window.__game.scene.getScene('RushScene');
        const out = [];
        r.doc?.rows.forEach((row) =>
          row.spots.forEach((s) => {
            const b = s.getBounds();
            out.push({ x: b.centerX, y: b.centerY, flag: !!s.clue?.flagId });
          }),
        );
        return out;
      });
      const flag = spots.find((s) => s.flag);
      if (!flag) break;
      await click(page, flag.x, flag.y);
      await sleep(900);
    }
    await sleep(400);
    await shot(page, 'red-flag-rush');
    await page.evaluate(() => window.__game.scene.getScene('RushScene').end());
    await sleep(2200);
    await shot(page, 'rush-results');
  },
  async hunt(page) {
    await boot(page, VETERAN);
    await skipTalk(page);
    await startScene(page, 'NotebookScene', { chapter: 'herrings', id: 'community-jokes' });
    await sleep(1200);
    await skipTalk(page);
    await shot(page, 'notebook-herring-hunt-button');
    await startScene(page, 'RushScene', { hunt: 'community-jokes' });
    await page.waitForFunction(
      () => window.__game.scene.getScene('RushScene').phase === 'playing',
      null,
      { timeout: SLOW },
    );
    await sleep(1500);
    const spots = await page.evaluate(() => {
      const r = window.__game.scene.getScene('RushScene');
      const out = [];
      r.doc?.rows.forEach((row) =>
        row.spots.forEach((s) => {
          const b = s.getBounds();
          out.push({ x: b.centerX, y: b.centerY, flag: !!s.clue?.flagId });
        }),
      );
      return out;
    });
    const her = spots.find((s) => !s.flag);
    if (her) await move(page, her.x, her.y);
    await sleep(500);
    await shot(page, 'herring-hunt');
  },
  async phone(page) {
    await boot(page, { ...VETERAN, id: '0000000000000003' }, '', FAKE_WALLET + BOARDS);
    await skipTalk(page);
    await click(page, 124, 306);
    await sleep(1200);
    await skipTalk(page);
    await shot(page, 'netscope-phone');
    await page.evaluate(() => window.__debug.wallet.connect());
    await sleep(1200);
    await page.evaluate(() => {
      const t = window.__game.scene.getScene('TitleScene');
      t.children.list.find((o) => o.constructor.name === 'BrowserPanel').go('coin');
    });
    await sleep(800);
    await skipTalk(page);
    await shot(page, 'coin-page-phantom-connected');
    await page.evaluate(() => {
      const t = window.__game.scene.getScene('TitleScene');
      t.children.list.find((o) => o.constructor.name === 'BrowserPanel').go('badges');
    });
    await sleep(800);
    await shot(page, 'badges');
    await page.evaluate(() => {
      const t = window.__game.scene.getScene('TitleScene');
      t.children.list.find((o) => o.constructor.name === 'BrowserPanel').go('board');
    });
    await sleep(800);
    await shot(page, 'hall-of-detectives');
  },
  async wall(page) {
    await boot(page, VETERAN);
    await skipTalk(page);
    await page.evaluate(() => {
      const t = window.__game.scene.getScene('TitleScene');
      t.scene.launch('HistoryScene', { returnTo: 'TitleScene' });
      t.scene.pause();
    });
    await sleep(6000);
    await skipTalk(page);
    await shot(page, 'the-wall-making-of');
  },
  async cold(page) {
    await boot(page, VETERAN, '#cold=d3-night-tram');
    await sleep(1500);
    await skipTalk(page);
    await shot(page, 'cold-case-printed-file');
  },
  async weather(page) {
    for (const weather of ['snow', 'clear', 'fog']) {
      await boot(page, { ...VETERAN, settings: { ...VETERAN.settings, weather } });
      await skipTalk(page);
      await sleep(1500);
      await shot(page, `weather-${weather}`);
    }
  },
  async themes(page) {
    for (const theme of ['sepia', 'midnight', 'newsprint', 'speakeasy']) {
      await boot(page, { ...VETERAN, settings: { ...VETERAN.settings, theme } });
      await skipTalk(page);
      await sleep(1200);
      await shot(page, `theme-${theme}`);
    }
    await boot(page, { ...VETERAN, settings: { ...VETERAN.settings, theme: 'midnight' } });
    await openCase(page, 'moonpup');
    const spots = await clueSpots(page);
    await move(page, spots[0].x, spots[0].y);
    await sleep(700);
    await shot(page, 'theme-midnight-reading');
  },
  async settings(page) {
    await boot(page, VETERAN);
    await startScene(page, 'SettingsScene');
    await sleep(1000);
    await skipTalk(page);
    await shot(page, 'settings');
  },
};

const CLIPS = {
  async 'market-shopping'(page) {
    await boot(page, SHOPPER);
    await skipTalk(page);
    await record(page);
    await sleep(500);
    await openPhone(page, 'Market');
    await sleep(400);
    // A coat and a hat: Lucien in the corner and in the strip change as each one lands.
    const shop = async (tab, label) => {
      const t = await buttonAt(page, 'TitleScene', tab);
      await move(page, t.x, t.y, 14);
      await click(page, t.x, t.y);
      await sleep(500);
      const b = await buttonAt(page, 'TitleScene', label);
      await move(page, b.x, b.y, 16);
      await sleep(300);
      await click(page, b.x, b.y);
      await sleep(1100);
    };
    await shop('Coat', 'Buy 100');
    await shop('Hat', 'Buy 60');
    await shop('Ornament', 'Buy 50');
    await sleep(400);
    await page.keyboard.press('Escape');
    await sleep(500);
    await move(page, 330, 140, 20);
    await sleep(1800);
    await stopRecording(page, 'market-shopping');
  },
  async 'solve-a-case'(page) {
    // "Continue" lands on case 3 ($SAFEYLD, a rug): two flags to pin and a RUG stamp.
    await boot(page, { ...VETERAN, campaignUnlocked: 3 });
    await skipTalk(page);
    await record(page);
    await sleep(800);
    const cont = await buttonAt(page, 'TitleScene', 'Continue');
    await click(page, cont.x, cont.y);
    await sleep(1800);
    await skipTalk(page);
    const open = await buttonAt(page, 'InvestigationScene', 'Open case');
    if (open) {
      await move(page, open.x, open.y, 20);
      await click(page, open.x, open.y);
    } else await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => window.__game.scene.getScene('InvestigationScene').phase === 'investigating',
      null,
      { timeout: SLOW },
    );
    await sleep(500);
    await skipTalk(page);
    // Read the page with the lens, pin two flags, stamp.
    await move(page, 220, 120, 20);
    await move(page, 380, 200, 25);
    const spots = await clueSpots(page);
    for (const s of spots.filter((x) => x.flag).slice(0, 2)) {
      await move(page, s.x, s.y, 25);
      await sleep(700);
      await click(page, s.x, s.y);
      await sleep(500);
    }
    await sleep(600);
    await move(page, 545, 292, 30);
    await sleep(300);
    await click(page, 545, 292);
    await waitScene(page, 'ReportScene');
    await sleep(3500);
    await skipTalk(page);
    await sleep(1500);
    await stopRecording(page, 'solve-a-case');
  },
  async rush(page) {
    await boot(page, VETERAN, '#rush');
    await sleep(800);
    await skipTalk(page);
    await page.waitForFunction(
      () => window.__game.scene.getScene('RushScene').phase === 'playing',
      null,
      { timeout: SLOW },
    );
    await record(page);
    for (let i = 0; i < 6; i++) {
      const spots = await page.evaluate(() => {
        const r = window.__game.scene.getScene('RushScene');
        const out = [];
        r.doc?.rows.forEach((row) =>
          row.spots.forEach((s) => {
            const b = s.getBounds();
            out.push({ x: b.centerX, y: b.centerY, flag: !!s.clue?.flagId });
          }),
        );
        return out;
      });
      const flag = spots.find((s) => s.flag);
      if (!flag) break;
      await move(page, flag.x, flag.y, 18);
      await sleep(250);
      await click(page, flag.x, flag.y);
      await sleep(900);
    }
    await sleep(600);
    await stopRecording(page, 'red-flag-rush');
  },
  async 'herring-hunt'(page) {
    await boot(page, VETERAN);
    await skipTalk(page);
    await startScene(page, 'RushScene', { hunt: 'community-jokes' });
    await page.waitForFunction(
      () => window.__game.scene.getScene('RushScene').phase === 'playing',
      null,
      { timeout: SLOW },
    );
    await record(page);
    for (let i = 0; i < 5; i++) {
      const spots = await page.evaluate(() => {
        const r = window.__game.scene.getScene('RushScene');
        const out = [];
        r.doc?.rows.forEach((row) =>
          row.spots.forEach((s) => {
            const b = s.getBounds();
            out.push({ x: b.centerX, y: b.centerY, flag: !!s.clue?.flagId });
          }),
        );
        return out;
      });
      const her = spots.find((s) => !s.flag);
      if (!her) break;
      await move(page, her.x, her.y, 18);
      await sleep(400);
      await click(page, her.x, her.y);
      await sleep(900);
    }
    await sleep(2500);
    await stopRecording(page, 'herring-hunt');
  },
  async 'title-intro'(page) {
    // The first night: lamp on, the case file slides in, Lucien introduces himself.
    await page.addInitScript(
      (save) => {
        localStorage.setItem('rug-or-not:save:v1', JSON.stringify(save));
      },
      { ...FRESH, settings: { ...FRESH.settings, hints: true } },
    );
    await page.goto(`${BASE}/?p=${Date.now()}`);
    await page.waitForFunction(() => typeof window.__game !== 'undefined', null, { timeout: SLOW });
    await record(page);
    await sleep(9000);
    await stopRecording(page, 'title-intro');
  },
  async 'office-colours'(page) {
    await boot(page, VETERAN);
    await skipTalk(page);
    await startScene(page, 'SettingsScene', { tab: 'office' });
    await sleep(1500);
    await skipTalk(page);
    await record(page);
    await sleep(600);
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => {
        const st = window.__game.scene.getScene('SettingsScene');
        st.select(0);
      });
      await page.keyboard.press('ArrowRight');
      await sleep(1500);
    }
    await page.keyboard.press('Escape');
    await sleep(2200);
    await stopRecording(page, 'office-colours');
  },
  async 'trading-switch'(page) {
    // A printed file whose contract carries the newest red flag, read through the lens.
    await boot(page, VETERAN, '#cold=d2-switch18');
    await sleep(1500);
    await skipTalk(page);
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => window.__game.scene.getScene('InvestigationScene').phase === 'investigating',
      null,
      { timeout: SLOW },
    );
    await sleep(600);
    await skipTalk(page);
    const spots = await clueSpots(page);
    const s = spots.find((x) => x.flag) ?? spots[0];
    // The lens on the right end of the line: the fine print shows, the function name too.
    await move(page, s.x + 105, s.y + 8, 20);
    await sleep(800);
    await shot(page, 'red-flag-trading-switch');
  },
  async weather(page) {
    await boot(page, VETERAN);
    await skipTalk(page);
    await record(page, 10);
    await move(page, 320, 26, 20);
    for (let i = 0; i < 4; i++) {
      await sleep(1400);
      await click(page, 320, 26);
    }
    await sleep(1400);
    await stopRecording(page, 'weather');
  },
  async 'desk-toys'(page) {
    await boot(page, VETERAN);
    await skipTalk(page);
    await record(page);
    await move(page, 44, 190, 20); // coffee
    await sleep(1400);
    await click(page, 40, 20); // lamp
    await sleep(1300);
    await click(page, 40, 20);
    await sleep(700);
    await move(page, 492, 60, 25); // cat
    await click(page, 492, 60);
    await sleep(1500);
    await click(page, 44, 122); // radio
    await sleep(1400);
    await move(page, 320, 200, 20);
    await page.keyboard.type('rug', { delay: 120 });
    await sleep(1800);
    await stopRecording(page, 'desk-toys');
  },
  async 'second-look'(page) {
    await boot(page, VETERAN);
    await openCase(page, 'safeyield');
    await record(page);
    await move(page, 260, 150, 20);
    await sleep(400);
    await secondLook(page);
    await sleep(1200);
    const marks = await page.evaluate(() => {
      const sc = window.__game.scene.getScene('InvestigationScene');
      return sc.docs[sc.current]
        .allSpots()
        .filter((s) => s.missed)
        .map((s) => {
          const b = s.getBounds();
          return { x: b.centerX, y: b.centerY };
        });
    });
    if (marks[0]) {
      await move(page, marks[0].x, marks[0].y, 30);
      await sleep(500);
      await click(page, marks[0].x, marks[0].y);
      await move(page, 600, 250, 20);
      await sleep(3000);
    }
    // Over to a tab with a mark on it, then back to the report.
    const tab = await page.evaluate(() => {
      const sc = window.__game.scene.getScene('InvestigationScene');
      const i = sc.tabs.tabs.findIndex((t, idx) => idx !== sc.current && t.dot.visible);
      if (i < 0) return null;
      const t = sc.tabs.tabs[i];
      return { x: sc.tabs.x + t.x + 40, y: sc.tabs.y + 8 };
    });
    if (tab) {
      await move(page, tab.x, tab.y, 25);
      await click(page, tab.x, tab.y);
      await sleep(1800);
    }
    await page.keyboard.press('Escape');
    await waitScene(page, 'ReportScene');
    await sleep(1500);
    await stopRecording(page, 'second-look');
  },
  async handbook(page) {
    await boot(page, VETERAN);
    await skipTalk(page);
    await record(page);
    const how = await buttonAt(page, 'TitleScene', 'How to play');
    await move(page, how.x, how.y, 20);
    await click(page, how.x, how.y);
    await sleep(1500);
    await skipTalk(page);
    for (const row of [1, 2, 4, 12]) {
      await move(page, 140, 62 + row * 15, 15);
      await sleep(1100);
    }
    await sleep(600);
    await stopRecording(page, 'handbook');
  },
};

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
});
const wanted = (name) =>
  !only ||
  only === name ||
  (only === 'clips' && name in CLIPS) ||
  (only === 'shots' && name in SHOTS);
for (const [name, run] of Object.entries(SHOTS)) {
  if (!wanted(name) || only === 'clips') continue;
  const page = await context.newPage();
  try {
    await run(page);
  } catch (e) {
    console.error('shot failed:', name, e.message);
  }
  await page.close();
}
for (const [name, run] of Object.entries(CLIPS)) {
  if (!wanted(name) || only === 'shots') continue;
  const page = await context.newPage();
  try {
    await run(page);
  } catch (e) {
    console.error('clip failed:', name, e.message);
  }
  await page.close();
}
await browser.close();
