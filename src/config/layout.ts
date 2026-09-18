/**
 * Every layout number lives here. Scenes and UI classes must not invent
 * their own magic offsets.
 */
export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 360;

/**
 * The world is 640x360 pixel-art units, but the canvas is rendered at this
 * multiple (camera zoom) so text can be rasterised sharply while sprites keep
 * their chunky pixels. Retina screens get 3x, everything else 2x.
 */
export const RENDER_SCALE = typeof window !== 'undefined' && window.devicePixelRatio >= 2 ? 3 : 2;
export const CANVAS_WIDTH = GAME_WIDTH * RENDER_SCALE;
export const CANVAS_HEIGHT = GAME_HEIGHT * RENDER_SCALE;

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
  corkboard: { x: 526, y: -6, w: 120, h: 44 },
  window: { x: 124, y: 0, w: 396, h: 50 },
  /** The cat sits on the windowsill, right end. */
  cat: { x: 474, y: 46 },
  caseHeader: { x: 632, y: 38 },
  phone: { x: 118, y: 296 },
  safe: { x: 70, y: 314 },
  radio: { x: 24, y: 108 },
  clock: { x: 104, y: 214 },
  inkPad: { x: 516, y: 300 },
  stampRug: { x: 520, y: 262 },
  stampLegit: { x: 586, y: 262 },
} as const;

export const PAPER = {
  x: 160,
  y: 48,
  w: 316,
  h: 296,
  padding: 12,
  shadowOffset: 4,
  /** Line height for body text on documents. */
  lineHeight: 12,
  titleHeight: 20,
} as const;

export const TABS = {
  x: PAPER.x + 6,
  y: PAPER.y - 16,
  /** Maximum tab width; narrower when a case has many documents. */
  w: 58,
  h: 20,
  gap: 3,
  /** Tabs must fit inside the paper minus this margin on both sides. */
  margin: 6,
} as const;

export const NOTEBOOK = {
  x: 490,
  y: 54,
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
  pauseH: 176,
} as const;

export const DIALOGUE = {
  x: 84,
  y: 290,
  w: 548,
  h: 62,
  padding: 8,
  /** Lucien stands to the left of the box, feet on this baseline. */
  mascot: { x: 10, y: 358, height: 72 },
  typeSpeedMs: 16,
  textWidth: 470,
} as const;

/** Filing-cabinet drawer on the case select screen: six folders per row. */
export const DRAWER = {
  x: 40,
  y: 60,
  w: 560,
  h: 250,
  cols: 6,
  folderW: 80,
  folderH: 56,
  gapX: 8,
  gapY: 40,
} as const;

/** The evidence wall (history storyboard). */
export const WALL = {
  cols: 5,
  thumbW: 96,
  thumbH: 54,
  frame: 4,
  frameBottom: 15,
  x0: 24,
  y0: 30,
  dx: 120,
  dy: 90,
  /** Odd rows shift right so the string zig-zags. */
  stagger: 14,
  bigW: 400,
  bigH: 225,
  /** Wheel scrolling kicks in past this many rows. */
  visibleRows: 3,
} as const;

export const BROWSER = {
  x: 80,
  y: 24,
  w: 480,
  h: 304,
  titleH: 14,
  toolbarH: 18,
  padding: 10,
  lineH: 13,
} as const;

export const REPORT = {
  x: 110,
  y: 22,
  w: 420,
  h: 318,
  typeSpeedMs: 6,
} as const;
