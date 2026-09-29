#!/usr/bin/env bash
# 入口のページ・しゃかい用のサブセットフォント（public/fonts/drill-*.woff2）を作り直す。
# 画面の文言や問題データ（県名など）に新しい文字を足したら実行する。
# 見出しも この丸ゴシックの Black を使う（元のドパドリルの Dela Gothic One は かなが読みにくいので、改造した画面では使わない）。
# 必要なもの: curl、fonttools と brotli が入った python3（例: pip install fonttools brotli）
# 使い方: PYTHON=/path/to/python3 bash tools/drill/scripts/build_fonts.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../public" && pwd)"
PY="${PYTHON:-python3}"
WORK="$(mktemp -d)"
BASE=https://raw.githubusercontent.com/google/fonts/main/ofl
curl -sSfo "$WORK/zen-bold.ttf" "$BASE/zenmarugothic/ZenMaruGothic-Bold.ttf"
curl -sSfo "$WORK/zen-black.ttf" "$BASE/zenmarugothic/ZenMaruGothic-Black.ttf"
"$PY" - "$ROOT" "$WORK/chars.txt" <<'PY'
import sys, pathlib
root = pathlib.Path(sys.argv[1])
chars = {chr(c) for c in range(0x20, 0x7f)}
chars |= {chr(c) for c in range(0x3041, 0x3097)} | {chr(c) for c in range(0x30a1, 0x30fb)}  # ひらがな・カタカナ全部
chars |= set('０１２３４５６７８９＋−×÷＝、。・！？「」（）ー〜…：／→←↑↓♪★☆○×')
files = [root / 'index.html', *[f for ext in ('html', 'css', 'js') for f in root.glob(f'shakai/**/*.{ext}')]]
for f in files:
    chars |= set(f.read_text(encoding='utf-8'))
pathlib.Path(sys.argv[2]).write_text(''.join(sorted(c for c in chars if ord(c) >= 0x20)), encoding='utf-8')
print(f'{len(chars)} characters')
PY
for pair in "zen-bold drill-maru-bold" "zen-black drill-maru-black"; do
  set -- $pair
  "$PY" -m fontTools.subset "$WORK/$1.ttf" --text-file="$WORK/chars.txt" --flavor=woff2 --layout-features='*' --output-file="$ROOT/fonts/$2.woff2"
done
rm -rf "$WORK"
echo "fonts rebuilt in $ROOT/fonts"
