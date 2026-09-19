/**
 * Monkey test: a headless Chromium clicks, types and scrolls at random all over the game
 * for a while and reports every page error with the scene it happened in. Run it with
 * the dev server up:
 *
 *   node scripts/fuzz.mjs [seconds=90] [seed]
 *
 * It starts from a played-in save so every screen is reachable, and it favours keys the
 * game actually listens to (Esc, Enter, Space, R, L, digits, arrows) over noise.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';

const BASE = process.env.PROMO_BASE ?? 'http://localhost:5173';
const seconds = Number(process.argv[2] ?? 90);
let seed = Number(process.argv[3] ?? Date.now() % 100000);
const rand = () => {
  // mulberry32
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const SAVE = {
  version: 1,
  totalScore: 900,
  campaignUnlocked: 6,
  caseResults: Object.fromEntries(
    ['moonpup', 'bean', 'safeyield', 'pixelforge', 'grandma'].map((id) => [
      id,
      { bestScore: 120, bestGrade: 'B', completions: 1, lastVerdictCorrect: true, solved: true },
    ]),
  ),
  unlockedFlags: ['mint-unlimited', 'sell-tax-adjustable', 'honeypot'],
  unlockedHerrings: ['community-jokes', 'small-fixed-tax', 'doxxed-meme-name'],
  settings: { hints: true, quips: true, music: false, volume: 0, reducedMotion: false },
  discovered: ['drawer', 'rush', 'cold', 'weekly'],
  stats: { runs: 6, coldRuns: 1 },
};

const KEYS = [
  'Escape',
  'Enter',
  'Space',
  'r',
  'l',
  '1',
  '2',
  '3',
  '4',
  'Tab',
  'ArrowDown',
  'ArrowRight',
  'ArrowUp',
  'ArrowLeft',
  'p',
  'w',
  'm',
  'h',
  'PageDown',
  'PageUp',
];

console.log(`fuzz: ${seconds}s, seed ${seed}`);
const browser = await chromium.launch({ args: ['--enable-precise-memory-info'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
let actions = 0;
const scene = () =>
  page
    .evaluate(() =>
      window.__game.scene
        .getScenes(true)
        .map((s) => s.scene.key)
        .filter((k) => k !== 'CursorScene')
        .join('+'),
    )
    .catch(() => '?');
page.on('pageerror', async (e) => {
  const at = await scene();
  console.log(`  pageerror after ${actions} actions in ${at}: ${String(e).split('\n')[0]}`);
  if (errors.length === 0 && e.stack) console.log(e.stack.split('\n').slice(1, 9).join('\n'));
  errors.push({ at, error: String(e).split('\n')[0] });
});
page.on('console', async (m) => {
  if (process.env.FUZZ_CONSOLE) console.log('  console', m.type(), m.text().slice(0, 160));
  if (m.type() === 'error' && !/WebSocket|favicon/.test(m.text()))
    errors.push({ at: await scene(), error: m.text().slice(0, 200) });
});
// Checkpoints the page can send synchronously, so they survive a renderer crash.
const cpServer = createServer((req, res) => {
  const n = new URL(req.url, 'http://x').searchParams.get('n');
  if (n) lastCheckpoint = n;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end('ok');
});
let lastCheckpoint = '';
await new Promise((r) => cpServer.listen(5177, r));
await page.addInitScript((save) => {
  localStorage.setItem('rug-or-not:save:v1', JSON.stringify(save));
  localStorage.setItem('rug-or-not:dev-mute', '1');
  window.__cp = (n) => {
    try {
      const x = new XMLHttpRequest();
      x.open('GET', `http://localhost:5177/cp?n=${encodeURIComponent(n)}`, false);
      x.send();
    } catch {
      /* no listener */
    }
  };
}, SAVE);
await page.goto(`${BASE}/?fuzz=${Date.now()}`);
await page.waitForFunction(() => typeof window.__game !== 'undefined', null, { timeout: 30000 });
await page.waitForTimeout(3000);

