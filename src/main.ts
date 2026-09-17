import Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '@/config/layout';
import { PALETTE } from '@/config/palette';
import { BootScene } from '@/scenes/BootScene';
import { CursorScene } from '@/scenes/CursorScene';
import { TitleScene } from '@/scenes/TitleScene';
import { CaseSelectScene } from '@/scenes/CaseSelectScene';
import { InvestigationScene } from '@/scenes/InvestigationScene';
import { ReportScene } from '@/scenes/ReportScene';
import { NotebookScene } from '@/scenes/NotebookScene';
import { SettingsScene } from '@/scenes/SettingsScene';
import { audio } from '@/systems/audio';
import { caseById, gameState } from '@/systems/gameState';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  // Not pixelArt mode: sprite textures are set to NEAREST individually so text stays smooth.
  pixelArt: false,
  roundPixels: true,
  backgroundColor: PALETTE.bg,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  },
  render: { antialias: true, antialiasGL: true },
  input: { keyboard: true, mouse: { preventDefaultWheel: true } },
  scene: [
    BootScene,
    CursorScene,
    TitleScene,
    CaseSelectScene,
    InvestigationScene,
    ReportScene,
    NotebookScene,
    SettingsScene,
  ],
});

// Audio can only start after a user gesture; listen globally so any first click counts.
const unlockAudio = () => audio.unlock();
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);

// Fullscreen toggle (F) works from any scene; browsers require a user gesture.
export function toggleFullscreen(): void {
  if (!document.fullscreenEnabled) return;
  try {
    if (game.scale.isFullscreen) game.scale.stopFullscreen();
    else game.scale.startFullscreen();
  } catch {
    /* browser refused (no gesture / iframe); nothing to do */
  }
}
window.addEventListener('keydown', (e) => {
  if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey) toggleFullscreen();
});

if (import.meta.env.DEV) {
  // Handy for poking at scenes from the devtools console:
  //   __debug.startCase('kelp')  jumps straight into a case.
  const w = window as unknown as { __game: Phaser.Game; __debug: { startCase(id: string): void } };
  w.__game = game;
  w.__debug = {
    startCase(id: string) {
      const c = caseById(id);
      if (!c) throw new Error(`unknown case ${id}`);
      gameState.mode = 'campaign';
      gameState.currentCase = c;
      gameState.currentIndex = gameState.cases.indexOf(c);
      const active = game.scene.getScenes(true).find((s) => s.scene.key !== 'CursorScene');
      (active ?? game.scene.getScene('TitleScene')).scene.start('InvestigationScene');
    },
  };
}
