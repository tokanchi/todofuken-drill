# 都道府県ドリル（ドパドリル 非公式改造版）

都道府県・地方・県庁所在地を、日本地図をタップしながら覚えるドリルです。gear_machine さんの [ドパドリル](https://github.com/grmchn/dopa-drill)（答えるたびに演出と音楽が盛り上がる計算ドリル）の演出をそのまま使い、問題を都道府県に作りかえた**非公式の改造版**です。
もとは tokanchi の学習ドリル（ドパドリル 非公式改造版）の「しゃかい」を、単体で動くように切り出したものです。

A prefecture quiz for Japanese elementary school kids: tap the map to find prefectures, choose regions and capitals, or type the capital's name. It is an **unofficial** modified version of [Dopa Drill](https://github.com/grmchn/dopa-drill) by gear_machine, reusing its effects engine (the character Dopakichi, music, particles).

## あそびかた

| モード | 内容 |
| --- | --- |
| どこかな？ | 県名を見て、地図をタップ |
| 何県？ | 光った県の名前を 4 択で選ぶ |
| 何地方？ | 県の地方を 8 地方から選ぶ |
| 県庁所在地 | 県庁所在地を 4 択で選ぶ |
| 所在地から さがす | 県庁所在地を見て、その県を地図でタップ |
| 文字で 答える | 光った県の県庁所在地を、キーボードで書いて答える（漢字・かな・カナ、「市」のあるなしを問わない） |
| 地図で おぼえる | 地図を自由にタップして、読み・地方・県庁所在地を見る |

範囲（全国・地方ごと）と問題数を選べます。まちがえた県・まだ出ていない県ほど出やすく、記録はブラウザの localStorage にだけ保存します。

## 動かす / Run

ES Modules なので、`file://` では動きません。`public/` を静的ファイルとして配信してください。

```bash
python3 -m http.server 8000 -d public   # http://localhost:8000/
npm test                                # データと出題のテスト（Node 20 以上、依存パッケージなし）
```

## 構成 / Layout

| パス | 内容 |
| --- | --- |
| `public/index.html` | 入口（しゃかいへのリンクとライセンス） |
| `public/shakai/` | 都道府県ドリル。`js/prefectures.js`（県のデータ）、`js/quiz.js`（出題・答えの判定）、`js/map.js`（地図の表示と操作）、`js/store.js`（記録）、`js/main.js`（画面と演出）、`map/japan.svg`（地図、GFDL） |
| `public/sansu/` | 元のドパドリルから、演出に使うモジュール（`js/` の 6 ファイル）と `style.css`・フォント・アイコンだけを持ってきたもの。`js/audio.js` だけ iPad・iPhone の Safari で音が出ない問題を直している。取り込んだ元のコミットは `scripts/UPSTREAM_COMMIT` |
| `public/fonts/` | 画面の文字だけを集めたサブセットフォント（Zen Maru Gothic） |
| `scripts/gen_map.py` | 地図（`japan.svg`）と県のデータ（`prefectures.js`）の生成 |
| `scripts/build_fonts.sh` | サブセットフォントの作り直し |
| `tests/` | テスト |

## ほかの言語にするとき / Localization notes

- 画面の文は日本語で直接書いてあります: `public/shakai/index.html`、`public/shakai/js/main.js`（メッセージ）、`public/shakai/js/quiz.js`（モード名・問題文・読み上げ）。
- 県名・読み・県庁所在地・地方は `public/shakai/js/prefectures.js`（`scripts/gen_map.py` が生成。直すときは gen_map.py の表を直して作り直す）。
- 文字で答えるモードの判定は `quiz.js` の `normalizeAnswer` / `capitalAnswers`（かな・カナ・全角半角をそろえている）。ローマ字などを認めるなら、ここに書き方を足す。
- フォントは、画面に出る文字だけを入れたサブセットです。文字を変えたら `scripts/build_fonts.sh` で作り直すか、`shakai.css` の `--round` / `--chunky` をほかのフォントに変えてください。

## ライセンス / License

- ソースコード: MIT License（`LICENSE`）。元のドパドリルの部分は Copyright (c) 2026 gear_machine、都道府県ドリルの部分は Copyright (c) 2026 tokanchi。
- キャラクター「ドパキチ」と「ドパドリル」の名前・ロゴは MIT の対象外です。作者の条件（`public/LICENSE-dopa-drill.txt`）により、**営利目的でない二次創作・改造版は連絡なしで公開できますが、非公式であることを明示する必要があり、営利目的での利用には事前の許可が必要**です。このリポジトリをフォークする人にも同じ条件がかかります。
- 地図（`public/shakai/map/japan.svg`）: GNU Free Documentation License 1.3 またはそれ以降。Geolonia「[japanese-prefectures](https://github.com/geolonia/japanese-prefectures)」の地図を加工したもの（色・線の指定を外しただけ）。その元は Lincun さんの [Japan Map Lincun.svg](https://commons.wikimedia.org/wiki/File:Japan_Map_Lincun.svg)（国土交通省 国土数値情報をもとに作成）。
- フォント（Zen Maru Gothic、Dela Gothic One）: SIL Open Font License 1.1。
