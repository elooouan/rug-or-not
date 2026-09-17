import type { Grade, Rank } from '@/config/gameConfig';
import type { PaletteKey } from '@/config/palette';
import { TOKEN } from '@/config/token';

/**
 * Unlock sources are a tagged union so new kinds (achievements, seasonal, ...)
 * can be added by extending this type and registering a resolver in
 * src/systems/unlocks.ts. Nothing here may affect gameplay or scoring.
 */
export type UnlockSource =
  | { type: 'always' }
  | { type: 'rank'; value: Rank }
  | { type: 'casesCompleted'; value: number }
  | { type: 'grade'; value: { grade: Grade; count: number } }
  | { type: 'streak'; value: number }
  | { type: 'flagsLearned'; value: number }
  /** Holds at least this many of the game's coin (see src/config/token.ts). */
  | { type: 'holder'; value: number };

export type UnlockCategory = 'desk' | 'lamp' | 'rim' | 'ink';

export interface WoodStyleData {
  dark: PaletteKey;
  mid: PaletteKey;
  light: PaletteKey;
}
export interface LampStyleData {
  shade: PaletteKey;
}
export interface RimStyleData {
  rim: PaletteKey;
  rimDark: PaletteKey;
  handle: PaletteKey;
}
export interface InkStyleData {
  rug: PaletteKey;
  legit: PaletteKey;
}

export type UnlockStyle =
  | { category: 'desk'; style: WoodStyleData }
  | { category: 'lamp'; style: LampStyleData }
  | { category: 'rim'; style: RimStyleData }
  | { category: 'ink'; style: InkStyleData };

export type Unlockable = UnlockStyle & {
  id: string;
  name: string;
  description: string;
  source: UnlockSource;
};

export const UNLOCKABLES: Unlockable[] = [
  // Desk wood
  {
    id: 'wood-classic',
    category: 'desk',
    name: 'Walnut desk',
    description: 'The desk you started with.',
    source: { type: 'always' },
    style: { dark: 'woodDark', mid: 'woodMid', light: 'woodLight' },
  },
  {
    id: 'wood-ebony',
    category: 'desk',
    name: 'Ebony desk',
    description: 'Darker wood for darker nights.',
    source: { type: 'casesCompleted', value: 3 },
    style: { dark: 'bg', mid: 'shadow', light: 'woodDark' },
  },
  {
    id: 'wood-maple',
    category: 'desk',
    name: 'Maple desk',
    description: 'A lighter, warmer surface.',
    source: { type: 'rank', value: 'Inspector' },
    style: { dark: 'woodMid', mid: 'woodLight', light: 'paperShadow' },
  },
  // Lamp shades
  {
    id: 'lamp-green',
    category: 'lamp',
    name: "Banker's green",
    description: 'The classic shade.',
    source: { type: 'always' },
    style: { shade: 'lampGreen' },
  },
  {
    id: 'lamp-blue',
    category: 'lamp',
    name: 'Ink blue shade',
    description: 'Earned by reaching Gumshoe.',
    source: { type: 'rank', value: 'Gumshoe' },
    style: { shade: 'ink' },
  },
  {
    id: 'lamp-red',
    category: 'lamp',
    name: 'Case-closed red',
    description: 'Five S-grade cases.',
    source: { type: 'grade', value: { grade: 'S', count: 5 } },
    style: { shade: 'stampRed' },
  },
  // Magnifier rims
  {
    id: 'rim-brass',
    category: 'rim',
    name: 'Brass rim',
    description: 'Standard issue.',
    source: { type: 'always' },
    style: { rim: 'amber', rimDark: 'woodDark', handle: 'woodDark' },
  },
  {
    id: 'rim-silver',
    category: 'rim',
    name: 'Silver rim',
    description: 'Learn 8 red flags in the notebook.',
    source: { type: 'flagsLearned', value: 8 },
    style: { rim: 'paper', rimDark: 'shadow', handle: 'ink' },
  },
  {
    id: 'rim-ink',
    category: 'rim',
    name: 'Ink rim',
    description: 'Keep a 3-day daily streak.',
    source: { type: 'streak', value: 3 },
    style: { rim: 'ink', rimDark: 'bg', handle: 'woodMid' },
  },
  {
    id: 'rim-gold',
    category: 'rim',
    name: 'Gilded rim',
    description: 'For coin holders.',
    source: { type: 'holder', value: TOKEN.holderMin },
    style: { rim: 'amber', rimDark: 'stampRed', handle: 'amber' },
  },
  // Stamp ink
  {
    id: 'ink-classic',
    category: 'ink',
    name: 'Classic ink',
    description: 'Red RUG, green LEGIT.',
    source: { type: 'always' },
    style: { rug: 'stampRed', legit: 'stampGreen' },
  },
  {
    id: 'ink-noir',
    category: 'ink',
    name: 'Noir ink',
    description: 'Reach Chief Inspector.',
    source: { type: 'rank', value: 'Chief Inspector' },
    style: { rug: 'shadow', legit: 'ink' },
  },
];
