/**
 * Content sweep: a headless Chromium plays every campaign file and a batch of printed
 * ones perfectly (every red flag pinned, the right stamp) and reports any page error and
 * any run that doesn't grade S. Catches a document that fails to render, a flag the
 * scorer can't find, a generator seed that breaks the desk. Run with the dev server up:
 *
 *   node scripts/sweep.mjs [cold cases=24]
 *   SWEEP_INLINE=1 node scripts/sweep.mjs   # lens off: fine print laid out inline
 */
import { chromium } from '@playwright/test';

const BASE = process.env.PROMO_BASE ?? 'http://localhost:5173';
const COLD = Number(process.argv[2] ?? 24);
const CAMPAIGN = [
  'moonpup',
  'bean',
  'safeyield',
  'pixelforge',
  'grandma',
  'harbor',
  'oracle',
  'kelp',
  'vaultline',
  'tideworks',
  'goldengoose',
  'archive',
  'napkin',
  'lantern',
  'tram',
  'seam',
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).split('\n')[0]));
page.on('console', (m) => {
  if (m.type() === 'error' && !/WebSocket|favicon/.test(m.text()))
    errors.push(m.text().slice(0, 160));
});
// Everything unlocked, Lucien talking (his lines are part of what's being exercised).
await page.addInitScript(
  ([ids, inline]) => {
    localStorage.setItem(
      'rug-or-not:save:v1',
      JSON.stringify({
        version: 1,
        campaignUnlocked: 16,
        settings: {
          hints: true,
          quips: true,
          music: false,
          reducedMotion: false,
          noMagnifier: inline,
        },
        discovered: ['drawer', 'rush', 'cold', 'weekly'],
        caseResults: Object.fromEntries(
          ids.map((id) => [
            id,
            {
              bestScore: 100,
              bestGrade: 'B',
              completions: 1,
              lastVerdictCorrect: true,
              solved: true,
            },
          ]),
        ),
      }),
    );
  },
  [CAMPAIGN.slice(0, 15), !!process.env.SWEEP_INLINE],
);

const skip = () =>
  page.evaluate(() => {
    for (const s of window.__game.scene.getScenes(true))
      for (const o of s.children.list) if (o.constructor.name === 'DialogueBox') o.finish(true);
  });
const waitPhase = (phase) =>
  page.waitForFunction(
    (p) => window.__game.scene.getScene('InvestigationScene').phase === p,
    phase,
    { timeout: 20000 },
  );

/** From the intake folder to the report: pin every flag on every tab, stamp the truth. */
async function playPerfectly() {
  await skip();
  await page.keyboard.press('Enter');
  await waitPhase('investigating');
  await page.waitForTimeout(400);
  await skip();
  const info = await page.evaluate(() => {
    const inv = window.__game.scene.getScene('InvestigationScene');
    let pinned = 0;
    inv.caseData.documents.forEach((_, i) => {
      inv.showDocument(i, false);
      const doc = inv.docs[i];
      for (let k = 0; k < 3; k++) doc.scroll(1);
      for (const s of doc.allSpots())
        if (s.clue.flagId) {
          doc.focusClue(s.clue.id);
          doc.activateFocused();
          pinned++;
        }
    });
    inv.showDocument(0, false);
    return { id: inv.caseData.id, docs: inv.caseData.documents.length, pinned };
  });
  await page.evaluate(() => {
    const inv = window.__game.scene.getScene('InvestigationScene');
    inv.stamps[inv.caseData.verdict === 'rug' ? 0 : 1].trigger((v) => inv.onStamp(v));
  });
  await page.waitForFunction(
    () => window.__game.scene.getScenes(true).some((s) => s.scene.key === 'ReportScene'),
    null,
    { timeout: 20000 },
  );
  await page.waitForTimeout(900);
  await skip();
  const report = await page.evaluate(() => {
    const b = window.__game.scene.getScene('ReportScene').payload?.breakdown;
    return { score: b?.total, grade: b?.grade, correct: b?.verdictCorrect };
  });
  return { ...info, ...report };
}

let clean = 0;
let total = 0;
const note = (label, r, before) => {
  total++;
  const bad = errors.length > before || r.grade !== 'S' || !r.correct;
  if (bad)
    console.log(
      label.padEnd(18),
      JSON.stringify(r),
      errors.length > before ? `ERRORS: ${errors.slice(before).join(' | ')}` : '',
    );
  else clean++;
};

await page.goto(`${BASE}/?sweep=${Date.now()}`);
await page.waitForFunction(() => typeof window.__game !== 'undefined');
await page.waitForTimeout(2500);
for (const id of CAMPAIGN) {
  const before = errors.length;
  await skip();
  await page.evaluate((id) => window.__debug.startCase(id), id);
  await page.waitForTimeout(1200);
  note(id, await playPerfectly(), before);
  await page.evaluate(() => window.__game.scene.getScene('ReportScene').scene.start('TitleScene'));
  await page.waitForTimeout(1000);
}
for (let i = 0; i < COLD; i++) {
  const seed = `d${1 + (i % 5)}-sweep-${i}`;
  const before = errors.length;
  await page.goto(`${BASE}/?s=${Date.now()}#cold=${seed}`);
  await page.waitForFunction(() => typeof window.__game !== 'undefined');
  await page.waitForFunction(
    () => window.__game.scene.getScenes(true).some((s) => s.scene.key === 'InvestigationScene'),
    null,
    { timeout: 20000 },
  );
  await page.waitForTimeout(700);
  note(seed, await playPerfectly(), before);
}
await browser.close();
console.log(`${clean}/${total} files played clean and graded S`);
if (errors.length || clean !== total) process.exitCode = 1;
