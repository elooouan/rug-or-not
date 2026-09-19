import type Phaser from 'phaser';
import { applyTheme, currentTheme } from '@/config/palette';
import { repaintTextures } from '@/art';
import { applyCosmetics } from './cosmetics';
import { saveStore } from './save';
import { applyLook, lookOutOfDate, markLookStale } from './wardrobe';

/**
 * Bring the live palette and every generated texture in line with the saved
 * theme, and the desk's dressing with the market. Safe only when no running scene
 * still shows the old textures: the title's create() (nothing else is up) and a
 * settings page just restarted. The cursor overlay stays up and is pointed at the
 * redrawn lens and pointer.
 */
export function syncTheme(scene: Phaser.Scene): boolean {
  const wanted = saveStore.get().settings.theme;
  let changed = false;
  if (currentTheme() !== wanted) {
    applyTheme(wanted);
    repaintTextures(scene);
    applyCosmetics(scene, saveStore.get().cosmetics); // also re-points the cursor overlay
    markLookStale();
    changed = true;
  }
  if (lookOutOfDate()) {
    applyLook(scene);
    changed = true;
  }
  return changed;
}
