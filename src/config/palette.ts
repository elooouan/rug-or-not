/**
 * The only colours the game may use. Every sprite, text style and overlay
 * pulls from here so the noir mood stays consistent and swapping palettes
 * later is a one-file change.
 */
export const PALETTE = {
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

export type PaletteKey = keyof typeof PALETTE;

/** Numeric form of the palette for Phaser Graphics / tint calls. */
export const HEX: Record<PaletteKey, number> = Object.fromEntries(
  (Object.keys(PALETTE) as PaletteKey[]).map((k) => [k, parseInt(PALETTE[k].slice(1), 16)]),
) as Record<PaletteKey, number>;

export function rgb(key: PaletteKey): [number, number, number] {
  const v = HEX[key];
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}
