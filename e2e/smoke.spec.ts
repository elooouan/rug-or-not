import { expect, test, type Page } from '@playwright/test';

/** The dev build exposes the Phaser game and a few helpers on window. */
declare global {
  interface Window {
    __game: {
      canvas: HTMLCanvasElement;
      scene: {
        getScenes(active: boolean): { scene: { key: string } }[];
        getScene(k: string): unknown;
      };
    };
    __debug: {
      startCase(id: string): void;
      clips(n: number): number;
      overlays(): number;
      audio: { isMuted: boolean };
      wallet: {
        connect(): Promise<void>;
        disconnect(): Promise<void>;
        state: {
          connected: boolean;
          address: string | null;
          sol: number | null;
          error: string | null;
        };
      };
    };
  }
}

const activeScenes = (page: Page) =>
  page.evaluate(() =>
    window.__game.scene
      .getScenes(true)
      .map((s) => s.scene.key)
      .filter((k) => k !== 'CursorScene'),
  );

/** CI runners render through software GL and crawl; give the game room. */
const SLOW = 45_000;

async function boot(page: Page, hash = ''): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/WebSocket|favicon/.test(m.text())) errors.push(m.text());
  });
  // A quiet save: no tutorials, no music, no shake or particles, so the run is short and
  // deterministic on a slow machine.
  await page.addInitScript(() => {
    if (localStorage.getItem('rug-or-not:save:v1')) return;
    localStorage.setItem(
      'rug-or-not:save:v1',
      JSON.stringify({
        version: 1,
        settings: { hints: false, music: false, reducedMotion: true, quips: false },
      }),
    );
  });
  // A fresh query each time: a hash-only change would not reload the page.
  await page.goto(`/?boot=${Date.now()}${hash}`);
  await page.waitForFunction(() => typeof window.__game !== 'undefined', null, { timeout: SLOW });
  await page.waitForFunction(() => window.__game.scene.getScenes(true).length > 0, null, {
    timeout: SLOW,
  });
  await page.waitForTimeout(800);
  return errors;
}

const waitForScene = (page: Page, key: string) =>
  page.waitForFunction(
    (k) => window.__game.scene.getScenes(true).some((s) => s.scene.key === k),
    key,
    { timeout: SLOW },
  );

const waitForPhase = (page: Page, phase: string) =>
  page.waitForFunction(
    (p) => (window.__game.scene.getScene('InvestigationScene') as { phase: string }).phase === p,
    phase,
    { timeout: SLOW },
  );

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
  await waitForScene(page, 'InvestigationScene');
  await waitForPhase(page, 'intake');
  await skipTalk(page);
  // Enter opens the folder; then stamp RUG through the scene's own API.
  await page.keyboard.press('Enter');
  await waitForPhase(page, 'investigating');
  await skipTalk(page);
  await page.evaluate(() => {
    const inv = window.__game.scene.getScene('InvestigationScene') as {
      stamps: { trigger(fn: (v: string) => void): void }[];
      onStamp(v: string): void;
    };
    inv.stamps[0].trigger((v) => inv.onStamp(v));
  });
  await waitForScene(page, 'ReportScene');
  // The file paid its clips and the desk went up on the (local) detectives board.
  const after = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('rug-or-not:save:v1') as string);
    const desks = JSON.parse(localStorage.getItem('rug-or-not:desks:v1') ?? '[]');
    return {
      earned: save.clips.earned,
      id: save.id,
      desks: desks.map((d: { id: string }) => d.id),
    };
  });
  expect(after.earned).toBeGreaterThanOrEqual(3);
  expect(after.id).toMatch(/^[a-f0-9]{16}$/);
  expect(after.desks).toEqual([after.id]);
  expect(errors).toEqual([]);
});

test('deep links open the rush and a cold case', async ({ page }) => {
  let errors = await boot(page, '#rush');
  await waitForScene(page, 'RushScene');
  expect(errors).toEqual([]);
  errors = await boot(page, '#cold=e2e-seed');
  await waitForScene(page, 'InvestigationScene');
  expect(errors).toEqual([]);
  // #market: the title with the phone already on the market.
  errors = await boot(page, '#market');
  await waitForScene(page, 'TitleScene');
  await page.waitForFunction(
    () =>
      (
        window.__game.scene.getScene('TitleScene') as unknown as {
          children: { list: { constructor: { name: string }; page?: string }[] };
        }
      ).children.list.some((o) => o.constructor.name === 'BrowserPanel' && o.page === 'market'),
    null,
    { timeout: SLOW },
  );
  expect(errors).toEqual([]);
});

test('the editor validates a generated case', async ({ page }) => {
  await page.goto('/editor.html');
  await page.click('#gen');
  await page.click('#validate');
  await expect(page.locator('#status')).toHaveClass(/ok/);
});

test('the wall, the notebook and settings open and come back to the title', async ({ page }) => {
  const errors = await boot(page);
  await skipTalk(page);
  type Starter = {
    scene: {
      start(k: string, d?: unknown): void;
      launch(k: string, d?: unknown): void;
      pause(): void;
    };
  };
  for (const key of ['HistoryScene', 'NotebookScene', 'SettingsScene']) {
    await page.evaluate((k) => {
      const title = window.__game.scene.getScene('TitleScene') as Starter;
      title.scene.start(k);
    }, key);
    await waitForScene(page, key);
    await skipTalk(page);
    await page.keyboard.press('Escape');
    await waitForScene(page, 'TitleScene');
  }
  expect(errors).toEqual([]);
});

