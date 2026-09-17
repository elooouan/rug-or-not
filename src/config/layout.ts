/**
 * Every layout number lives here. Scenes and UI classes must not invent
 * their own magic offsets.
 */
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

export const FONT = {
  ui: 'Pixelify Sans',
  body: 'VT323',
  /** Sizes are integers so the pixel fonts stay on their grid. */
  size: {
    tiny: 8,
    small: 10,
    body: 12,
    bodyLarge: 16,
    heading: 20,
    title: 32,
    /** Fine print is rendered at this size and only legible through the 2x lens. */
    finePrint: 8,
  },
} as const;

export const DESK = {
  lamp: { x: 8, y: 0 },
  lightCenter: { x: 330, y: 190 },
  lightRadius: 330,
  mug: { x: 30, y: 176 },
  folderStack: { x: 14, y: 232 },
  corkboard: { x: 500, y: -8, w: 150, h: 46 },
  window: { x: 150, y: -2, w: 330, h: 26 },
  clock: { x: 104, y: 214 },
  inkPad: { x: 516, y: 300 },
  stampRug: { x: 520, y: 262 },
  stampLegit: { x: 586, y: 262 },
} as const;

export const PAPER = {
  x: 160,
  y: 38,
  w: 316,
  h: 306,
  padding: 12,
  shadowOffset: 4,
  /** Line height for body text on documents. */
  lineHeight: 12,
  titleHeight: 20,
} as const;

export const TABS = {
  x: PAPER.x + 6,
  y: PAPER.y - 16,
  w: 58,
  h: 20,
  gap: 3,
} as const;

export const NOTEBOOK = {
  x: 490,
  y: 44,
  w: 142,
  h: 196,
  padding: 8,
  lineHeight: 12,
  maxLines: 12,
} as const;

export const FOLDER_CARD = {
  x: 190,
  y: 84,
  w: 260,
  h: 180,
} as const;

export const LENS = {
  radius: 48,
  zoom: 2,
  /** How far the cursor sprite's hotspot sits from its texture origin. */
  cursorHotspot: { x: 8, y: 8 },
} as const;

export const STAMP = {
  w: 56,
  h: 44,
  /** Where the impression lands on the paper when stamped. */
  impression: { x: PAPER.x + PAPER.w / 2, y: PAPER.y + PAPER.h / 2 },
  shakeDurationMs: 140,
  shakeIntensity: 0.006,
} as const;

export const UI = {
  buttonH: 18,
  buttonPadX: 8,
  focusRingPad: 2,
  pauseW: 220,
  pauseH: 150,
} as const;

export const REPORT = {
  x: 110,
  y: 22,
  w: 420,
  h: 318,
  typeSpeedMs: 14,
} as const;
