/** Display depths so scenes never fight over z-order. */
export const DEPTH = {
  wood: 0,
  windowRain: 1,
  deskProps: 2,
  folderStack: 3,
  documents: 10,
  pins: 12,
  notebook: 14,
  stamps: 16,
  stampAnim: 20,
  light: 50,
  vignette: 51,
  hud: 60,
  overlay: 80,
  toast: 90,
} as const;
