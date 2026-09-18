/**
 * The only colours the game may use. Every sprite, text style and overlay
 * pulls from here so the noir mood stays consistent, and a theme is just a
 * different set of values for the same keys (see THEMES / applyTheme).
 */
const NOIR = {
  bg: '#1b1a1f', // near-black background / vignette
  shadow: '#2b2530', // deep shadow
  woodDark: '#4a3a2f', // desk wood dark
  woodMid: '#6b5140', // desk wood mid
  woodLight: '#8c6d52', // desk wood highlight
  paper: '#d8c9a8', // paper cream
  paperShadow: '#b8a88a', // paper shadow
  lampGreen: '#3f5a4a', // banker's lamp green
  amber: '#e0b566', // warm lamp glow / amber accents
  ink: '#5b6f8a', // ink blue (text highlights, links)
  stampRed: '#9a3b3b', // muted stamp red (RUG)
  stampGreen: '#4f7a5a', // muted stamp green (LEGIT)
  phantom: '#ab9ff2', // Phantom's lavender: the wallet mark only, nowhere else
} as const;

export type PaletteKey = keyof typeof NOIR;

/** Live palette: the current theme's colours, read at draw time everywhere. */
export const PALETTE: Record<PaletteKey, string> = { ...NOIR };

/** Numeric form of the palette for Phaser Graphics / tint calls. */
export const HEX: Record<PaletteKey, number> = Object.fromEntries(
  (Object.keys(NOIR) as PaletteKey[]).map((k) => [k, parseInt(NOIR[k].slice(1), 16)]),
) as Record<PaletteKey, number>;

export function rgb(key: PaletteKey): [number, number, number] {
  const v = HEX[key];
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

export type ThemeId = 'noir' | 'sepia' | 'midnight' | 'newsprint' | 'speakeasy';
export const THEME_IDS: ThemeId[] = ['noir', 'sepia', 'midnight', 'newsprint', 'speakeasy'];

/**
 * Office colours. Stamp reds and greens stay recognisable in every theme; the
 * wood, the paper, the lamp and the ink are what change.
 */
export const THEMES: Record<
  ThemeId,
  { name: string; colors: Partial<Record<PaletteKey, string>> }
> = {
  noir: { name: 'Noir', colors: {} },
  sepia: {
    name: 'Old file',
    colors: {
      bg: '#1f1811',
      shadow: '#35281d',
      woodDark: '#5c4232',
      woodMid: '#7f5b41',
      woodLight: '#a37c58',
      paper: '#e8d7b4',
      paperShadow: '#c7b08a',
      lampGreen: '#55603c',
      amber: '#ecc070',
      ink: '#7a5c3a',
      stampRed: '#a34141',
      stampGreen: '#5e7d4c',
    },
  },
  midnight: {
    name: 'Blue hour',
    colors: {
      bg: '#10131b',
      shadow: '#1d2230',
      woodDark: '#364059',
      woodMid: '#4a5674',
      woodLight: '#667394',
      paper: '#d3dae6',
      paperShadow: '#a8b3c8',
      lampGreen: '#3a6b5e',
      amber: '#e3c777',
      ink: '#4f79b8',
      stampRed: '#a9485a',
      stampGreen: '#4d8f70',
    },
  },
  newsprint: {
    name: 'Newsprint',
    colors: {
      bg: '#161616',
      shadow: '#282828',
      woodDark: '#3f3f3f',
      woodMid: '#5a5a5a',
      woodLight: '#767676',
      paper: '#e2e1da',
      paperShadow: '#bcbbb2',
      lampGreen: '#4d5c52',
      amber: '#dcc48c',
      ink: '#5c6f86',
      stampRed: '#a03c3c',
      stampGreen: '#4f7e5c',
    },
  },
  speakeasy: {
    name: 'Speakeasy',
    colors: {
      bg: '#0f1a15',
      shadow: '#1b2c24',
      woodDark: '#3d3226',
      woodMid: '#5c4a36',
      woodLight: '#7d664b',
      paper: '#dfd3ad',
      paperShadow: '#bcae88',
      lampGreen: '#2f6b52',
      amber: '#e0b866',
      ink: '#4f7f7a',
      stampRed: '#a03b3b',
      stampGreen: '#4f8a5a',
    },
  },
};

let current: ThemeId = 'noir';

/** The theme the palette currently holds (textures were drawn with it). */
export function currentTheme(): ThemeId {
  return current;
}

/** Swap the live colours. Textures drawn before this keep the old ones: repaint after. */
export function applyTheme(id: ThemeId): void {
  current = THEMES[id] ? id : 'noir';
  Object.assign(PALETTE, NOIR, THEMES[current].colors);
  for (const k of Object.keys(NOIR) as PaletteKey[]) HEX[k] = parseInt(PALETTE[k].slice(1), 16);
}