test('a generated daily opens on a generated day and records the streak', async ({ page }) => {
  // 2026-09-19 is an odd day number, so the daily is a generated file that day.
  await page.clock.setFixedTime(new Date('2026-09-19T21:00:00'));
  const errors = await boot(page, '#daily');
  await waitForScene(page, 'InvestigationScene');
  const id = await page.evaluate(
    () =>
      (window.__game.scene.getScene('InvestigationScene') as { caseData: { id: string } }).caseData
        .id,
  );
  expect(id).toBe('cold-day-2026-09-19');
  await skipTalk(page);
  await waitForPhase(page, 'intake');
  await page.keyboard.press('Enter');
  await waitForPhase(page, 'investigating');
  await page.evaluate(() => {
    const inv = window.__game.scene.getScene('InvestigationScene') as {
      caseData: { verdict: string };
      stamps: { trigger(fn: (v: string) => void): void }[];
      onStamp(v: string): void;
    };
    inv.stamps[inv.caseData.verdict === 'rug' ? 0 : 1].trigger((v) => inv.onStamp(v));
  });
  await waitForScene(page, 'ReportScene');
  const daily = await page.evaluate(
    () => JSON.parse(localStorage.getItem('rug-or-not:save:v1') as string).daily,
  );
  expect(daily.lastPlayed).toBe('2026-09-19');
  expect(daily.streak).toBe(1);
  expect(errors).toEqual([]);
});

test('a wallet connects read-only and the title chip shows the address', async ({ page }) => {
  // A stand-in for Phantom's injected provider. Anything that would sign or send records
  // itself; the game must never call those.
  await page.addInitScript(() => {
    const calls: string[] = [];
    const key = { toString: () => 'F4keWa11etAddre55xxxxxxxxxxxxxxxxxxxxxxxxxxx' };
    const w = window as unknown as { phantom: unknown; __walletCalls: string[] };
    w.__walletCalls = calls;
    w.phantom = {
      solana: {
        isPhantom: true,
        publicKey: null,
        connect: async () => ({ publicKey: key }),
        disconnect: async () => undefined,
        on: () => undefined,
        signTransaction: async () => calls.push('signTransaction'),
        signAllTransactions: async () => calls.push('signAllTransactions'),
        signAndSendTransaction: async () => calls.push('signAndSendTransaction'),
        signMessage: async () => calls.push('signMessage'),
        request: async () => calls.push('request'),
      },
    };
  });
  // Public RPC answered locally: 2.5 SOL, mainnet genesis, no token accounts.
  await page.route('https://api.mainnet-beta.solana.com/**', async (route) => {
    const { method } = route.request().postDataJSON() as { method: string };
    const result =
      method === 'getBalance'
        ? { value: 2_500_000_000 }
        : method === 'getGenesisHash'
          ? '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d'
          : { value: [] };
    await route.fulfill({ json: { jsonrpc: '2.0', id: 1, result } });
  });
  const errors = await boot(page);
  await skipTalk(page);
  await page.evaluate(() => window.__debug.wallet.connect());
  await page.waitForFunction(() => window.__debug.wallet.state.sol !== null, null, {
    timeout: SLOW,
  });
  const state = await page.evaluate(() => window.__debug.wallet.state);
  expect(state).toMatchObject({ connected: true, sol: 2.5, error: null });
  expect(state.address).toBe('F4keWa11etAddre55xxxxxxxxxxxxxxxxxxxxxxxxxxx');
  // The chip on the title follows the wallet.
  const chip = await page.evaluate(() => {
    const title = window.__game.scene.getScene('TitleScene') as {
      children: { list: { type: string; list?: { type: string; text?: string }[] }[] };
    };
    return title.children.list
      .flatMap((o) => (o.type === 'Container' ? (o.list ?? []) : [o]))
      .map((o) => (o as { text?: string }).text ?? '')
      .find((t) => t.includes('F4ke...'));
  });
  expect(chip).toBe('$LUCIEN · F4ke...xxxx');
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('rug-or-not:save:v1') as string).wallet,
  );
  expect(saved).toMatchObject({
    linked: true,
    address: 'F4keWa11etAddre55xxxxxxxxxxxxxxxxxxxxxxxxxxx',
  });
  await page.evaluate(() => window.__debug.wallet.disconnect());
  expect(await page.evaluate(() => window.__debug.wallet.state.connected)).toBe(false);
  expect(
    await page.evaluate(() => (window as unknown as { __walletCalls: string[] }).__walletCalls),
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test('the desk opens up as files close', async ({ page }) => {
  const errors = await boot(page);
  await skipTalk(page);
  const menu = () =>
    page.evaluate(() => {
      const title = window.__game.scene.getScene('TitleScene') as {
        children: { list: unknown[] };
      };
      const labels: string[] = [];
      const walk = (list: unknown[]) =>
        list.forEach((o) => {
          const c = o as { constructor: { name: string }; list?: unknown[] };
          if (c.constructor.name === 'PixelButton')
            labels.push(
              String(
                (c.list?.find((x) => (x as { type: string }).type === 'Text') as { text: string })
                  .text,
              ),
            );
          else if (c.list) walk(c.list);
        });
      walk(title.children.list);
      return labels;
    });
  const fresh = await menu();
  expect(fresh).toContain('Play');
  expect(fresh).toContain('How to play');
  expect(fresh).not.toContain('Case files');
  expect(fresh).not.toContain('Red Flag Rush');
  expect(fresh).not.toContain('Cold case');

  // Three closed files later: drawer, rush and the pile are on the desk.
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('rug-or-not:save:v1') as string);
    for (const id of ['a', 'b', 'c'])
      save.caseResults[id] = {
        bestScore: 100,
        bestGrade: 'B',
        completions: 1,
        lastVerdictCorrect: true,
      };
    localStorage.setItem('rug-or-not:save:v1', JSON.stringify(save));
  });
  await page.reload();
  await page.waitForFunction(
    () => window.__game?.scene.getScenes(true).some((s) => s.scene.key === 'TitleScene'),
    null,
    { timeout: SLOW },
  );
  await page.waitForTimeout(800);
  await skipTalk(page);
  const later = await menu();
  expect(later).toContain('Case files');
  expect(later).toContain('Red Flag Rush');
  expect(later).toContain('Cold case');
  expect(errors).toEqual([]);
});

