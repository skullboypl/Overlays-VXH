#!/usr/bin/env bash
# Renders every published link on an older commit and on the working tree, and reports what looks different.
#   pnpm compat:visual [ref=origin/main] [--only=qr,socials] [--defaults] [--jobs=6]
# Needs Playwright (npx playwright install chromium) or PLAYWRIGHT=/path/to/playwright/index.js.
set -euo pipefail
REF="${1:-origin/main}"; shift || true
ROOT="$(git rev-parse --show-toplevel)"
WORK="$ROOT/.compat"
rm -rf "$WORK"; mkdir -p "$WORK"
git -C "$ROOT" worktree remove --force "$WORK/base-src" 2>/dev/null || true
git -C "$ROOT" worktree add -q --detach "$WORK/base-src" "$REF"
# The base may predate src/compat: bring the dumper along so its contract can be read.
mkdir -p "$WORK/base-src/src/compat" && cp "$ROOT"/src/compat/{contract,dump}.ts "$WORK/base-src/src/compat/"
ln -sfn "$ROOT/node_modules" "$WORK/base-src/node_modules"
( cd "$WORK/base-src" \
  && npx vite build --outDir "$WORK/base" --emptyOutDir --logLevel error \
  && npx vite build --ssr src/compat/dump.ts --outDir .ssr/compat --emptyOutDir --logLevel error \
  && node .ssr/compat/dump.js "$WORK/base-contract.json" )
( cd "$ROOT" && npx vite build --outDir "$WORK/head" --emptyOutDir --logLevel error )
git -C "$ROOT" worktree remove --force "$WORK/base-src"
node "$ROOT/scripts/compat/visual.mjs" "$WORK/base" "$WORK/head" "$WORK/base-contract.json" --out="$WORK/report" "$@"
