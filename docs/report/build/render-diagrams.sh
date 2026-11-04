#!/usr/bin/env bash
# Render docs/diagrams/report/*.mmd to PNG with Mermaid CLI 12.0.0.
# Usage: render-diagrams.sh <output-png-dir> [chromium-path]
set -euo pipefail
out=$(realpath -m "$1"); chrome=${2:-/opt/pw-browsers/chromium}
src="$(cd "$(dirname "$0")/../../diagrams/report" && pwd)"
mkdir -p "$out"; pp=$(mktemp); printf '{"executablePath":"%s","args":["--no-sandbox","--headless"]}' "$chrome" > "$pp"
for f in "$src"/*.mmd; do
  npx -y @mermaid-js/mermaid-cli@12.0.0 -q -i "$f" -o "$out/$(basename "${f%.mmd}").png" \
    -c "$src/mermaid.config.json" -p "$pp" -s 2.5 -b white
done