test('a theme change repaints the office without breaking the next screens', async ({ page }) => {
  const errors = await boot(page);
  await skipTalk(page);
  await page.evaluate(() => {
    const title = window.__game.scene.getScene('TitleScene') as {
      scene: { start(k: string, d?: unknown): void };
    };
    title.scene.start('SettingsScene', { tab: 'office' });
  });
  await waitForScene(page, 'SettingsScene');
  await skipTalk(page);
  // Cycle the colours twice (each one restarts and repaints the page).
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => {
      const st = window.__game.scene.getScene('SettingsScene') as {
        rows: { label: string; change(d: number): void }[];
      };
      st.rows.find((r) => r.label === 'Office colours')?.change(1);
    });
    await page.waitForTimeout(600);
    await waitForScene(page, 'SettingsScene');
  }
  const theme = await page.evaluate(
    () => JSON.parse(localStorage.getItem('rug-or-not:save:v1') as string).settings.theme,
  );
  expect(theme).toBe('midnight');
  await page.keyboard.press('Escape');
  await waitForScene(page, 'TitleScene');
  await page.evaluate(() => window.__debug.startCase('moonpup'));
  await waitForScene(page, 'InvestigationScene');
  await page.waitForTimeout(800);
  expect(errors).toEqual([]);
});

test('a herring hunt deals pages that carry the herring and scores a hit on it', async ({
  page,
}) => {
  const errors = await boot(page);
  await skipTalk(page);
  await page.evaluate(() => {
    const title = window.__game.scene.getScene('TitleScene') as {
      scene: { start(k: string, d?: unknown): void };
    };
    title.scene.start('RushScene', { hunt: 'community-jokes' });
  });
  await waitForScene(page, 'RushScene');
  await page.waitForFunction(
    () => (window.__game.scene.getScene('RushScene') as { phase: string }).phase === 'playing',
    null,
    { timeout: SLOW },
  );
  const result = await page.evaluate(() => {
    type Spot = { clue: { id: string; herringId?: string; flagId?: string } };
    const r = window.__game.scene.getScene('RushScene') as {
      hunt: string;
      state: { score: number; rounds: number };
      doc: { allSpots(): Spot[]; focusClue(id: string): boolean; activateFocused(): void };
    };
    const spots = r.doc.allSpots();
    const target = spots.find((s) => s.clue.herringId === 'community-jokes');
    if (!target) return { hunt: r.hunt, target: false, score: -1, rounds: -1 };
    r.doc.focusClue(target.clue.id);
    r.doc.activateFocused();
    return { hunt: r.hunt, target: true, score: r.state.score, rounds: r.state.rounds };
  });
  expect(result).toEqual({ hunt: 'community-jokes', target: true, score: 100, rounds: 1 });
  expect(errors).toEqual([]);
});

test('the name picker takes typing and keeps the letters away from the desk', async ({ page }) => {
  const errors = await boot(page);
  await skipTalk(page);
  // Phone > NetScope > Hall of Detectives > Change name, pressed the way a pointer would.
  const opened = await page.evaluate(() => {
    type Obj = { constructor: { name: string }; label?: { text: string }; list?: Obj[] };
    type Btn = Obj & { emit: (ev: string) => void };
    const walk = (o: Obj, out: Obj[] = []): Obj[] => {
      out.push(o);
      o.list?.forEach((c) => walk(c, out));
      return out;
    };
    const title = window.__game.scene.getScene('TitleScene') as { children: { list: Obj[] } };
    const all = () => title.children.list.flatMap((o) => walk(o));
    const button = (text: string) =>
      all().find((o) => o.constructor.name === 'PixelButton' && o.label?.text.startsWith(text)) as
        Btn | undefined;
    button('Connect')?.emit('pointerdown');
    const panel = all().find((o) => o.constructor.name === 'BrowserPanel') as
      (Obj & { go: (p: string) => void }) | undefined;
    panel?.go('board');
    const change = button('Change name');
    change?.emit('pointerdown');
    return { panel: !!panel, change: !!change };
  });
  expect(opened).toEqual({ panel: true, change: true });
  await page.waitForTimeout(300);
  for (const ch of 'rugm') {
    await page.keyboard.press(ch);
    await page.waitForTimeout(60);
  }
  await page.waitForTimeout(500);
  const before = await page.evaluate(() => {
    type Obj = { constructor: { name: string }; letters?: { text: string }[] };
    const t = window.__game.scene.getScene('TitleScene') as { children: { list: Obj[] } };
    const picker = t.children.list.find((o) => o.constructor.name === 'NamePicker');
    return {
      letters: picker?.letters?.map((l) => l.text).join(''),
      stamps: t.children.list.filter((o) => o.constructor.name === 'StampMark').length,
    };
  });
  // "rug" typed into the picker is not the typed easter egg, and the M did not mute.
  expect(before.letters).toBe('RUGM__');
  expect(before.stamps).toBe(0);
  expect(await page.evaluate(() => window.__debug.audio.isMuted)).toBe(false);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const name = await page.evaluate(
    () => JSON.parse(localStorage.getItem('rug-or-not:save:v1') as string).detectiveName,
  );
  expect(name).toBe('RUGM');
  expect(errors).toEqual([]);
});

