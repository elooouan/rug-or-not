import Phaser from 'phaser';
import { generateAllTextures } from '@/art';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { PALETTE } from '@/config/palette';
import { audio } from '@/systems/audio';
import { applyWeatherAudio } from '@/systems/weather';
import { localDateKey, pickDailyCaseId } from '@/systems/dailyCase';
import { dailyPool, playableCases } from '@/systems/secretCase';
import { startColdCase } from '@/systems/coldCase';
import { loadCases, reportCaseErrors } from '@/systems/caseLoader';
import { gameState } from '@/systems/gameState';
import { saveStore } from '@/systems/save';
import { applyCosmetics } from '@/systems/cosmetics';
import { CursorScene } from './CursorScene';
import { TitleScene } from './TitleScene';
import { setupScene } from './sceneUtil';
import { LUCIEN_FACE_TEX, LUCIEN_TEX } from '@/ui/DialogueBox';
import { installToasts } from '@/ui/Toast';

/** Generates textures, waits for fonts, validates case data, then starts the title. */
export class BootScene extends Phaser.Scene {
  static readonly KEY = 'BootScene';

  constructor() {
    super(BootScene.KEY);
  }

  preload(): void {
    this.load.image(LUCIEN_TEX, 'img/lucien.png');
    this.load.image(LUCIEN_FACE_TEX, 'img/lucien-face.png');
  }

  create(): void {
    setupScene(this);
    this.cameras.main.setBackgroundColor(PALETTE.bg);
    const msg = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'loading...', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: PALETTE.paperShadow,
      })
      .setOrigin(0.5);

    installToasts();
    const s = saveStore.get().settings;
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
    const linked = m
      ? openable.find((c) => c.id === m[1])
      : hash === 'daily'
        ? loaded.cases.find(
            (c) => c.id === pickDailyCaseId(localDateKey(), dailyPool(loaded.cases)),
          )
        : undefined;
    if (linked) {
      history.replaceState(null, '', location.pathname + location.search);
      gameState.mode = hash === 'daily' ? 'daily' : 'campaign';
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
