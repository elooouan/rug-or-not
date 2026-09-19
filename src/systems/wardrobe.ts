import Phaser from 'phaser';
import { makeCat, makeMug, makeOrnament, makeRadio, TEX } from '@/art';
import { crisp } from '@/art/pixelUtil';
import type { ShopItem, Tint } from '@/data/shop';
import { LUCIEN_FACE_TEX, LUCIEN_TEX } from '@/ui/DialogueBox';
import { worn } from './clips';

/**
 * Dressing the desk: Lucien's coat and hat, the mug, the cat, the radio and the corner
 * ornament, drawn from whatever the market says is worn. Textures are regenerated in
 * place, so, like themes and cosmetics, this only runs at moments when no live scene
 * holds the old ones (boot, and a screen about to be rebuilt).
 */

/** The loaded sprites, kept untouched so a new coat is cut from the original cloth. */
export const LUCIEN_BASE = `${LUCIEN_TEX}-base`;
export const LUCIEN_FACE_BASE = `${LUCIEN_FACE_TEX}-base`;

/**
 * Where the hat ends and the coat begins, as a fraction of each image's height. The trench
 * and the fedora share their colours, so the split is by position (measured on the art).
 */
const HAT_SPLIT: Record<string, number> = { [LUCIEN_BASE]: 0.29, [LUCIEN_FACE_BASE]: 0.515 };

/** Lucien's trench-coat cloth: the orange family, mid tones; skin and the brass are lighter or yellower. */
function isCloth(h: number, s: number, l: number): boolean {
  return h >= 18 && h <= 38 && s > 0.45 && l >= 0.22 && l <= 0.62;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = l - c / 2;
  return [r + m, g + m, b + m];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Recolour one of Lucien's sprites: every cloth pixel above the split takes the hat tint,
 * every one below the coat tint. A null tint keeps the original cloth.
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
    const split = (HAT_SPLIT[baseKey] ?? 0.3) * h;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue;
      const [hue, s, l] = rgbToHsl(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
      if (!isCloth(hue, s, l)) continue;
      const y = Math.floor(i / 4 / w);
      const tint = y < split ? hat : coat;
      if (!tint) continue;
      const [r, g, b] = hslToRgb(tint.hue, clamp01(s * tint.sat), clamp01(l * tint.light));
      d[i] = Math.round(r * 255);
      d[i + 1] = Math.round(g * 255);
      d[i + 2] = Math.round(b * 255);
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
  if (cat.slot === 'cat') {
    drop([0, 1, 2, 3].map((i) => `${TEX.cat}-${i}`));
    for (const anim of scene.anims.toJSON().anims)
      if (anim.key.startsWith('cat')) scene.anims.remove(anim.key);
    makeCat(scene, { fur: cat.fur, dark: cat.dark, eye: cat.eye });
  }
  const radio = worn('radio').style;
  if (radio.slot === 'radio') {
    drop([TEX.radio]);
    makeRadio(scene, { body: radio.body, dark: radio.dark });
  }
  const orn = worn('ornament').style;
  drop([TEX.ornament]);
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
    case 'cat':
      [0, 1, 2, 3].forEach((i) => drop(`${key}-${i}`));
      makeCat(scene, { fur: st.fur, dark: st.dark, eye: st.eye }, key);
      return `${key}-0`;
    case 'radio':
      drop(key);
      makeRadio(scene, { body: st.body, dark: st.dark }, key);
      return key;
    case 'ornament':
      if (st.kind === 'none') return null;
      drop(key);
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
    ...[0, 1, 2, 3].map((i) => `${TEX.cat}-${i}`),
  ];
}

/**
 * Change the look while screens are up (buying at the market on the title): regenerate
 * the textures, then point every image that was showing one of them at the new copy in
 * the same tick, so nothing renders against a texture that no longer exists.
 */
export function redress(scene: Phaser.Scene): void {
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
  // Desks add their ornament and redraw curtains on this.
  for (const sc of scenes) sc.events.emit('look:changed');
}

/** The look as one string, so screens can tell when it changed underneath them. */
export function lookKey(): string {
  return (['coat', 'hat', 'mug', 'cat', 'ornament', 'curtains', 'radio'] as const)
    .map((s) => worn(s).id)
    .join('|');
}
