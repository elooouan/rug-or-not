import type Phaser from 'phaser';
import { applyTheme, currentTheme } from '@/config/palette';
import { repaintTextures } from '@/art';
import { applyCosmetics } from './cosmetics';
import { saveStore } from './save';

/**
 * Bring the live palette and every generated texture in line with the saved
 * theme. Safe only when no running scene still shows the old textures: the
 * title's create() (nothing else is up) and a settings page just restarted.
 * The cursor overlay stays up and is pointed at the redrawn lens and pointer.
 */
export function syncTheme(scene: Phaser.Scene): boolean {
  const wanted = saveStore.get().settings.theme;
  if (currentTheme() === wanted) return false;
  applyTheme(wanted);
  repaintTextures(scene);
  applyCosmetics(scene, saveStore.get().cosmetics);
  (scene.scene.get('CursorScene') as { retexture?: () => void } | null)?.retexture?.();
  return true;
}
