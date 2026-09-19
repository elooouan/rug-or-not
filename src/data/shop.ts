import type { PaletteKey } from '@/config/palette';

/**
 * The market: things to buy with clips (the desk's own currency, see
 * src/systems/clips.ts). Every item is dressing: a coat or hat on Lucien, a mug, the cat's
 * coat, an ornament, curtains, the radio's colour. Nothing here scores differently or
 * opens content, and nothing costs real money: clips come from closing files, and holding
 * the coin adds an allowance on top (read-only balance, never a transaction).
 */
export type ShopSlot =
  'coat' | 'hat' | 'mug' | 'cat' | 'collar' | 'ornament' | 'curtains' | 'radio';

/** Recolour target for Lucien's trench and hat: hue in degrees, saturation and lightness multipliers. */
export interface Tint {
  hue: number;
  sat: number;
  light: number;
}

export type OrnamentKind = 'none' | 'plant' | 'trophy' | 'globe' | 'fishbowl' | 'skull' | 'bobble';

export type ShopStyle =
  | { slot: 'coat'; tint: Tint | null }
  | { slot: 'hat'; tint: Tint | null }
  | { slot: 'mug'; body: PaletteKey; band: PaletteKey }
  | { slot: 'cat'; fur: PaletteKey; dark: PaletteKey; eye: PaletteKey }
  | { slot: 'collar'; color: PaletteKey | null }
  | { slot: 'ornament'; kind: OrnamentKind }
  | { slot: 'curtains'; color: PaletteKey | null }
  | { slot: 'radio'; body: PaletteKey; dark: PaletteKey };

export interface ShopItem {
  id: string;
  name: string;
  /** One line under the name. */
  blurb: string;
  /** In clips. Zero means it comes with the desk. */
  price: number;
  /** Needs this holder tier (see src/systems/entitlements.ts) as well as the price. */
  tier?: 1 | 2 | 3;
  style: ShopStyle;
}

const coat = (tint: Tint | null): ShopStyle => ({ slot: 'coat', tint });
const hat = (tint: Tint | null): ShopStyle => ({ slot: 'hat', tint });

