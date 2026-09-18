/**
 * A light gate for the six-letter arcade handle on the board. Not a full
 * moderation system: it catches the obvious words people type into arcade
 * name fields and nothing subtler. The worker mirrors the same list.
 */
const BLOCKED = [
  'FUCK',
  'SHIT',
  'CUNT',
  'NIGG',
  'FAGG',
  'KIKE',
  'SPIC',
  'RAPE',
  'NAZI',
  'HITLER',
  'PENIS',
  'VAGIN',
  'DICK',
  'COCK',
  'WHORE',
  'SLUT',
  'RETARD',
];

/** True when the handle is fit for a public board. */
export function isNameAllowed(name: string): boolean {
  const flat = name.toUpperCase().replace(/[^A-Z]/g, '');
  const leet = name
    .toUpperCase()
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/3/g, 'E')
    .replace(/4/g, 'A')
    .replace(/5/g, 'S')
    .replace(/[^A-Z]/g, '');
  return !BLOCKED.some((w) => flat.includes(w) || leet.includes(w));
}
