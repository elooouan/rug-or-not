# Shipping a version

The checklist for putting a build in front of people. Everything here is a public action,
so it is done by hand, not by a script.

## Before

1. `npm run lint`, `npm test`, `npm run build` (type-checks first), `npm run e2e`.
2. With the dev server up: `node scripts/sweep.mjs` (every file plays clean),
   `SWEEP_LOOK=1 node scripts/sweep.mjs 0` (the second look on every file), and a couple of
   `node scripts/fuzz.mjs 150 <seed>` runs with fresh seeds, one of them `FUZZ_TOUCH=1`.
3. `GAME_VERSION` in `src/config/gameConfig.ts` and the `WHATS_NEW` line in
   `src/data/dialogue.ts` name the version; the `CHANGELOG.md` section for it is complete.
4. Marketing: `node scripts/promo.mjs` regenerated `assets/marketing/`, the README table
   there lists every new file, and `TWEETS.md` has copy for anything new.
5. A wall photo for the version's headline feature is in `public/img/history/` with a
   frame in `src/data/history.ts` (`SNAP_ROOT=$PWD npx vite --config
scripts/snapshot.config.ts --port 5180`, then `__debug.snapshot('NN-vXX-name')`).

## Tag and release

```bash
git tag v0.8 && git push origin v0.8
gh release create v0.8 --title "v0.8 — the handbook" --notes-file <(sed -n '/^## v0.8/,/^## v0.7/p' CHANGELOG.md | sed '$d')
```

(Release notes are the changelog section, headline included.)

## Deploy

GitHub Pages: repository Settings → Pages → Source: _GitHub Actions_. The workflow in
`.github/workflows/deploy.yml` builds and publishes `main` when run from the Actions tab
("Deploy to GitHub Pages" → Run workflow). It is manual on purpose: switch its trigger to
`push` once Pages is enabled if every commit should deploy.

Launch-day environment (repository Settings → Secrets and variables → Actions, as
variables, or a local `.env`): `VITE_TOKEN_MINT`, `VITE_TOKEN_BUY_URL`, `VITE_SOLANA_RPC`,
`VITE_SOLANA_CLUSTER`; optionally `VITE_TOKEN_PRICE_URL` and `VITE_LEADERBOARD_URL` (see
`.env.example` and `server/leaderboard`).

## After

- Pin the launch tweet; the thread order in `assets/marketing/TWEETS.md` is a suggestion.
- Start the next `## vX.Y` section in `CHANGELOG.md` with the first change that lands.