export const SHOP: ShopItem[] = [
  // Lucien's coats
  {
    id: 'coat-tan',
    name: 'Tan trench',
    blurb: 'The coat he came in.',
    price: 0,
    style: coat(null),
  },
  {
    id: 'coat-navy',
    name: 'Navy trench',
    blurb: 'For nights that need a darker silhouette.',
    price: 80,
    style: coat({ hue: 222, sat: 0.9, light: 0.72 }),
  },
  {
    id: 'coat-charcoal',
    name: 'Charcoal trench',
    blurb: 'Barely there against the wall.',
    price: 80,
    style: coat({ hue: 260, sat: 0.12, light: 0.62 }),
  },
  {
    id: 'coat-oxblood',
    name: 'Oxblood trench',
    blurb: 'A coat that has seen things.',
    price: 100,
    style: coat({ hue: 352, sat: 0.85, light: 0.8 }),
  },
  {
    id: 'coat-forest',
    name: 'Forest trench',
    blurb: 'Blends in with the lamp shade.',
    price: 100,
    style: coat({ hue: 135, sat: 0.6, light: 0.72 }),
  },
  {
    id: 'coat-cream',
    name: 'Cream trench',
    blurb: 'Impossible to keep clean. He tries.',
    price: 120,
    style: coat({ hue: 42, sat: 0.55, light: 1.3 }),
  },
  {
    id: 'coat-boardroom',
    name: "Board member's coat",
    blurb: 'Coin-gold lining. For holders of standing.',
    price: 150,
    tier: 3,
    style: coat({ hue: 44, sat: 1, light: 1.05 }),
  },
  // Hats
  {
    id: 'hat-brown',
    name: 'Brown fedora',
    blurb: 'The hat he came in.',
    price: 0,
    style: hat(null),
  },
  {
    id: 'hat-black',
    name: 'Black fedora',
    blurb: 'Classic. Slightly menacing.',
    price: 60,
    style: hat({ hue: 0, sat: 0.1, light: 0.4 }),
  },
  {
    id: 'hat-red',
    name: 'Case-closed red',
    blurb: 'Matches the stamp.',
    price: 60,
    style: hat({ hue: 2, sat: 0.95, light: 0.85 }),
  },
  {
    id: 'hat-grey',
    name: 'Fog grey',
    blurb: 'Disappears in the weather.',
    price: 50,
    style: hat({ hue: 215, sat: 0.12, light: 1.1 }),
  },
  {
    id: 'hat-green',
    name: 'Banker green',
    blurb: 'On loan from the lamp.',
    price: 50,
    style: hat({ hue: 140, sat: 0.55, light: 0.78 }),
  },
  {
    id: 'hat-gold',
    name: 'Coin-gold fedora',
    blurb: 'Shareholders only.',
    price: 90,
    tier: 1,
    style: hat({ hue: 46, sat: 1, light: 1.1 }),
  },
  // Mugs
  {
    id: 'mug-office',
    name: 'Office mug',
    blurb: 'Chipped. Loved.',
    price: 0,
    style: { slot: 'mug', body: 'paper', band: 'woodDark' },
  },
  {
    id: 'mug-ink',
    name: 'Ink mug',
    blurb: 'Blue, like the pins that go nowhere.',
    price: 25,
    style: { slot: 'mug', body: 'ink', band: 'paper' },
  },
  {
    id: 'mug-red',
    name: 'RUG mug',
    blurb: 'Stamp red. Coffee still black.',
    price: 30,
    style: { slot: 'mug', body: 'stampRed', band: 'paper' },
  },
  {
    id: 'mug-night',
    name: 'Night-shift mug',
    blurb: 'Dark with an amber band. Holds more, allegedly.',
    price: 40,
    style: { slot: 'mug', body: 'shadow', band: 'amber' },
  },
  // Biscuit's coat
  {
    id: 'cat-biscuit',
    name: 'Biscuit',
    blurb: 'The cat. She is not for sale; her coat is.',
    price: 0,
    style: { slot: 'cat', fur: 'woodDark', dark: 'shadow', eye: 'amber' },
  },
  {
    id: 'cat-soot',
    name: 'Soot',
    blurb: 'A black cat on a night shift. Naturally.',
    price: 60,
    style: { slot: 'cat', fur: 'shadow', dark: 'bg', eye: 'amber' },
  },
  {
    id: 'cat-marmalade',
    name: 'Marmalade',
    blurb: 'Orange, loud, unbothered.',
    price: 60,
    style: { slot: 'cat', fur: 'amber', dark: 'woodDark', eye: 'lampGreen' },
  },
  {
    id: 'cat-snow',
    name: 'Snow',
    blurb: 'White fur, blue eyes, zero respect for paperwork.',
    price: 80,
    style: { slot: 'cat', fur: 'paper', dark: 'paperShadow', eye: 'ink' },
  },
  // Biscuit's collar
  {
    id: 'col-none',
    name: 'No collar',
    blurb: 'She answers to nobody anyway.',
    price: 0,
    style: { slot: 'collar', color: null },
  },
  {
    id: 'col-bow',
    name: 'Red bow',
    blurb: 'Stamp red. She tolerates it.',
    price: 35,
    style: { slot: 'collar', color: 'stampRed' },
  },
  {
    id: 'col-ink',
    name: 'Ink collar',
    blurb: 'Blue, with a tag that says "no".',
    price: 30,
    style: { slot: 'collar', color: 'ink' },
  },
  {
    id: 'col-bell',
    name: 'Brass bell',
    blurb: 'You will hear her coming. She hates that.',
    price: 40,
    style: { slot: 'collar', color: 'amber' },
  },
  // Desk ornaments
  {
    id: 'orn-none',
    name: 'Clear desk',
    blurb: 'Nothing on the corner. Room to think.',
    price: 0,
    style: { slot: 'ornament', kind: 'none' },
  },
  {
    id: 'orn-plant',
    name: 'Potted plant',
    blurb: 'Alive, somehow.',
    price: 30,
    style: { slot: 'ornament', kind: 'plant' },
  },
  {
    id: 'orn-trophy',
    name: 'Little trophy',
    blurb: '"Most Wanted, Least Caught". A joke gift.',
    price: 45,
    style: { slot: 'ornament', kind: 'trophy' },
  },
  {
    id: 'orn-globe',
    name: 'Desk globe',
    blurb: 'Every rug in the world, spun.',
    price: 50,
    style: { slot: 'ornament', kind: 'globe' },
  },
  {
    id: 'orn-fishbowl',
    name: 'Fish bowl',
    blurb: 'One fish. Named Liquidity. Locked in.',
    price: 55,
    style: { slot: 'ornament', kind: 'fishbowl' },
  },
  {
    id: 'orn-skull',
    name: 'Paperweight skull',
    blurb: 'Memento rug.',
    price: 70,
    style: { slot: 'ornament', kind: 'skull' },
  },
  {
    id: 'orn-bobble',
    name: 'Lucien bobblehead',
    blurb: 'Nods at everything. Partners only.',
    price: 90,
    tier: 2,
    style: { slot: 'ornament', kind: 'bobble' },
  },
  // Curtains
  {
    id: 'cur-none',
    name: 'Bare window',
    blurb: 'The city, unframed.',
    price: 0,
    style: { slot: 'curtains', color: null },
  },
  {
    id: 'cur-velvet',
    name: 'Velvet curtains',
    blurb: 'Stamp red. Very cinema.',
    price: 45,
    style: { slot: 'curtains', color: 'stampRed' },
  },
  {
    id: 'cur-ink',
    name: 'Ink curtains',
    blurb: 'Blue hour, all night.',
    price: 45,
    style: { slot: 'curtains', color: 'ink' },
  },
  {
    id: 'cur-cream',
    name: 'Cream curtains',
    blurb: 'They were white once.',
    price: 40,
    style: { slot: 'curtains', color: 'paperShadow' },
  },
  // Radio
  {
    id: 'radio-bakelite',
    name: 'Bakelite radio',
    blurb: 'Brown, warm, picks up a numbers station.',
    price: 0,
    style: { slot: 'radio', body: 'woodMid', dark: 'woodDark' },
  },
  {
    id: 'radio-ink',
    name: 'Ink radio',
    blurb: 'Same stations, bluer box.',
    price: 40,
    style: { slot: 'radio', body: 'ink', dark: 'bg' },
  },
  {
    id: 'radio-cherry',
    name: 'Cherry radio',
    blurb: 'Loud even when it is off.',
    price: 40,
    style: { slot: 'radio', body: 'stampRed', dark: 'shadow' },
  },
];

export const SHOP_SLOTS: { id: ShopSlot; name: string }[] = [
  { id: 'coat', name: "Lucien's coat" },
  { id: 'hat', name: "Lucien's hat" },
  { id: 'cat', name: "Biscuit's coat" },
  { id: 'collar', name: "Biscuit's collar" },
  { id: 'ornament', name: 'Desk ornament' },
  { id: 'mug', name: 'Mug' },
  { id: 'curtains', name: 'Curtains' },
  { id: 'radio', name: 'Radio' },
];

export const SHOP_BY_ID: Record<string, ShopItem> = Object.fromEntries(SHOP.map((i) => [i.id, i]));

/** What every desk starts with: the free item of each slot. */
export const DEFAULT_LOOK: Record<ShopSlot, string> = {
  coat: 'coat-tan',
  hat: 'hat-brown',
  mug: 'mug-office',
  cat: 'cat-biscuit',
  collar: 'col-none',
  ornament: 'orn-none',
  curtains: 'cur-none',
  radio: 'radio-bakelite',
};

export function itemsFor(slot: ShopSlot): ShopItem[] {
  return SHOP.filter((i) => i.style.slot === slot);
}
