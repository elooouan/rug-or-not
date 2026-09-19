/**
 * Rug or Not? shared leaderboard: a Cloudflare Worker backed by one KV namespace.
 *
 *   GET  /?limit=10&mode=case            -> ScoreEntry[] (highest first)
 *   POST /  { ...ScoreEntry }            -> { ok: true }
 *   GET  /?board=desks&limit=10&sort=total|clips -> DeskEntry[] (one row per desk)
 *   POST /?board=desks  { ...DeskEntry } -> { ok: true }  (upsert by id)
 *
 * Matches src/systems/leaderboard.ts in the game. Deploy with `wrangler deploy`
 * from this folder (see README.md), then set VITE_LEADERBOARD_URL to the
 * worker's URL. No accounts, no signatures: the board is a guest book with a
 * score column, and it is treated that way (caps, rate limits, sanitising).
 */

const MODES = new Set(['case', 'rush', 'cold']);
const GRADES = new Set(['S', 'A', 'B', 'C', 'D']);
const KEEP = 200; // entries kept per board
const KEEP_DESKS = 500; // detectives kept on the desks board
const MAX_SCORE = 20000;
const MAX_CAREER = 1_000_000;
const RATE_PER_MINUTE = 12; // posts per IP per minute
// Mirrors src/systems/names.ts in the game: the obvious words only.
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
function nameAllowed(name) {
  const up = String(name).toUpperCase();
  const flat = up.replace(/[^A-Z]/g, '');
  const leet = up
    .replace(/0/g, 'O')
    .replace(/1/g, 'I')
    .replace(/3/g, 'E')
    .replace(/4/g, 'A')
    .replace(/5/g, 'S')
    .replace(/[^A-Z]/g, '');
  return !BLOCKED.some((w) => flat.includes(w) || leet.includes(w));
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*';
    const cors = {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'content-type': 'application/json; charset=utf-8',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    try {
      const desks = new URL(request.url).searchParams.get('board') === 'desks';
      if (request.method === 'GET') return await (desks ? listDesks : list)(request, env, cors);
      if (request.method === 'POST') return await (desks ? submitDesk : submit)(request, env, cors);
      return json({ error: 'method' }, 405, cors);
    } catch (e) {
      return json({ error: String(e && e.message ? e.message : e) }, 500, cors);
    }
  },
};

async function list(request, env, cors) {
  const url = new URL(request.url);
  const mode = MODES.has(url.searchParams.get('mode')) ? url.searchParams.get('mode') : 'case';
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10));
  const caseId = String(url.searchParams.get('caseId') || '').replace(/[^a-z0-9-]/g, '');
  let entries = (await env.BOARD.get(`board:${mode}`, 'json')) || [];
  if (caseId) entries = entries.filter((e) => e.caseId === caseId);
  return json(entries.slice(0, limit), 200, { ...cors, 'cache-control': 'public, max-age=15' });
}

/** True when this IP may post again this minute (and counts the post). */
async function rateOk(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const minute = Math.floor(Date.now() / 60000);
  const rateKey = `rate:${ip}:${minute}`;
  const count = Number((await env.BOARD.get(rateKey)) || 0);
  if (count >= RATE_PER_MINUTE) return false;
  await env.BOARD.put(rateKey, String(count + 1), { expirationTtl: 120 });
  return true;
}

async function submit(request, env, cors) {
  if (!(await rateOk(request, env))) return json({ error: 'slow down' }, 429, cors);

  let raw;
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'bad json' }, 400, cors);
  }
  const entry = sanitize(raw);
  if (!entry) return json({ error: 'bad entry' }, 400, cors);

  const key = `board:${entry.mode || 'case'}`;
  const entries = (await env.BOARD.get(key, 'json')) || [];
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));
  await env.BOARD.put(key, JSON.stringify(entries.slice(0, KEEP)));
  return json({ ok: true, rank: entries.indexOf(entry) + 1 }, 200, cors);
}

/** Keep only the fields the game writes, in the shapes it writes them. */
function sanitize(r) {
  if (!r || typeof r !== 'object') return null;
  const name = String(r.name || '')
    .replace(/[^\x20-\x7e]/g, '')
    .trim()
    .slice(0, 12);
  const score = Math.round(Number(r.score));
  if (!name || !Number.isFinite(score) || score < 0 || score > MAX_SCORE) return null;
  if (!nameAllowed(name)) return null;
  if (!GRADES.has(r.grade)) return null;
  const caseId = String(r.caseId || '')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 24);
  if (!caseId) return null;
  const date = new Date(r.date || Date.now());
  if (Number.isNaN(date.getTime())) return null;
  const out = { name, score, caseId, grade: r.grade, date: date.toISOString() };
  if (r.hard === true) out.hard = true;
  if (r.holder === true) out.holder = true;
  if (MODES.has(r.mode) && r.mode !== 'case') out.mode = r.mode;
  if (typeof r.wallet === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(r.wallet))
    out.wallet = r.wallet;
  return out;
}

// ---- the detectives board: one row per desk, replaced on every post ----------------

async function listDesks(request, env, cors) {
  const url = new URL(request.url);
  const sort = url.searchParams.get('sort') === 'clips' ? 'clips' : 'total';
  const other = sort === 'total' ? 'clips' : 'total';
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 10));
  const desks = (await env.BOARD.get('desks', 'json')) || [];
  desks.sort((a, b) => b[sort] - a[sort] || b[other] - a[other] || b.date.localeCompare(a.date));
  return json(desks.slice(0, limit), 200, { ...cors, 'cache-control': 'public, max-age=15' });
}

async function submitDesk(request, env, cors) {
  if (!(await rateOk(request, env))) return json({ error: 'slow down' }, 429, cors);
  let raw;
  try {
    raw = await request.json();
  } catch {
    return json({ error: 'bad json' }, 400, cors);
  }
  const entry = sanitizeDesk(raw);
  if (!entry) return json({ error: 'bad entry' }, 400, cors);
  const desks = ((await env.BOARD.get('desks', 'json')) || []).filter((d) => d.id !== entry.id);
  desks.push(entry);
  desks.sort((a, b) => b.total - a.total || b.clips - a.clips || b.date.localeCompare(a.date));
  await env.BOARD.put('desks', JSON.stringify(desks.slice(0, KEEP_DESKS)));
  return json({ ok: true, rank: desks.indexOf(entry) + 1 }, 200, cors);
}

const count = (v, max) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(max, n) : null;
};

function sanitizeDesk(r) {
  if (!r || typeof r !== 'object') return null;
  if (typeof r.id !== 'string' || !/^[a-f0-9]{16}$/.test(r.id)) return null;
  const name = String(r.name || '')
    .replace(/[^\x20-\x7e]/g, '')
    .trim()
    .slice(0, 12);
  if (!name || !nameAllowed(name)) return null;
  const total = count(r.total, MAX_CAREER);
  const clips = count(r.clips, MAX_CAREER);
  if (total === null || clips === null) return null;
  const out = {
    id: r.id,
    name,
    total,
    rank: String(r.rank || '')
      .replace(/[^\x20-\x7e]/g, '')
      .slice(0, 16),
    clips,
    solved: count(r.solved, 999) ?? 0,
    badges: count(r.badges, 999) ?? 0,
    date: new Date().toISOString(),
  };
  const token = count(r.token, 1e12);
  if (token) out.token = token;
  if (r.holder === true) out.holder = true;
  if (typeof r.wallet === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(r.wallet))
    out.wallet = r.wallet;
  return out;
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}
