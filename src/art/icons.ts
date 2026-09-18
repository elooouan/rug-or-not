import type Phaser from 'phaser';
import { TEX } from './keys';
import { drawPixels, makeGraphicsTexture } from './pixelUtil';

export function makeIcons(scene: Phaser.Scene): void {
  // Phantom's ghost on its lavender tile, redrawn at desk resolution for the wallet buttons.
  makeGraphicsTexture(scene, TEX.iconPhantom, 14, 14, (g) =>
    drawPixels(
      g,
      [
        '.llllllllllll.',
        'llllllllllllll',
        'llllwwwwwwllll',
        'lllwwwwwwwwlll',
        'llwwwwwwwwwwll',
        'llwwwkwwwkwwll',
        'llwwwkwwwkwwll',
        'llwwwwwwwwwwll',
        'llwwwwwwwwwwll',
        'llwwwwwwwwwwll',
        'lllwwlwwwwlwll',
        'llllllllllllll',
        'llllllllllllll',
        '.llllllllllll.',
      ],
      { l: 'phantom', w: 'paper', k: 'shadow' },
    ),
  );
  makeGraphicsTexture(scene, TEX.iconCheck, 9, 9, (g) =>
    drawPixels(
      g,
      [
        '.........',
        '.......gg',
        '......gg.',
        '.....gg..',
        'gg..gg...',
        '.gggg....',
        '..gg.....',
        '.........',
        '.........',
      ],
      { g: 'stampGreen' },
    ),
  );
  makeGraphicsTexture(scene, TEX.iconCross, 9, 9, (g) =>
    drawPixels(
      g,
      [
        '.........',
        '.rr...rr.',
        '..rr.rr..',
        '...rrr...',
        '....r....',
        '...rrr...',
        '..rr.rr..',
        '.rr...rr.',
        '.........',
      ],
      { r: 'stampRed' },
    ),
  );
  makeGraphicsTexture(scene, TEX.iconWarn, 9, 9, (g) =>
    drawPixels(
      g,
      [
        '....a....',
        '...aaa...',
        '...aka...',
        '..aakaa..',
        '..aakaa..',
        '.aaaaaaa.',
        '.aaakaaa.',
        'aaaaaaaaa',
        '.........',
      ],
      { a: 'amber', k: 'bg' },
    ),
  );
  makeGraphicsTexture(scene, TEX.iconLock, 9, 9, (g) =>
    drawPixels(
      g,
      [
        '..sssss..',
        '.ss...ss.',
        '.ss...ss.',
        'ggggggggg',
        'gggpggggg',
        'gggpggggg',
        'ggggggggg',
        'ggggggggg',
        '.........',
      ],
      { s: 'paperShadow', g: 'stampGreen', p: 'paper' },
    ),
  );
  makeGraphicsTexture(scene, TEX.iconUnlock, 9, 9, (g) =>
    drawPixels(
      g,
      [
        '......sss',
        '.....ss..',
        '.....ss..',
        'rrrrrrr..',
        'rrrprrr..',
        'rrrprrr..',
        'rrrrrrr..',
        'rrrrrrr..',
        '.........',
      ],
      { s: 'paperShadow', r: 'stampRed', p: 'paper' },
    ),
  );
  makeGraphicsTexture(scene, TEX.iconPadlock, 11, 13, (g) =>
    drawPixels(
      g,
      [
        '...sssss...',
        '..ss...ss..',
        '..s.....s..',
        '..s.....s..',
        '.mmmmmmmmm.',
        '.mmmmmmmmm.',
        '.mmmmkmmmm.',
        '.mmmkkkmmm.',
        '.mmmmkmmmm.',
        '.mmmmkmmmm.',
        '.mmmmmmmmm.',
        '.ddddddddd.',
        '...........',
      ],
      { s: 'paperShadow', m: 'woodLight', k: 'bg', d: 'woodDark' },
    ),
  );
}
