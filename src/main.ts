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
import { HistoryScene } from '@/scenes/HistoryScene';
import { audio } from '@/systems/audio';
import { overlayDepth } from '@/ui/escGuard';
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
  // Dev only: keep the loop stepping in a background tab so automated checks don't stall.
  fps: import.meta.env.DEV ? { forceSetTimeOut: true, target: 60 } : undefined,
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
    HistoryScene,
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
  const w = window as unknown as {
    __game: Phaser.Game;
    __debug: {
      startCase(id: string): void;
      audioLevels(): Promise<Record<string, number>>;
      musicLevel(): Promise<{ peak: number; rms: number }>;
      overlays(): number;
      snapshot(name: string): Promise<string>;
    };
  };
  w.__game = game;
  w.__debug = {
    /** Render every SFX (and a few bars of music) offline and report peak levels. */
    async audioLevels(): Promise<Record<string, number>> {
      const { AudioManager } = await import('@/systems/audio');
      const names = [
        'ui',
        'hover',
        'pin',
        'unpin',
        'tick',
        'tally',
        'click',
        'paper',
        'slide',
        'stamp',
        'correct',
        'caseClosed',
        'wrong',
        'unlock',
        'sip',
        'meow',
        'thunder',
      ] as const;
      const out: Record<string, number> = {};
      for (const name of names) {
        const ctx = new OfflineAudioContext(1, 44100 * 2, 44100);
        const m = new AudioManager();
        m.setMusic(false);
        m.setRain(false);
        m.unlock(ctx);
        m.setVolume(1);
        m.play(name);
        const buf = await ctx.startRendering();
        const d = buf.getChannelData(0);
        let peak = 0;
        for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
        out[name] = Math.round(peak * 1000) / 1000;
      }
      return out;
    },
    /** Peak and RMS of four seconds of the lo-fi loop, rendered offline. */
    async musicLevel(): Promise<{ peak: number; rms: number }> {
      const { AudioManager } = await import('@/systems/audio');
      const ctx = new OfflineAudioContext(1, 44100 * 4, 44100);
      const m = new AudioManager();
      m.setRain(false);
      m.setMusic(true);
      m.unlock(ctx);
      m.setVolume(1);
      // The scheduler runs on wall-clock intervals; offline rendering needs the steps queued up front.
      const mm = m as unknown as {
        playStep(step: number, t: number): void;
        sixteenth: number;
        stopMusic(): void;
        musicTimer: number | null;
      };
      if (mm.musicTimer !== null) window.clearInterval(mm.musicTimer);
      mm.musicTimer = null;
      const steps = Math.ceil(4 / mm.sixteenth);
      for (let i = 0; i < steps; i++) mm.playStep(i, i * mm.sixteenth);
      const buf = await ctx.startRendering();
      const d = buf.getChannelData(0);
      let peak = 0;
      let sum = 0;
      for (let i = 0; i < d.length; i++) {
        peak = Math.max(peak, Math.abs(d[i]));
        sum += d[i] * d[i];
      }
      return {
        peak: Math.round(peak * 1000) / 1000,
        rms: Math.round(Math.sqrt(sum / d.length) * 1000) / 1000,
      };
    },
    overlays: () => overlayDepth(),
    /**
     * Photograph the current frame at 480x270 for the history wall. With the
     * snapshot dev server (scripts/photograph.sh) it saves straight into
     * public/img/history/; otherwise it downloads the JPEG.
     */
    async snapshot(name: string): Promise<string> {
      const src = await new Promise<string>((resolve) =>
        game.renderer.snapshot((img) => resolve((img as HTMLImageElement).src)),
      );
      const im = new Image();
      im.src = src;
      await new Promise((r) => (im.onload = r));
      const c = document.createElement('canvas');
      c.width = 480;
      c.height = 270;
      const ctx = c.getContext('2d') as CanvasRenderingContext2D;
      ctx.imageSmoothingEnabled = im.width > 640;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(im, 0, 0, 480, 270);
      const dataUrl = c.toDataURL('image/jpeg', 0.88);
      try {
        const res = await fetch('/__snapshot', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ name, dataUrl }),
        });
        if (res.ok) return await res.text();
      } catch {
        /* no snapshot server: fall through to a download */
      }
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${name}.jpg`;
      a.click();
      return 'downloaded';
    },
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
