import { expect, test, type Page } from '@playwright/test';

/** The dev build exposes the Phaser game and a few helpers on window. */
declare global {
  interface Window {
    __game: {
      scene: {
        getScenes(active: boolean): { scene: { key: string } }[];
        getScene(k: string): unknown;
      };
    };
    __debug: { startCase(id: string): void };
  }
}

const activeScenes = (page: Page) =>
  page.evaluate(() =>
    window.__game.scene
      .getScenes(true)
      .map((s) => s.scene.key)
      .filter((k) => k !== 'CursorScene'),
  );

async function boot(page: Page, hash = ''): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/WebSocket|favicon/.test(m.text())) errors.push(m.text());
  });
  // A fresh query each time: a hash-only change would not reload the page.
  await page.goto(`/?boot=${Date.now()}${hash}`);
  await page.waitForFunction(() => typeof window.__game !== 'undefined');
  await page.waitForFunction(() => window.__game.scene.getScenes(true).length > 0);
  await page.waitForTimeout(800);
  return errors;
}

/** Skip whatever Lucien is saying so the scene accepts input. */
const skipTalk = (page: Page) =>
  page.evaluate(() => {
    for (const s of window.__game.scene.getScenes(true) as unknown as {
      children: { list: { constructor: { name: string }; finish?: () => void }[] };
    }[]) {
      for (const o of s.children.list) if (o.constructor.name === 'DialogueBox') o.finish?.();
    }
  });

test('boots to the title without errors', async ({ page }) => {
  const errors = await boot(page);
  expect(await activeScenes(page)).toEqual(['TitleScene']);
  expect(errors).toEqual([]);
});

test('a case can be opened, stamped and reported', async ({ page }) => {
  const errors = await boot(page);
  await skipTalk(page);
  await page.evaluate(() => window.__debug.startCase('moonpup'));
  await page.waitForTimeout(1200);
  await skipTalk(page);
  expect(await activeScenes(page)).toEqual(['InvestigationScene']);
  // Enter opens the folder; then stamp RUG through the scene's own API.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  await skipTalk(page);
  await page.evaluate(() => {
    const inv = window.__game.scene.getScene('InvestigationScene') as {
      phase: string;
      stamps: { trigger(fn: (v: string) => void): void }[];
      onStamp(v: string): void;
    };
    if (inv.phase !== 'investigating') throw new Error(`phase ${inv.phase}`);
    inv.stamps[0].trigger((v) => inv.onStamp(v));
  });
  await page.waitForFunction(
    () => window.__game.scene.getScenes(true).some((s) => s.scene.key === 'ReportScene'),
    null,
    { timeout: 10_000 },
  );
  expect(errors).toEqual([]);
});

test('deep links open the rush and a cold case', async ({ page }) => {
  let errors = await boot(page, '#rush');
  expect(await activeScenes(page)).toEqual(['RushScene']);
  expect(errors).toEqual([]);
  errors = await boot(page, '#cold=e2e-seed');
  expect(await activeScenes(page)).toEqual(['InvestigationScene']);
  expect(errors).toEqual([]);
});

test('the editor validates a generated case', async ({ page }) => {
  await page.goto('/editor.html');
  await page.click('#gen');
  await page.click('#validate');
  await expect(page.locator('#status')).toHaveClass(/ok/);
});
