# Shared leaderboard (Cloudflare Worker)

The game keeps its board in `localStorage` unless `VITE_LEADERBOARD_URL` points at a JSON
endpoint. This folder is a ready-made one: a single Worker and one KV namespace, free tier.

```bash
cd server/leaderboard
npx wrangler login
npx wrangler kv namespace create BOARD      # paste the id into wrangler.toml
npx wrangler deploy                          # prints https://rug-or-not-board.<you>.workers.dev
```

Then in the game's `.env`:

```
VITE_LEADERBOARD_URL=https://rug-or-not-board.<you>.workers.dev
```

## What it does

- `GET /?limit=10&mode=case|rush|cold` returns the top entries for that board, highest first;
  `&caseId=<id>` narrows it to one file (the game uses this for the weekly cold case).
- `POST /` accepts one `ScoreEntry` (the shape in `src/systems/leaderboard.ts`), sanitises it,
  inserts it, and keeps the top 200 per board.
- Twelve posts per IP per minute; names are trimmed to 12 printable characters and pass the
  same light word filter as the game; scores are capped; unknown fields are dropped. Set `ALLOWED_ORIGIN` in `wrangler.toml` to the game's
  origin once it's live.

It is a guest book with a score column, not an anti-cheat system: anyone can POST a number.
That's fine for a community board; if it matters later, sign entries on a server that
replays the case.
