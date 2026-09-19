import { expect, test } from '@playwright/test';

/** The built bundle: no debug hooks, so only what a player would notice. */
test('the production build boots to a canvas without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|serviceWorker|ServiceWorker/.test(m.text()))
      errors.push(m.text());
  });
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 45_000 });
  // Phaser paints the title within a few frames; the canvas must not stay blank.
  await page.waitForTimeout(3000);
  const painted = await page.evaluate(() => {
    const c = document.querySelector('canvas') as HTMLCanvasElement;
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return true; // canvas renderer: nothing to sample cheaply
    const px = new Uint8Array(4);
    gl.readPixels(
      Math.floor(c.width / 2),
      Math.floor(c.height / 2),
      1,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      px,
    );
    return px[3] > 0;
  });
  expect(painted).toBe(true);
  expect(errors).toEqual([]);
});

test('the production build opens the market from a deep link without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|serviceWorker|ServiceWorker/.test(m.text()))
      errors.push(m.text());
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      'rug-or-not:save:v1',
      JSON.stringify({ version: 1, settings: { hints: false, music: false, reducedMotion: true } }),
    );
  });
  await page.goto('/#market');
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: 45_000 });
  // The phone opens on the market shortly after the title; the snag strip must stay hidden.
  await page.waitForTimeout(4000);
  await expect(page.locator('#snag')).toBeHidden();
  expect(errors).toEqual([]);
});

test('the editor page is served by the build', async ({ page }) => {
  await page.goto('/editor.html');
  await expect(page.locator('#json')).toBeVisible();
  await page.click('#validate');
  await expect(page.locator('#status')).toHaveClass(/ok/, { timeout: 15_000 });
});