test('the second look reopens a closed file with the misses marked', async ({ page }) => {
  const errors = await boot(page);
  await skipTalk(page);
  await page.evaluate(() => window.__debug.startCase('safeyield'));
  await waitForScene(page, 'InvestigationScene');
  await waitForPhase(page, 'intake');
  await skipTalk(page);
  await page.keyboard.press('Enter');
  await waitForPhase(page, 'investigating');
  await skipTalk(page);
  type Spot = { clue: { id: string; flagId?: string }; pinned: boolean; missed: boolean };
  type Doc = { allSpots(): Spot[]; focusClue(id: string): boolean; activateFocused(): void };
  type Inv = {
    docs: Doc[];
    stamps: { trigger(fn: (v: string) => void): void }[];
    onStamp(v: string): void;
    review: unknown;
    tabs: { tabs: { dot: { visible: boolean; fillColor: number } }[] };
  };
  // Pin the first flag on the paper and nothing else, then call it a rug.
  await page.evaluate(() => {
    const inv = window.__game.scene.getScene('InvestigationScene') as unknown as Inv;
    const doc = inv.docs[0];
    const first = doc.allSpots().find((s) => s.clue.flagId);
    if (first) {
      doc.focusClue(first.clue.id);
      doc.activateFocused();
    }
    inv.stamps[0].trigger((v) => inv.onStamp(v));
  });
  await waitForScene(page, 'ReportScene');
  await page.waitForTimeout(600);
  await skipTalk(page);
  // The report offers the second look as a line; it lands back on the desk read-only.
  const offered = await page.evaluate(() => {
    const rs = window.__game.scene.getScene('ReportScene') as unknown as {
      typewriter: { skip(): void };
      content: { list: { text?: string; emit(ev: string, ...a: unknown[]): void }[] };
    };
    rs.typewriter.skip();
    const line = rs.content.list.find((o) => /SECOND LOOK/.test(o.text ?? ''));
    const ev = { stopPropagation: () => undefined };
    line?.emit('pointerdown', { getDistance: () => 0 }, 0, 0, ev);
    line?.emit('pointerup', { getDistance: () => 0 }, 0, 0, ev);
    return !!line;
  });
  expect(offered).toBe(true);
  await waitForScene(page, 'InvestigationScene');
  await page.waitForTimeout(800);
  const look = await page.evaluate(() => {
    const inv = window.__game.scene.getScene('InvestigationScene') as unknown as Inv;
    const spots = inv.docs.flatMap((d) => d.allSpots());
    return {
      review: inv.review !== null,
      stamps: inv.stamps.length,
      pinned: spots.filter((s) => s.pinned).map((s) => s.clue.id),
      missed: spots.filter((s) => s.missed).length,
      flags: spots.filter((s) => s.clue.flagId).length,
    };
  });
  expect(look.review).toBe(true);
  expect(look.stamps).toBe(0);
  expect(look.pinned).toEqual(['sy-admin']);
  expect(look.missed).toBe(look.flags - 1);
  // Esc goes back to the report, which is already typed and awards nothing twice.
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem('rug-or-not:save:v1') as string).totalScore,
  );
  await page.keyboard.press('Escape');
  await waitForScene(page, 'ReportScene');
  await page.waitForTimeout(500);
  const back = await page.evaluate(() => {
    const rs = window.__game.scene.getScene('ReportScene') as unknown as {
      payload: { revisit?: boolean };
      typewriter: { done: boolean };
    };
    return {
      revisit: rs.payload.revisit,
      typed: rs.typewriter.done,
      total: JSON.parse(localStorage.getItem('rug-or-not:save:v1') as string).totalScore,
    };
  });
  expect(back).toEqual({ revisit: true, typed: true, total: before });
  expect(errors).toEqual([]);
});

