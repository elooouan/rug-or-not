import Phaser from 'phaser';
import { makeCat, makeMug, makeOrnament, makeRadio, TEX } from '@/art';
import { crisp } from '@/art/pixelUtil';
import type { ShopItem, ShopSlot, Tint } from '@/data/shop';
import { LUCIEN_FACE_TEX, LUCIEN_TEX } from '@/ui/DialogueBox';
import { worn } from './clips';
import { Cloth, clamp01, clothParts, hslToRgb, type Keep, rgbToHsl } from './cloth';

/**
 * Dressing the desk: Lucien's coat and hat, the mug, the cat, the radio and the corner
 * ornament, drawn from whatever the market says is worn. Textures are regenerated in
 * place: `applyLook` at moments when no live scene holds the old ones (boot, a theme
 * repaint), `redress` while screens are up (it re-points every image first).
 */

/** The loaded sprites, kept untouched so a new coat is cut from the original cloth. */
export const LUCIEN_BASE = `${LUCIEN_TEX}-base`;
export const LUCIEN_FACE_BASE = `${LUCIEN_FACE_TEX}-base`;

/**
 * The line between the hat and the coat, as a fraction of each image's height (measured on
 * the art). The trench and the fedora share their colours, so cloth is told apart by
 * position: a piece of cloth that starts above this line is the hat (the brim dips below
 * it, the coat's collar never reaches it).
 */
const HAT_SPLIT: Record<string, number> = { [LUCIEN_BASE]: 0.29, [LUCIEN_FACE_BASE]: 0.515 };
/** Shade-coloured parts that are not cloth and touch it: the trousers under the hem. */
const KEEP: Record<string, Keep[]> = { [LUCIEN_BASE]: [[52, 178, 92, 216]] };

/**
 * Recolour one of Lucien's sprites: the hat's cloth takes the hat tint, the coat's the
 * coat tint (see `clothParts`). A null tint keeps the original cloth.
 */
function dressSprite(
  scene: Phaser.Scene,
  baseKey: string,
  outKey: string,
  coat: Tint | null,
  hat: Tint | null,
): void {
  if (!scene.textures.exists(baseKey)) return;
  const src = scene.textures.get(baseKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const w = src.width;
  const h = src.height;
  if (scene.textures.exists(outKey)) scene.textures.remove(outKey);
  const tex = scene.textures.createCanvas(outKey, w, h);
  if (!tex) return;
  const ctx = tex.context;
  ctx.drawImage(src, 0, 0);
  if (coat || hat) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const parts = clothParts(d, w, h, (HAT_SPLIT[baseKey] ?? 0.3) * h, KEEP[baseKey]);
    for (let i = 0, p = 0; i < parts.length; i++, p += 4) {
      const tint = parts[i] === Cloth.hat ? hat : parts[i] === Cloth.coat ? coat : null;
      if (!tint) continue;
      const [, s, l] = rgbToHsl(d[p] / 255, d[p + 1] / 255, d[p + 2] / 255);
      const [r, g, b] = hslToRgb(tint.hue, clamp01(s * tint.sat), clamp01(l * tint.light));
      d[p] = Math.round(r * 255);
      d[p + 1] = Math.round(g * 255);
      d[p + 2] = Math.round(b * 255);
    }
    ctx.putImageData(img, 0, 0);
  }
  tex.refresh();
  crisp(scene, outKey);
}

/** The look the textures currently show; '' after a repaint that drew defaults. */
let applied = '';

/** Something rebuilt every texture from scratch (a theme change): the look must go on again. */
export function markLookStale(): void {
  applied = '';
}

export function lookOutOfDate(): boolean {
  return applied !== lookKey();
}

/** Put on whatever the market says: Lucien's sprites, then the props. */
export function applyLook(scene: Phaser.Scene): void {
  applied = lookKey();
  const coat = worn('coat').style;
  const hat = worn('hat').style;
  dressSprite(
    scene,
    LUCIEN_BASE,
    LUCIEN_TEX,
    coat.slot === 'coat' ? coat.tint : null,
    hat.slot === 'hat' ? hat.tint : null,
  );
  dressSprite(
    scene,
    LUCIEN_FACE_BASE,
    LUCIEN_FACE_TEX,
    coat.slot === 'coat' ? coat.tint : null,
    hat.slot === 'hat' ? hat.tint : null,
  );
  const drop = (keys: string[]) =>
    keys.forEach((k) => scene.textures.exists(k) && scene.textures.remove(k));
  const mug = worn('mug').style;
  if (mug.slot === 'mug') {
    drop([TEX.mug]);
    makeMug(scene, { body: mug.body, band: mug.band });
  }
  const cat = worn('cat').style;
  const collar = worn('collar').style;
  if (cat.slot === 'cat') {
    // The cat is four still frames swapped by hand (no animation to rebuild).
    drop([0, 1, 2, 3].map((i) => `${TEX.cat}-${i}`));
    makeCat(scene, {
      fur: cat.fur,
      dark: cat.dark,
      eye: cat.eye,
      collar: collar.slot === 'collar' ? (collar.color ?? undefined) : undefined,
    });
  }
  const radio = worn('radio').style;
  if (radio.slot === 'radio') {
    drop([TEX.radio]);
    makeRadio(scene, { body: radio.body, dark: radio.dark });
  }
  const orn = worn('ornament').style;
  drop([TEX.ornament, `${TEX.ornament}-1`]);
  if (orn.slot === 'ornament' && orn.kind !== 'none') makeOrnament(scene, orn.kind);
}

