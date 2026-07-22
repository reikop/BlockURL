#!/bin/sh
# Package the extension into a Chrome Web Store upload zip.
set -eu
cd "$(dirname "$0")"

VERSION=$(python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
OUT="dist/blockurl-${VERSION}.zip"

mkdir -p dist
rm -f "$OUT"
zip -r "$OUT" \
  manifest.json \
  background.js \
  lib \
  popup \
  options \
  _locales \
  icons \
  -x "*.DS_Store"

echo "Created $OUT"