test('a desk quip during a chained lesson gives way to the next lesson', async ({ page }) => {
  // Hints on: the report's lesson chains into "first wrong", and the cat has a line too.
  await page.addInitScript(() => {
    localStorage.setItem(
      'rug-or-not:save:v1',
      JSON.stringify({
        version: 1,
        settings: { hints: true, music: false, reducedMotion: true, quips: false },
      }),
    );
  });
  const errors = await boot(page);
  await skipTalk(page);
  await page.evaluate(() => window.__debug.startCase('moonpup'));
  await waitForScene(page, 'InvestigationScene');
  await waitForPhase(page, 'intake');
  await skipTalk(page);
  await page.keyboard.press('Enter');
  await waitForPhase(page, 'investigating');
  await skipTalk(page);
  // The wrong stamp, so the report's lesson has a follow-up.
  await page.evaluate(() => {
    const inv = window.__game.scene.getScene('InvestigationScene') as unknown as {
      stamps: { trigger(fn: (v: string) => void): void }[];
      onStamp(v: string): void;
    };
    inv.stamps[1].trigger((v) => inv.onStamp(v));
  });
  await waitForScene(page, 'ReportScene');
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    (
      window.__game.scene.getScene('ReportScene') as unknown as { typewriter: { skip(): void } }
    ).typewriter.skip();
  });
  type Box = { constructor: { name: string }; lines?: { text: string }[]; active: boolean };
  const boxes = () =>
    page.evaluate(() =>
      (
        window.__game.scene.getScene('ReportScene') as unknown as { children: { list: Box[] } }
      ).children.list
        .filter((o) => o.constructor.name === 'DialogueBox')
        .map((b) => b.lines?.[0]?.text.slice(0, 20)),
    );
  await page.waitForFunction(
    () =>
      (
        window.__game.scene.getScene('ReportScene') as unknown as { children: { list: Box[] } }
      ).children.list.some((o) => o.constructor.name === 'DialogueBox'),
    null,
    { timeout: SLOW },
  );
  expect(await boxes()).toEqual(['The report shows eve']);
  // One pet of the cat while the lesson is up: the cat's line would open a second box.
  await page.evaluate(() => {
    const rs = window.__game.scene.getScene('ReportScene') as unknown as {
      children: { list: { texture?: { key: string }; emit(ev: string): void }[] };
    };
    rs.children.list.find((o) => o.texture?.key.startsWith('desk-cat'))?.emit('pointerdown');
  });
  await page.waitForTimeout(500);
  // One box, and it is the next lesson, not the quip; the quip's claim is given back.
  expect(await boxes()).toEqual(['Happens to the best ']);
  const seen = await page.evaluate(
    () => JSON.parse(localStorage.getItem('rug-or-not:save:v1') as string).seenHints as string[],
  );
  expect(seen).toContain('first-wrong');
  expect(seen).not.toContain('cat');
  expect(errors).toEqual([]);
});

test('Esc works in an overlay opened over a lesson', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'rug-or-not:save:v1',
      JSON.stringify({
        version: 1,
        settings: { hints: true, music: false, reducedMotion: true, quips: false },
      }),
    );
  });
  const errors = await boot(page);
  await skipTalk(page);
  await page.evaluate(() => window.__debug.startCase('moonpup'));
  await waitForScene(page, 'InvestigationScene');
  await waitForPhase(page, 'intake');
  await skipTalk(page);
  await page.keyboard.press('Enter');
  await waitForPhase(page, 'investigating');
  await skipTalk(page);
  await page.evaluate(() => {
    const inv = window.__game.scene.getScene('InvestigationScene') as unknown as {
      stamps: { trigger(fn: (v: string) => void): void }[];
      onStamp(v: string): void;
    };
    inv.stamps[0].trigger((v) => inv.onStamp(v));
  });
  await waitForScene(page, 'ReportScene');
  await page.waitForTimeout(600);
  await page.evaluate(() =>
    (
      window.__game.scene.getScene('ReportScene') as unknown as { typewriter: { skip(): void } }
    ).typewriter.skip(),
  );
  type Obj = { constructor: { name: string }; label?: { text: string }; emit(ev: string): void };
  // The report's lesson is up; open the notebook over it without finishing the lesson.
  await page.waitForFunction(
    () =>
      (
        window.__game.scene.getScene('ReportScene') as unknown as { children: { list: Obj[] } }
      ).children.list.some((o) => o.constructor.name === 'DialogueBox'),
    null,
    { timeout: SLOW },
  );
  await page.evaluate(() => {
    const rs = window.__game.scene.getScene('ReportScene') as unknown as {
      children: { list: Obj[] };
    };
    rs.children.list
      .find((o) => o.constructor.name === 'PixelButton' && o.label?.text === 'Notebook')
      ?.emit('pointerdown');
  });
  await waitForScene(page, 'NotebookScene');
  await page.waitForTimeout(400);
  // The notebook's own lesson goes first (active scenes only: the report's box stays).
  await skipTalk(page);
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => !window.__game.scene.getScenes(true).some((s) => s.scene.key === 'NotebookScene'),
    null,
    { timeout: SLOW },
  );
  expect(await activeScenes(page)).toEqual(['ReportScene']);
  // The lesson is still on the report, and nothing counts as an overlay from the notebook.
  const after = await page.evaluate(() => ({
    box: (
      window.__game.scene.getScene('ReportScene') as unknown as { children: { list: Obj[] } }
    ).children.list.some((o) => o.constructor.name === 'DialogueBox'),
    overlays: window.__debug.overlays(),
  }));
  expect(after).toEqual({ box: true, overlays: 1 });
  expect(errors).toEqual([]);
});

