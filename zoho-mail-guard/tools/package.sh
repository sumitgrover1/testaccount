#!/usr/bin/env bash
# Build a Chrome-ready zip of the extension (no tests, tools or docs inside).
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="$(node -p "require('$root/manifest.json').version")"
out="$root/dist/zoho-mail-guard-$version.zip"

mkdir -p "$root/dist"
rm -f "$out"

cd "$root"
zip -r -q "$out" \
  manifest.json \
  icons \
  src \
  policies/managed-schema.json

echo "Built $out"
unzip -l "$out" | tail -1
