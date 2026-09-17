import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '@/config/layout';
import { PALETTE } from '@/config/palette';
import { BootScene } from '@/scenes/BootScene';
import { CursorScene } from '@/scenes/CursorScene';
import { TitleScene } from '@/scenes/TitleScene';
import { CaseSelectScene } from '@/scenes/CaseSelectScene';
import { InvestigationScene } from '@/scenes/InvestigationScene';
import { ReportScene } from '@/scenes/ReportScene';
import { NotebookScene } from '@/scenes/NotebookScene';
import { SettingsScene } from '@/scenes/SettingsScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: PALETTE.bg,
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  render: { antialias: false, antialiasGL: false },
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

/** Integer scaling: the 640x360 canvas grows by whole multiples and is letterboxed. */
function fit(): void {
  const zoom = Math.max(
    1,
    Math.floor(Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT)),
  );
  game.scale.setZoom(zoom);
}
window.addEventListener('resize', fit);
fit();

if (import.meta.env.DEV) {
  // Handy for poking at scenes from the devtools console.
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
