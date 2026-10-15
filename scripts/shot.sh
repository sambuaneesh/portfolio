#!/usr/bin/env bash
# usage: scripts/shot.sh <path> <out.png> [width] [height] [light|dark]
# Screenshots the local preview server (npx astro preview --port 4321).
W=${3:-1440}; H=${4:-1500}; SCHEME=${5:-dark}
chromium --headless=new --disable-gpu --hide-scrollbars --force-prefers-reduced-motion=0 \
  --blink-settings=preferredColorScheme=$([ "$SCHEME" = light ] && echo 1 || echo 0) \
  --virtual-time-budget=4000 --window-size="$W,$H" --screenshot="$2" "http://localhost:4321/portfolio$1" 2>/dev/null