test('the drawer reopens the last report of a closed file', async ({ page }) => {
  const errors = await boot(page);
  await skipTalk(page);
  await page.evaluate(() => window.__debug.startCase('moonpup'));
  await waitForScene(page, 'InvestigationScene');
  await waitForPhase(page, 'intake');
  await skipTalk(page);
  await page.keyboard.press('Enter');
  await waitForPhase(page, 'investigating');
  await skipTalk(page);
  await page.evaluate(() => {
    const inv = window.__game.scene.getScene('InvestigationScene') as unknown as {
      docs: {
        allSpots(): { clue: { id: string; flagId?: string } }[];
        focusClue(id: string): boolean;
        activateFocused(): void;
      }[];
      stamps: { trigger(fn: (v: string) => void): void }[];
      onStamp(v: string): void;
    };
    const doc = inv.docs[0];
    const first = doc.allSpots().find((s) => s.clue.flagId);
    if (first) {
      doc.focusClue(first.clue.id);
      doc.activateFocused();
    }
    inv.stamps[0].trigger((v) => inv.onStamp(v));
  });
  await waitForScene(page, 'ReportScene');
  await page.waitForTimeout(600);
  const scored = await page.evaluate(
    () =>
      (
        window.__game.scene.getScene('ReportScene') as unknown as {
          payload: { breakdown: { total: number } };
        }
      ).payload.breakdown.total,
  );
  // Into the drawer, then the grade sticker on the first folder (a mouse press).
  await page.evaluate(() =>
    (
      window.__game.scene.getScene('ReportScene') as unknown as {
        scene: { start(k: string): void };
      }
    ).scene.start('CaseSelectScene'),
  );
  await waitForScene(page, 'CaseSelectScene');
  await skipTalk(page);
  await page.waitForTimeout(300);
  const pressed = await page.evaluate(() => {
    const cs = window.__game.scene.getScene('CaseSelectScene') as unknown as {
      folders: {
        list: { type: string; input?: unknown; emit(ev: string, ...a: unknown[]): void }[];
      }[];
    };
    const sticker = cs.folders[0].list.find((o) => o.type === 'Rectangle' && o.input);
    sticker?.emit('pointerdown', {}, 0, 0, { stopPropagation: () => undefined });
    return !!sticker;
  });
  expect(pressed).toBe(true);
  await waitForScene(page, 'ReportScene');
  await page.waitForTimeout(400);
  const again = await page.evaluate(() => {
    const rs = window.__game.scene.getScene('ReportScene') as unknown as {
      payload: { revisit?: boolean; breakdown: { total: number } };
    };
    return { revisit: rs.payload.revisit, total: rs.payload.breakdown.total };
  });
  expect(again).toEqual({ revisit: true, total: scored });
  expect(errors).toEqual([]);
});

test('the market dresses Lucien and the desk while the title is up', async ({ page }) => {
  const errors = await boot(page);
  await skipTalk(page);
  type Btn = { constructor: { name: string }; label?: { text: string }; emit(ev: string): void };
  const panelButton = (page: Page, label: string) =>
    page.evaluate((label) => {
      const title = window.__game.scene.getScene('TitleScene') as unknown as {
        children: { list: { constructor: { name: string }; list?: unknown[] }[] };
      };
      const panel = title.children.list.find((o) => o.constructor.name === 'BrowserPanel');
      const all: Btn[] = [];
      const visit = (o: Btn & { list?: Btn[] }) => {
        o.list?.forEach(visit);
        all.push(o);
      };
      if (panel) visit(panel as unknown as Btn);
      const b = all.find((o) => o.constructor.name === 'PixelButton' && o.label?.text === label);
      b?.emit('pointerdown');
      return !!b;
    }, label);
  // Enough clips for a coat, then the phone, the market, the first coat on sale.
  await page.evaluate(() => {
    window.__debug.clips(200);
    const title = window.__game.scene.getScene('TitleScene') as unknown as {
      children: { list: { texture?: { key: string }; emit(ev: string): void }[] };
    };
    title.children.list.find((o) => o.texture?.key === 'desk-phone')?.emit('pointerdown');
  });
  await page.waitForTimeout(300);
  await skipTalk(page);
  expect(await panelButton(page, 'Market')).toBe(true);
  await page.waitForTimeout(300);
  await skipTalk(page);
  // Hovering a coat tries it on in the strip; leaving puts the real one back.
  const stripKey = () =>
    page.evaluate(() => {
      const title = window.__game.scene.getScene('TitleScene') as unknown as {
        children: { list: { constructor: { name: string }; list?: unknown[] }[] };
      };
      const panel = title.children.list.find((o) => o.constructor.name === 'BrowserPanel');
      const all: { type?: string; texture?: { key: string }; list?: unknown[] }[] = [];
      const visit = (o: { list?: unknown[] }) => {
        (o.list as { list?: unknown[] }[] | undefined)?.forEach(visit);
        all.push(o as { type?: string });
      };
      if (panel) visit(panel as { list?: unknown[] });
      return all.find((o) => o.type === 'Image')?.texture?.key;
    });
  const hoverBuy = (over: boolean) =>
    page.evaluate((over) => {
      const title = window.__game.scene.getScene('TitleScene') as unknown as {
        children: { list: { constructor: { name: string }; list?: unknown[] }[] };
      };
      const panel = title.children.list.find((o) => o.constructor.name === 'BrowserPanel');
      const all: Btn[] = [];
      const visit = (o: Btn & { list?: Btn[] }) => {
        o.list?.forEach(visit);
        all.push(o);
      };
      if (panel) visit(panel as unknown as Btn);
      all
        .find((o) => o.constructor.name === 'PixelButton' && o.label?.text === 'Buy 80')
        ?.emit(over ? 'pointerover' : 'pointerout');
    }, over);
  expect(await stripKey()).toBe('lucien');
  await hoverBuy(true);
  await page.waitForTimeout(150);
  expect(await stripKey()).toBe('preview-coat');
  await hoverBuy(false);
  await page.waitForTimeout(150);
  expect(await stripKey()).toBe('lucien');
  expect(await panelButton(page, 'Buy 80')).toBe(true);
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('rug-or-not:save:v1') as string);
    const title = window.__game.scene.getScene('TitleScene') as unknown as {
      children: { list: { texture?: { key: string }; frame?: { source: unknown } }[] };
    };
    const lucien = title.children.list.find((o) => o.texture?.key === 'lucien');
    return {
      look: save.look.coat,
      owned: save.owned,
      spent: save.clips.spent,
      ok: !!lucien?.frame?.source,
    };
  });
  expect(after).toEqual({ look: 'coat-navy', owned: ['coat-navy'], spent: 80, ok: true });
  // Back to the free coat and out; the next screen must draw the desk without errors.
  expect(await panelButton(page, 'Wear')).toBe(true);
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__debug.startCase('moonpup'));
  await waitForScene(page, 'InvestigationScene');
  await page.waitForTimeout(800);
  expect(errors).toEqual([]);
});