const visited = new Map();
let lastHeap = 0;
const end = Date.now() + seconds * 1000;
let lastAction = '';
page.on('crash', () =>
  console.log(
    `page crashed after ${actions} actions (${lastAction}); last checkpoint: ${lastCheckpoint}`,
  ),
);
// FUZZ_ONLY="0-120,206" replays just those action numbers (the random stream still
// advances for the skipped ones), to bisect which earlier actions set up a crash.
const only = process.env.FUZZ_ONLY
  ? process.env.FUZZ_ONLY.split(',').map((r) => r.split('-').map(Number))
  : null;
const wanted = (n) => !only || only.some(([a, b]) => n >= a && n <= (b ?? a));
while (Date.now() < end) {
  const roll = rand();
  lastAction =
    roll < 0.55
      ? 'click'
      : roll < 0.63
        ? 'target'
        : roll < 0.85
          ? 'key'
          : roll < 0.93
            ? 'wheel'
            : 'drag';
  const trace = process.env.FUZZ_TRACE && actions >= Number(process.env.FUZZ_TRACE);
  if (!wanted(actions)) {
    // Burn the same random numbers the action would have used.
    if (roll < 0.55) {
      rand();
      rand();
      rand();
    } else if (roll < 0.63) rand();
    else if (roll < 0.85) rand();
    else if (roll < 0.93) {
      rand();
      rand();
      rand();
    } else {
      rand();
      rand();
      rand();
      rand();
    }
    rand(); // the pause between actions
    actions++;
    continue;
  }
  if (process.env.FUZZ_DUMP && actions === Number(process.env.FUZZ_DUMP))
    console.log(
      'save before action',
      actions,
      await page.evaluate(() => localStorage.getItem('rug-or-not:save:v1')),
    );
  if (roll < 0.55) {
    const x = rand() * 1280;
    const y = rand() * 720;
    const hold = rand() < 0.2 ? 250 : 40;
    if (trace)
      console.log(actions, 'click', Math.round(x / 2), Math.round(y / 2), hold, await scene());
    await page.mouse.move(x, y, { steps: 3 });
    if (process.env.FUZZ_WATCH && actions === Number(process.env.FUZZ_WATCH))
      await page.evaluate(() => {
        // Narrate the game loop through the checkpoint channel until the crash.
        const g = window.__game;
        for (const ev of ['prestep', 'step', 'poststep', 'prerender', 'postrender'])
          g.events.on(ev, () => window.__cp(`game:${ev}`));
        const hook = (sc) => {
          for (const ev of [
            'preupdate',
            'update',
            'postupdate',
            'render',
            'create',
            'start',
            'ready',
            'shutdown',
          ])
            sc.events.on(ev, () => window.__cp(`${sc.scene.key}:${ev}`));
        };
        g.scene.scenes.forEach(hook);
      });
    if (process.env.FUZZ_WATCH && actions === Number(process.env.FUZZ_WATCH)) {
      // Freeze whatever the page is doing a moment after the press and print its stack:
      // a tight loop shows up here even when nothing else can get through.
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Debugger.enable');
      const paused = new Promise((r) => cdp.once('Debugger.paused', r));
      await page.mouse.down();
      await page.waitForTimeout(400);
      await cdp.send('Debugger.pause').catch(() => {});
      const ev = await Promise.race([paused, new Promise((r) => setTimeout(() => r(null), 5000))]);
      if (ev)
        for (const f of ev.callFrames.slice(0, 14))
          console.log(
            `  at ${f.functionName || '(anon)'}  ${f.url.split('/').slice(-2).join('/')}:${f.location.lineNumber + 1}`,
          );
      else console.log('  (no pause event)');
      await cdp.send('Debugger.resume').catch(() => {});
    } else {
      await page.mouse.down();
      await page.waitForTimeout(hold);
    }
    await page.mouse.up();
  } else if (roll < 0.63) {
    // A click on something that is actually interactive (a button, a report line, a clue
    // spot): random coordinates rarely land on the small targets.
    const r = rand();
    const at = await page
      .evaluate((r) => {
        const objs = window.__game.scene
          .getScenes(true)
          .flatMap((sc) => sc.input.list ?? [])
          .filter((o) => o.active && o.input?.enabled && o.willRender?.(o.scene.cameras.main));
        if (objs.length === 0) return null;
        const o = objs[Math.floor(r * objs.length)];
        const b = o.getBounds ? o.getBounds() : null;
        if (!b || b.width <= 0 || b.height <= 0) return null;
        return { x: b.centerX, y: b.centerY, what: o.constructor.name };
      }, r)
      .catch(() => null);
    if (at && at.x >= 0 && at.x < 640 && at.y >= 0 && at.y < 360) {
      if (trace)
        console.log(actions, 'target', at.what, Math.round(at.x), Math.round(at.y), await scene());
      await page.mouse.move(at.x * 2, at.y * 2, { steps: 3 });
      await page.mouse.down();
      await page.waitForTimeout(40);
      await page.mouse.up();
    }
  } else if (roll < 0.85) {
    const key = pick(KEYS);
    if (trace) console.log(actions, 'key', key, await scene());
    await page.keyboard.press(key);
  } else if (roll < 0.93) {
    const x = rand() * 1280;
    const y = rand() * 720;
    const dy = pick([-200, -100, 100, 200, 400]);
    if (trace) console.log(actions, 'wheel', Math.round(x / 2), Math.round(y / 2), dy);
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, dy);
  } else {
    // A quick drag across the paper.
    const x = rand() * 1280;
    const y = rand() * 720;
    const dx = (rand() - 0.5) * 300;
    const dy = (rand() - 0.5) * 200;
    if (trace)
      console.log(
        actions,
        'drag',
        Math.round(x / 2),
        Math.round(y / 2),
        Math.round(dx / 2),
        Math.round(dy / 2),
      );
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 6 });
    await page.mouse.up();
  }
  actions++;
  if (actions % 5 === 0) {
    const s = await scene();
    visited.set(s, (visited.get(s) ?? 0) + 1);
    // A leak shows up as a heap that only ever grows; say where we were when it did.
    const heap = await page
      .evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1048576))
      .catch(() => -1);
    if (heap > lastHeap + 25) console.log(`heap ${heap} MB after ${actions} actions in ${s}`);
    lastHeap = Math.max(lastHeap, heap);
    // Don't get stuck: if nothing but the cursor overlay is running, go home.
    if (s === '' || s === '?') {
      await page.evaluate(() => window.__game.scene.start('TitleScene')).catch(() => {});
    }
  }
  await page.waitForTimeout(30 + rand() * 120);
}
// Back on a quiet title, nothing should still count as an open overlay: a leak here means
// some overlay was destroyed without giving its Esc claim back, and Esc misbehaves after.
const leak = await page
  .evaluate(async () => {
    window.__game.scene
      .getScenes(true)
      .forEach((s) => s.scene.key !== 'CursorScene' && s.scene.stop());
    window.__game.scene.start('TitleScene');
    await new Promise((r) => setTimeout(r, 1500));
    for (const s of window.__game.scene.getScenes(true))
      for (const o of s.children.list) if (o.constructor.name === 'DialogueBox') o.finish(true);
    await new Promise((r) => setTimeout(r, 300));
    return window.__debug.overlays();
  })
  .catch(() => -1);
if (leak > 0) {
  console.log(`overlay leak: ${leak} still counted on a quiet title`);
  errors.push({ at: 'end', error: `overlay leak: ${leak}` });
}
await browser.close();
cpServer.close();

console.log(`${actions} actions; scenes seen:`, Object.fromEntries(visited));
if (errors.length === 0) console.log('no errors');
else {
  const grouped = new Map();
  for (const e of errors)
    grouped.set(`${e.at} :: ${e.error}`, (grouped.get(`${e.at} :: ${e.error}`) ?? 0) + 1);
  for (const [k, n] of grouped) console.log(`${n}x  ${k}`);
  process.exitCode = 1;
}
