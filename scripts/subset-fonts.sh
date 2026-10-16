#!/usr/bin/env bash
# Regenerates the self-hosted font subsets in src/assets/fonts from the
# @fontsource-variable packages. Only Basic Latin + Latin-1 + common
# punctuation/arrows/box-drawing are kept - everything this site renders -
# which roughly halves the bytes a visitor downloads. Needs `uv` (uses uvx).
set -euo pipefail
cd "$(dirname "$0")/.."
UNICODES="U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2010-2027,U+2030-203A,U+2044,U+20AC,U+20B9,U+2122,U+2190-2195,U+21B5,U+2212,U+2500-257F,U+25A0-25CF,U+2713"
sub() {
  uvx --from 'fonttools[woff]' --with brotli pyftsubset "$1" \
    --unicodes="$UNICODES" --layout-features='kern,liga,calt,tnum,zero,ss01' \
    --flavor=woff2 --output-file="$2" --no-hinting --desubroutinize
}
# Trim the weight axes to the range the CSS actually uses (drops unused masters).
pin() {
  uvx --from 'fonttools[woff]' --with brotli fonttools varLib.instancer "$1" "${@:3}" -o "$2"
}
TMP=$(mktemp -d)
sub node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2 "$TMP/a.woff2"
pin "$TMP/a.woff2" src/assets/fonts/archivo-subset.woff2 wght=400:900 wdth=62:125
sub node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2 "$TMP/j.woff2"
pin "$TMP/j.woff2" src/assets/fonts/jetbrains-mono-subset.woff2 wght=400:700
# Ballpoint handwriting for the pen notes scribbled on the zine pages.
uvx --from 'fonttools[woff]' --with brotli pyftsubset node_modules/@fontsource/shadows-into-light/files/shadows-into-light-latin-400-normal.woff2 \
  --unicodes="U+0020-007E,U+2190-2193,U+2014,U+2026" --flavor=woff2 --output-file=src/assets/fonts/hand-subset.woff2 --no-hinting --desubroutinize

# Per-edition faces (each edition only downloads its own).
mkdir -p src/assets/fonts/themes
T() { sub "node_modules/$1" "src/assets/fonts/themes/$2.woff2"; }
T @fontsource/b612/files/b612-latin-400-normal.woff2 b612-400
T @fontsource/b612/files/b612-latin-700-normal.woff2 b612-700
T @fontsource/b612-mono/files/b612-mono-latin-400-normal.woff2 b612-mono-400
T @fontsource/courier-prime/files/courier-prime-latin-400-normal.woff2 courier-prime-400
T @fontsource/courier-prime/files/courier-prime-latin-700-normal.woff2 courier-prime-700
T @fontsource/anton/files/anton-latin-400-normal.woff2 anton-400
T @fontsource/bungee/files/bungee-latin-400-normal.woff2 bungee-400
T @fontsource/chakra-petch/files/chakra-petch-latin-400-normal.woff2 chakra-petch-400
T @fontsource/chakra-petch/files/chakra-petch-latin-700-normal.woff2 chakra-petch-700
T @fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff2 space-grotesk-400
T @fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2 space-grotesk-700
T @fontsource/newsreader/files/newsreader-latin-400-normal.woff2 newsreader-400
T @fontsource/newsreader/files/newsreader-latin-400-italic.woff2 newsreader-400i
# headline-only faces: pin the weight axis to the one weight used
sub node_modules/@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2 "$TMP/u.woff2"
pin "$TMP/u.woff2" src/assets/fonts/themes/unbounded.woff2 wght=800
sub node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2 "$TMP/b.woff2"
pin "$TMP/b.woff2" src/assets/fonts/themes/bricolage.woff2 wght=800
rm -rf "$TMP"
ls -l src/assets/fonts
