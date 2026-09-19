import { FONT } from '@/config/layout';
import { PALETTE } from '@/config/palette';

/** Everything the result card needs; the scene gathers it, this file only draws. */
export interface ShareCardData {
  ticker: string;
  title: string;
  verdict: 'rug' | 'legit';
  correct: boolean;
  grade: string;
  score: number;
  /** "Red flags 3/4" or "Herrings pinned 0"; already worded. */
  detail: string;
  /** "Daily 2026-09-18" or "Case 4 of 12". */
  mode: string;
  detective: string;
  url: string;
  /** Lucien, if his texture is loaded. Drawn pixel-crisp in the corner. */
  mascot?: HTMLImageElement | HTMLCanvasElement | null;
}

const W = 1280;
const H = 720;

/**
 * Render a 1280x720 result card on an offscreen canvas: a paper report under
 * the lamp with the verdict stamped across it. Pure canvas 2D so it works
 * without Phaser and can be unit-tested with a fake context.
 */
export function renderShareCard(
  data: ShareCardData,
  canvas?: HTMLCanvasElement,
): HTMLCanvasElement {
  const c = canvas ?? document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const ui = (px: number, weight = 700) => `${weight} ${px}px '${FONT.ui}'`;
  const body = (px: number) => `${px}px '${FONT.body}'`;

  // Desk wood with a few grain lines and the lamp's pool of light.
  ctx.fillStyle = PALETTE.woodMid;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PALETTE.woodDark;
  for (let y = 0; y < H; y += 46) ctx.fillRect(0, y + ((y * 7) % 11), W, 3);
  const glow = ctx.createRadialGradient(W / 2, H / 2 - 40, 60, W / 2, H / 2, 640);
  glow.addColorStop(0, 'rgba(224, 181, 102, 0.28)');
  glow.addColorStop(1, 'rgba(27, 26, 31, 0.55)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // The report sheet.
  const px = 150;
  const py = 60;
  const pw = W - 300;
  const ph = H - 120;
  ctx.fillStyle = 'rgba(27, 26, 31, 0.55)';
  ctx.fillRect(px + 12, py + 14, pw, ph);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = PALETTE.paperShadow;
  ctx.lineWidth = 3;
  ctx.strokeRect(px + 10, py + 10, pw - 20, ph - 20);
  // Ruled lines.
  ctx.fillStyle = 'rgba(184, 168, 138, 0.45)';
  for (let y = py + 200; y < py + ph - 120; y += 34) ctx.fillRect(px + 40, y, pw - 80, 2);

  ctx.textBaseline = 'top';
  ctx.fillStyle = PALETTE.paperShadow;
  ctx.font = ui(22);
  ctx.textAlign = 'center';
  ctx.fillText('CASE REPORT  ·  RUG OR NOT?', W / 2, py + 34);
  ctx.fillStyle = PALETTE.shadow;
  ctx.font = ui(64);
  ctx.fillText(data.ticker, W / 2, py + 66);
  ctx.fillStyle = PALETTE.ink;
  ctx.font = body(34);
  ctx.fillText(`"${data.title}"`, W / 2, py + 142);

  // Verdict + result lines.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.shadow;
  ctx.font = body(36);
  const lines = [
    `Verdict: ${data.verdict.toUpperCase()}  ${data.correct ? '(correct)' : '(wrong)'}`,
    `${data.detail}`,
    `${data.mode}  ·  Detective ${data.detective}`,
  ];
  lines.forEach((l, i) => ctx.fillText(l, px + 48, py + 210 + i * 40));

  // Score + grade in a stamp-like circle.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.shadow;
  ctx.font = ui(72);
  ctx.fillText(String(data.score), px + pw - 190, py + 200);
  ctx.font = ui(20);
  ctx.fillStyle = PALETTE.woodMid;
  ctx.fillText('POINTS', px + pw - 190, py + 280);
  ctx.save();
  ctx.translate(px + pw - 100, py + 90);
  ctx.rotate(-0.25);
  ctx.strokeStyle = PALETTE.stampRed;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = PALETTE.stampRed;
  ctx.font = ui(56);
  ctx.textBaseline = 'middle';
  ctx.fillText(data.grade, 0, 2);
  ctx.restore();
  ctx.textBaseline = 'top';

  // The big stamp across the lower half.
  const stampColor = data.verdict === 'rug' ? PALETTE.stampRed : PALETTE.stampGreen;
  ctx.save();
  ctx.translate(W / 2, py + ph - 150);
  ctx.rotate(-0.16);
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = stampColor;
  ctx.lineWidth = 10;
  ctx.strokeRect(-230, -60, 460, 120);
  ctx.fillStyle = stampColor;
  ctx.font = ui(96);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(data.verdict.toUpperCase(), 0, 4);
  ctx.restore();
  ctx.textBaseline = 'top';

  // Footer: url + hashtag.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.woodMid;
  ctx.font = body(28);
  ctx.fillText(`${data.url}   #RugOrNot`, px + pw - 40, py + ph - 48);
  ctx.textAlign = 'left';
  ctx.font = body(22);
  ctx.fillText('All cases are fictional. Not financial advice.', px + 110, py + ph - 44);

  // Lucien in the corner, pixels kept sharp.
  if (data.mascot) {
    const img = data.mascot;
    const targetH = 230;
    const scale = targetH / img.height;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 10, H - targetH - 6, Math.round(img.width * scale), targetH);
  }
  return c;
}

