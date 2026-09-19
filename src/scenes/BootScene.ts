import Phaser from 'phaser';
import { generateAllTextures } from '@/art';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { PALETTE } from '@/config/palette';
import { audio } from '@/systems/audio';
import { applyWeatherAudio } from '@/systems/weather';
import { dailyCaseFor, localDateKey } from '@/systems/dailyCase';
import { dailyPool, playableCases } from '@/systems/secretCase';
import { startColdCase, startCustomCase, startDaily } from '@/systems/coldCase';
import { readCustomCases } from '@/systems/customCases';
import { loadCases, reportCaseErrors } from '@/systems/caseLoader';
import { gameState } from '@/systems/gameState';
import { saveStore } from '@/systems/save';
import { wallet } from '@/systems/wallet';
import { syncDiscovery } from '@/systems/discovery';
import { applyTheme } from '@/config/palette';
import { applyCosmetics } from '@/systems/cosmetics';
import { CursorScene } from './CursorScene';
import { TitleScene } from './TitleScene';
import { setupScene } from './sceneUtil';
import { applyLook, LUCIEN_BASE, LUCIEN_FACE_BASE } from '@/systems/wardrobe';
import { installToasts } from '@/ui/Toast';

/** Generates textures, waits for fonts, validates case data, then starts the title. */
export class BootScene extends Phaser.Scene {
  static readonly KEY = 'BootScene';

  constructor() {
    super(BootScene.KEY);
  }

  preload(): void {
    // Loaded under "-base" keys: the market dresses him from these (see systems/wardrobe).
    this.load.image(LUCIEN_BASE, 'img/lucien.png');
    this.load.image(LUCIEN_FACE_BASE, 'img/lucien-face.png');
  }

  create(): void {
    setupScene(this);
    this.cameras.main.setBackgroundColor(PALETTE.bg);
    // The engine is up: the page's own placeholder has done its job.
    document.getElementById('boot')?.remove();
    const msg = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'loading...', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: PALETTE.paperShadow,
      })
      .setOrigin(0.5);

    installToasts();
    syncDiscovery();
    // A wallet linked on a previous visit reconnects silently (no popup); optional either way.
    void wallet.reconnect();
    const s = saveStore.get().settings;
    applyTheme(s.theme);
    audio.setVolume(s.volume);
    applyWeatherAudio(s.weather);
    audio.setMusic(s.music);
    audio.setMusicVolume(s.musicVolume);

    void this.boot(msg);
  }

  private async boot(msg: Phaser.GameObjects.Text): Promise<void> {
    await this.loadFonts();
    generateAllTextures(this);
    applyCosmetics(this, saveStore.get().cosmetics);
    applyLook(this);

    const loaded = loadCases();
    reportCaseErrors(loaded);
    gameState.cases = loaded.cases;
    if (loaded.cases.length === 0) {
      msg.setText('No valid cases found. Check the console.');
      return;
    }

    this.scene.launch(CursorScene.KEY);
    // Deep links: #case=<id> or #daily jump straight to a file (shared results include them).
    const hash = typeof location !== 'undefined' ? location.hash.slice(1) : '';
    const m = /^case=([a-z0-9-]+)$/.exec(hash);
    const openable = playableCases(saveStore.get(), loaded.cases);
    if (hash === 'daily') {
      history.replaceState(null, '', location.pathname + location.search);
      const daily = dailyCaseFor(localDateKey(), loaded.cases, dailyPool(loaded.cases));
      if (daily) {
        startDaily(this, daily);
        return;
      }
    }
    const linked = m ? openable.find((c) => c.id === m[1]) : undefined;
    if (linked) {
      history.replaceState(null, '', location.pathname + location.search);
      gameState.mode = 'campaign';
      gameState.currentCase = linked;
      gameState.currentIndex = loaded.cases.indexOf(linked);
      this.scene.start('InvestigationScene');
      return;
    }
    const cold = /^cold=([a-z0-9-]{1,32})$/.exec(hash);
    if (cold) {
      history.replaceState(null, '', location.pathname + location.search);
      startColdCase(this, cold[1]);
      return;
    }
    const custom = /^custom=(.+)$/.exec(hash);
    if (custom) {
      history.replaceState(null, '', location.pathname + location.search);
      const c = readCustomCases().find((x) => x.id === decodeURIComponent(custom[1]));
      if (c) {
        startCustomCase(this, c);
        return;
      }
    }
    if (hash === 'rush') {
      history.replaceState(null, '', location.pathname + location.search);
      this.scene.start('RushScene');
      return;
    }
    this.scene.start(TitleScene.KEY);
  }

  private async loadFonts(): Promise<void> {
    if (typeof document === 'undefined' || !('fonts' in document)) return;
    const wanted = [`12px '${FONT.ui}'`, `12px '${FONT.body}'`];
    const timeout = new Promise<void>((r) => setTimeout(r, 3000));
    try {
      await Promise.race([Promise.all(wanted.map((f) => document.fonts.load(f))), timeout]);
    } catch {
      /* fall back to whatever the browser has */
    }
  }
}
