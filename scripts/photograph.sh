#!/usr/bin/env bash
# Check out a commit into a scratch worktree, patch it so the game instance is
# reachable from the console, and serve it on port 5180 for photographing.
#   scripts/photograph.sh <commit> [scratch-dir]
set -euo pipefail
commit="$1"
scratch="${2:-/tmp/rug-history}"
repo="$(cd "$(dirname "$0")/.." && pwd)"
wt="$scratch/$commit"
mkdir -p "$scratch"
if [ ! -d "$wt" ]; then
  git -C "$repo" worktree add --detach "$wt" "$commit" >/dev/null
fi
ln -sfn "$repo/node_modules" "$wt/node_modules"
main="$wt/src/main.ts"
# Keep the loop stepping when the tab is hidden (the photographer's tab often is).
if ! grep -q "forceSetTimeOut" "$main"; then
  perl -0pi -e 's/type: Phaser\.AUTO,/type: Phaser.AUTO,\n  fps: { forceSetTimeOut: true },/' "$main"
fi
# Old builds: expose the game instance for the snapshot call.
if ! grep -q "__game" "$main"; then
  printf '\n(window as unknown as { __game: Phaser.Game }).__game = game;\n' >> "$main"
fi
echo "serving $commit from $wt on http://localhost:5180"
cd "$repo" && SNAP_ROOT="$wt" exec npx vite --config scripts/snapshot.config.ts --port 5180 --strictPort