export interface IdCardData {
  detective: string;
  rank: string;
  score: number;
  casesSolved: number;
  casesTotal: number;
  badges: number;
  badgesTotal: number;
  streak: number;
  rushBest: number;
  coldBest: number;
  /** Paper clips earned over the career (see clips.ts); left out when there are none. */
  clips?: number;
  /** Badge names to print, already trimmed to a handful. */
  badgeNames: string[];
  /** Holder tier title, when the tier grants it (board-title). */
  tierTitle?: string;
  url: string;
  mascot?: HTMLImageElement | HTMLCanvasElement | null;
}

/** A detective ID card: rank, record, a few badges, Lucien. 1280x720 like the report card. */
export function renderIdCard(data: IdCardData, canvas?: HTMLCanvasElement): HTMLCanvasElement {
  const c = canvas ?? document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  const ui = (px: number, weight = 700) => `${weight} ${px}px '${FONT.ui}'`;
  const body = (px: number) => `${px}px '${FONT.body}'`;
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = PALETTE.woodMid;
  for (let y = 0; y < H; y += 46) ctx.fillRect(0, y + ((y * 7) % 11), W, 3);
  // The card itself: a laminated badge with a photo window.
  const px = 190;
  const py = 120;
  const pw = W - 380;
  const ph = H - 240;
  ctx.fillStyle = 'rgba(27, 26, 31, 0.55)';
  ctx.fillRect(px + 12, py + 14, pw, ph);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = PALETTE.stampRed;
  ctx.lineWidth = 6;
  ctx.strokeRect(px + 12, py + 12, pw - 24, ph - 24);
  ctx.fillStyle = PALETTE.stampRed;
  ctx.fillRect(px + 12, py + 12, pw - 24, 54);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.paper;
  ctx.font = ui(30);
  ctx.fillText('RUG OR NOT?  ·  DETECTIVE ID', px + 34, py + 24);
  ctx.textAlign = 'right';
  ctx.font = body(24);
  ctx.fillText(`${data.url}   #RugOrNot`, px + pw - 34, py + 30);
  ctx.textAlign = 'left';
  // Photo window.
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(px + 40, py + 96, 220, 300);
  if (data.mascot) {
    const img = data.mascot;
    const scale = Math.min(200 / img.width, 280 / img.height);
    ctx.imageSmoothingEnabled = false;
    const dw = Math.round(img.width * scale);
    const dh = Math.round(img.height * scale);
    ctx.drawImage(img, px + 40 + (220 - dw) / 2, py + 96 + (300 - dh) / 2, dw, dh);
  }
  // Fields.
  const fx = px + 300;
  let fy = py + 96;
  const field = (label: string, value: string, big = false) => {
    ctx.fillStyle = PALETTE.woodMid;
    ctx.font = ui(18);
    ctx.fillText(label.toUpperCase(), fx, fy);
    ctx.fillStyle = PALETTE.shadow;
    ctx.font = big ? ui(44) : body(34);
    ctx.fillText(value, fx, fy + 22);
    fy += big ? 88 : 68;
  };
  field('Detective', data.detective, true);
  field(
    'Rank',
    `${data.rank}  ·  ${data.score} pts${data.tierTitle ? `  ·  ${data.tierTitle}` : ''}`,
  );
  field(
    'Record',
    `${data.casesSolved}/${data.casesTotal} files  ·  ${data.badges}/${data.badgesTotal} badges  ·  streak ${data.streak}`,
  );
  field(
    'Arcade',
    `rush ${data.rushBest}  ·  cold ${data.coldBest}${data.clips ? `  ·  ${data.clips} clips` : ''}`,
  );
  if (data.badgeNames.length) {
    ctx.fillStyle = PALETTE.woodMid;
    ctx.font = ui(18);
    ctx.fillText('BADGES', px + 40, py + 412);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = body(26);
    ctx.fillText(data.badgeNames.join('  ·  ').slice(0, 90), px + 40, py + 436);
  }
  // An "ON DUTY" stamp across the corner.
  ctx.save();
  ctx.translate(px + pw - 150, py + 130);
  ctx.rotate(0.2);
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = PALETTE.stampGreen;
  ctx.lineWidth = 6;
  ctx.strokeRect(-90, -28, 180, 56);
  ctx.fillStyle = PALETTE.stampGreen;
  ctx.font = ui(34);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ON DUTY', 0, 2);
  ctx.restore();
  return c;
}

/** Trigger a PNG download of the card. Returns false when the browser can't. */
export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): boolean {
  try {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    return true;
  } catch {
    return false;
  }
}