test('a purchase from the settings page redresses the file paused underneath', async ({ page }) => {
  const errors = await boot(page);
  await skipTalk(page);
  await page.evaluate(() => {
    window.__debug.clips(200);
    window.__debug.startCase('bean');
  });
  await waitForScene(page, 'InvestigationScene');
  await waitForPhase(page, 'intake');
  await skipTalk(page);
  await page.keyboard.press('Enter');
  await waitForPhase(page, 'investigating');
  await skipTalk(page);
  type Btn = { constructor: { name: string }; label?: { text: string }; emit(ev: string): void };
  const press = (page: Page, sceneKey: string, label: string) =>
    page.evaluate(
      ([sceneKey, label]) => {
        const sc = window.__game.scene.getScene(sceneKey) as unknown as {
          children: { list: (Btn & { list?: Btn[] })[] };
        };
        const all: Btn[] = [];
        const visit = (o: Btn & { list?: Btn[] }) => {
          o.list?.forEach(visit);
          all.push(o);
        };
        sc.children.list.forEach(visit);
        const b = all.find((o) => o.constructor.name === 'PixelButton' && o.label?.text === label);
        b?.emit('pointerdown');
        return !!b;
      },
      [sceneKey, label],
    );
  // Pause, Settings (the file waits underneath), the desk row opens the market.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  expect(await press(page, 'InvestigationScene', 'Settings')).toBe(true);
  await waitForScene(page, 'SettingsScene');
  await page.waitForTimeout(300);
  await skipTalk(page);
  expect(await press(page, 'SettingsScene', 'Office')).toBe(true);
  await page.waitForTimeout(200);
  const opened = await page.evaluate(() => {
    const st = window.__game.scene.getScene('SettingsScene') as unknown as {
      rows: { label: string; change(d: number): void }[];
    };
    const row = st.rows.find((r) => r.label === 'Desk & wardrobe');
    row?.change(1);
    return !!row;
  });
  expect(opened).toBe(true);
  await page.waitForTimeout(300);
  await skipTalk(page);
  expect(await press(page, 'SettingsScene', 'Buy 80')).toBe(true);
  await page.waitForTimeout(400);
  const coat = await page.evaluate(
    () => JSON.parse(localStorage.getItem('rug-or-not:save:v1') as string).look.coat,
  );
  expect(coat).toBe('coat-navy');
  // Out of the phone, out of settings, back to the file: it must draw its corner face.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForFunction(
    () => !window.__game.scene.getScenes(true).some((s) => s.scene.key === 'SettingsScene'),
    null,
    { timeout: SLOW },
  );
  await page.waitForTimeout(300);
  expect(await press(page, 'InvestigationScene', 'Resume')).toBe(true);
  await page.waitForTimeout(800);
  const faceOk = await page.evaluate(() => {
    const inv = window.__game.scene.getScene('InvestigationScene') as unknown as {
      children: { list: { texture?: { key: string }; frame?: { source: unknown } }[] };
    };
    const face = inv.children.list.find((o) => o.texture?.key === 'lucien-face');
    return !!face?.frame?.source;
  });
  expect(faceOk).toBe(true);
  expect(errors).toEqual([]);
});