const tintOf = (slot: 'coat' | 'hat'): Tint | null => {
  const st = worn(slot).style;
  return st.slot === slot ? st.tint : null;
};

/**
 * A texture of `item` on the current look, for the market's try-on: Lucien in that coat
 * or hat, the cat in that fur, the mug, the radio, the ornament. One key per slot, redrawn
 * on each call; null for things that have no picture (curtains, a cleared corner).
 */
export function previewTexture(scene: Phaser.Scene, item: ShopItem): string | null {
  const st = item.style;
  const key = `preview-${st.slot}`;
  const drop = (k: string) => scene.textures.exists(k) && scene.textures.remove(k);
  switch (st.slot) {
    case 'coat':
      dressSprite(scene, LUCIEN_BASE, key, st.tint, tintOf('hat'));
      return key;
    case 'hat':
      dressSprite(scene, LUCIEN_BASE, key, tintOf('coat'), st.tint);
      return key;
    case 'mug':
      drop(key);
      makeMug(scene, { body: st.body, band: st.band }, key);
      return key;
    case 'cat': {
      [0, 1, 2, 3].forEach((i) => drop(`${key}-${i}`));
      const collar = worn('collar').style;
      makeCat(
        scene,
        {
          fur: st.fur,
          dark: st.dark,
          eye: st.eye,
          collar: collar.slot === 'collar' ? (collar.color ?? undefined) : undefined,
        },
        key,
      );
      return `${key}-0`;
    }
    case 'collar': {
      [0, 1, 2, 3].forEach((i) => drop(`${key}-${i}`));
      const cat = worn('cat').style;
      if (cat.slot !== 'cat') return null;
      makeCat(
        scene,
        { fur: cat.fur, dark: cat.dark, eye: cat.eye, collar: st.color ?? undefined },
        key,
      );
      return `${key}-0`;
    }
    case 'radio':
      drop(key);
      makeRadio(scene, { body: st.body, dark: st.dark }, key);
      return key;
    case 'ornament':
      if (st.kind === 'none') return null;
      drop(key);
      drop(`${key}-1`);
      makeOrnament(scene, st.kind, key);
      return key;
    default:
      return null;
  }
}

/** Every texture key the look can replace. */
function lookKeys(): string[] {
  return [
    LUCIEN_TEX,
    LUCIEN_FACE_TEX,
    TEX.mug,
    TEX.radio,
    TEX.ornament,
    `${TEX.ornament}-1`,
    ...[0, 1, 2, 3].map((i) => `${TEX.cat}-${i}`),
  ];
}

/**
 * Change the look while screens are up (buying at the market on the title): regenerate
 * the textures, then point every image that was showing one of them at the new copy in
 * the same tick, so nothing renders against a texture that no longer exists.
 */
export function redress(scene: Phaser.Scene, changed?: ShopSlot): void {
  const keys = new Set(lookKeys());
  // Sizes are read before the old textures go: a destroyed frame has none to read.
  const showing: { img: Phaser.GameObjects.Image; w: number; h: number }[] = [];
  const visit = (o: Phaser.GameObjects.GameObject) => {
    if (o instanceof Phaser.GameObjects.Container) o.list.forEach(visit);
    else if (
      (o instanceof Phaser.GameObjects.Image || o instanceof Phaser.GameObjects.Sprite) &&
      keys.has(o.texture.key)
    )
      showing.push({ img: o, w: o.displayWidth, h: o.displayHeight });
  };
  // Every scene, paused ones included: a file waiting under the settings page still holds
  // its images, and would render against a dead texture on resume.
  const scenes = scene.scene.manager.scenes.filter((sc) => sc.sys.isActive() || sc.sys.isPaused());
  for (const sc of scenes) sc.children.list.forEach(visit);
  applyLook(scene);
  for (const { img, w, h } of showing) {
    if (!img.active) continue;
    if (scene.textures.exists(img.texture.key)) {
      img.setTexture(img.texture.key);
      img.setDisplaySize(w, h);
    } else img.destroy(); // an ornament taken off the desk
  }
  // Desks add their ornament and redraw curtains on this; the slot says what to bounce.
  for (const sc of scenes) sc.events.emit('look:changed', changed);
}

/** The look as one string, so screens can tell when it changed underneath them. */
export function lookKey(): string {
  return (['coat', 'hat', 'mug', 'cat', 'collar', 'ornament', 'curtains', 'radio'] as const)
    .map((s) => worn(s).id)
    .join('|');
}
