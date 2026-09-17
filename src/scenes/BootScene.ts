import Phaser from 'phaser';
import { generateAllTextures } from '@/art';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { PALETTE } from '@/config/palette';
import { audio } from '@/systems/audio';
import { loadCases, reportCaseErrors } from '@/systems/caseLoader';
import { gameState } from '@/systems/gameState';
import { saveStore } from '@/systems/save';
import { applyCosmetics } from '@/systems/unlocks';
import { CursorScene } from './CursorScene';
import { TitleScene } from './TitleScene';
import { setupScene } from './sceneUtil';

/** Generates textures, waits for fonts, validates case data, then starts the title. */
export class BootScene extends Phaser.Scene {
  static readonly KEY = 'BootScene';

  constructor() {
    super(BootScene.KEY);
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

    const s = saveStore.get().settings;
    audio.setVolume(s.volume);
    audio.setRain(s.rain);
    audio.setMusic(s.music);

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