test.describe('touch', () => {
  test.use({ hasTouch: true });

  test('a finger pins with a tap, scrolls with a drag, and only lifts buttons it stayed on', async ({
    page,
  }) => {
    const errors = await boot(page);
    await skipTalk(page);
    await page.evaluate(() => window.__debug.startCase('moonpup'));
    await waitForScene(page, 'InvestigationScene');
    await waitForPhase(page, 'intake');
    await skipTalk(page);
    await page.keyboard.press('Enter');
    await waitForPhase(page, 'investigating');
    await skipTalk(page);
    // Synthetic touches on the canvas: world coordinates go through the canvas rect.
    await page.evaluate(() => {
      const canvas = window.__game.canvas;
      const r = canvas.getBoundingClientRect();
      const at = (wx: number, wy: number) => ({
        x: r.left + (wx * r.width) / 640,
        y: r.top + (wy * r.height) / 360,
      });
      (window as unknown as { __touch: (type: string, wx: number, wy: number) => void }).__touch = (
        type,
        wx,
        wy,
      ) => {
        const c = at(wx, wy);
        const t = new Touch({
          identifier: 1,
          target: canvas,
          clientX: c.x,
          clientY: c.y,
          pageX: c.x,
          pageY: c.y,
        });
        const list = type === 'touchend' ? [] : [t];
        canvas.dispatchEvent(
          new TouchEvent(type, {
            touches: list,
            targetTouches: list,
            changedTouches: [t],
            bubbles: true,
            cancelable: true,
          }),
        );
      };
    });
    type W = { __touch: (type: string, wx: number, wy: number) => void };
    const touch = (type: string, wx: number, wy: number) =>
      page.evaluate(([t, x, y]) => (window as unknown as W).__touch(t, x, y), [type, wx, wy] as [
        string,
        number,
        number,
      ]);
    const spot = await page.evaluate(() => {
      const inv = window.__game.scene.getScene('InvestigationScene') as unknown as {
        docs: {
          allSpots(): {
            clue: { id: string };
            rect: { x: number; y: number };
            getWorldTransformMatrix(): { tx: number; ty: number };
          }[];
        }[];
      };
      const s = inv.docs[0].allSpots()[0];
      const m = s.getWorldTransformMatrix();
      return { id: s.clue.id, x: m.tx + s.rect.x + 20, y: m.ty + s.rect.y + 6 };
    });
    // A drag that ends on the spot is reading, not pinning.
    await touch('touchstart', spot.x - 60, spot.y + 40);
    for (let i = 1; i <= 6; i++) {
      await touch('touchmove', spot.x - 60 + i * 10, spot.y + 40 - i * 7);
      await page.waitForTimeout(30);
    }
    await touch('touchend', spot.x, spot.y - 2);
    await page.waitForTimeout(200);
    const pinnedIds = () =>
      page.evaluate(() =>
        (
          window.__game.scene.getScene('InvestigationScene') as unknown as {
            docs: { pinnedIds(): string[] }[];
          }
        ).docs[0].pinnedIds(),
      );
    expect(await pinnedIds()).toEqual([]);
    // A tap pins.
    await touch('touchstart', spot.x, spot.y);
    await page.waitForTimeout(40);
    await touch('touchend', spot.x, spot.y);
    await page.waitForTimeout(200);
    expect(await pinnedIds()).toEqual([spot.id]);
    // The Menu button: a drag that starts on it does nothing; a tap opens the pause menu.
    const menu = await page.evaluate(() => {
      type Obj = {
        constructor: { name: string };
        label?: { text: string };
        bw: number;
        bh: number;
        getWorldTransformMatrix(): { tx: number; ty: number };
      };
      const inv = window.__game.scene.getScene('InvestigationScene') as unknown as {
        children: { list: Obj[] };
      };
      const b = inv.children.list.find(
        (o) => o.constructor.name === 'PixelButton' && o.label?.text.startsWith('Menu'),
      )!;
      const m = b.getWorldTransformMatrix();
      return { x: m.tx + b.bw / 2, y: m.ty + b.bh / 2 };
    });
    const paused = () =>
      page.evaluate(
        () =>
          (window.__game.scene.getScene('InvestigationScene') as unknown as { paused: boolean })
            .paused,
      );
    await touch('touchstart', menu.x, menu.y);
    for (let i = 1; i <= 5; i++) {
      await touch('touchmove', menu.x, menu.y - i * 8);
      await page.waitForTimeout(30);
    }
    await touch('touchend', menu.x, menu.y - 40);
    await page.waitForTimeout(200);
    expect(await paused()).toBe(false);
    await touch('touchstart', menu.x, menu.y);
    await page.waitForTimeout(40);
    await touch('touchend', menu.x, menu.y);
    await page.waitForTimeout(300);
    expect(await paused()).toBe(true);
    expect(errors).toEqual([]);
  });

  test('a tap on a market name tries it on, a second tap takes it off', async ({ page }) => {
    const errors = await boot(page, '#market');
    await skipTalk(page);
    await page.waitForTimeout(1200);
    await skipTalk(page);
    // Strip image and the "Navy trench" row, both inside the panel.
    const find = () =>
      page.evaluate(() => {
        const title = window.__game.scene.getScene('TitleScene') as unknown as {
          children: { list: { constructor: { name: string }; list?: unknown[] }[] };
        };
        const panel = title.children.list.find((o) => o.constructor.name === 'BrowserPanel');
        type Obj = {
          type?: string;
          text?: string;
          texture?: { key: string };
          list?: Obj[];
          getWorldTransformMatrix(): { tx: number; ty: number };
        };
        const all: Obj[] = [];
        const visit = (o: Obj) => {
          o.list?.forEach(visit);
          all.push(o);
        };
        if (panel) visit(panel as unknown as Obj);
        const strip = all.find((o) => o.type === 'Image')?.texture?.key;
        const name = all.find((o) => o.type === 'Text' && /^Navy trench/.test(o.text ?? ''));
        const m = name?.getWorldTransformMatrix();
        return { strip, x: (m?.tx ?? 0) + 12, y: (m?.ty ?? 0) + 4, found: !!name };
      });
    const tap = (wx: number, wy: number) =>
      page.evaluate(
        ([wx, wy]) => {
          const canvas = window.__game.canvas;
          const r = canvas.getBoundingClientRect();
          const c = { x: r.left + (wx * r.width) / 640, y: r.top + (wy * r.height) / 360 };
          const t = new Touch({
            identifier: 1,
            target: canvas,
            clientX: c.x,
            clientY: c.y,
            pageX: c.x,
            pageY: c.y,
          });
          const fire = (type: string, list: Touch[]) =>
            canvas.dispatchEvent(
              new TouchEvent(type, {
                touches: list,
                targetTouches: list,
                changedTouches: [t],
                bubbles: true,
                cancelable: true,
              }),
            );
          fire('touchstart', [t]);
          return new Promise<void>((done) =>
            setTimeout(() => {
              fire('touchend', []);
              done();
            }, 40),
          );
        },
        [wx, wy] as [number, number],
      );
    const before = await find();
    expect(before.found).toBe(true);
    expect(before.strip).toBe('lucien');
    await tap(before.x, before.y);
    await page.waitForTimeout(200);
    expect((await find()).strip).toBe('preview-coat');
    await tap(before.x, before.y);
    await page.waitForTimeout(200);
    expect((await find()).strip).toBe('lucien');
    expect(errors).toEqual([]);
  });
});
