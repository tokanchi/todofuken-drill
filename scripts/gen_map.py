"""日本地図 SVG と都道府県データ（ラベル位置・範囲・となりの県）を作る。

元データ: Geolonia「japanese-prefectures」の map-full.svg（GFDL）
  https://github.com/geolonia/japanese-prefectures
  さらにその元は Lincun「Japan Map Lincun.svg」（Wikimedia Commons、GFDL 1.2 以降 / CC BY-SA 3.0、国土数値情報をもとに作成）

出力:
  public/shakai/map/japan.svg      … 加工した地図（GFDL）。塗り・線の属性を外して CSS で色分けできるようにしただけ
  public/shakai/js/prefectures.js  … 県のデータと、地図から計算したラベル位置・範囲・となりの県

使い方（Playwright と numpy と Pillow が入った python で）:
  python gen_map.py path/to/map-full.svg
ラベル位置などは、県ごとに別の色で塗った地図を 2 倍の解像度で描き、画素を数えて求める。
"""
import io
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent / 'public'
SCALE = 2  # 1 単位 = 2 画素で描く
SIZE = 1000

# コード|短い名前|正式名|読み|地方|県庁所在地|読み
TABLE = """1|北海道|北海道|ほっかいどう|hokkaido|札幌市|さっぽろし
2|青森|青森県|あおもりけん|tohoku|青森市|あおもりし
3|岩手|岩手県|いわてけん|tohoku|盛岡市|もりおかし
4|宮城|宮城県|みやぎけん|tohoku|仙台市|せんだいし
5|秋田|秋田県|あきたけん|tohoku|秋田市|あきたし
6|山形|山形県|やまがたけん|tohoku|山形市|やまがたし
7|福島|福島県|ふくしまけん|tohoku|福島市|ふくしまし
8|茨城|茨城県|いばらきけん|kanto|水戸市|みとし
9|栃木|栃木県|とちぎけん|kanto|宇都宮市|うつのみやし
10|群馬|群馬県|ぐんまけん|kanto|前橋市|まえばしし
11|埼玉|埼玉県|さいたまけん|kanto|さいたま市|さいたまし
12|千葉|千葉県|ちばけん|kanto|千葉市|ちばし
13|東京|東京都|とうきょうと|kanto|東京（新宿区）|とうきょう（しんじゅくく）
14|神奈川|神奈川県|かながわけん|kanto|横浜市|よこはまし
15|新潟|新潟県|にいがたけん|chubu|新潟市|にいがたし
16|富山|富山県|とやまけん|chubu|富山市|とやまし
17|石川|石川県|いしかわけん|chubu|金沢市|かなざわし
18|福井|福井県|ふくいけん|chubu|福井市|ふくいし
19|山梨|山梨県|やまなしけん|chubu|甲府市|こうふし
20|長野|長野県|ながのけん|chubu|長野市|ながのし
21|岐阜|岐阜県|ぎふけん|chubu|岐阜市|ぎふし
22|静岡|静岡県|しずおかけん|chubu|静岡市|しずおかし
23|愛知|愛知県|あいちけん|chubu|名古屋市|なごやし
24|三重|三重県|みえけん|kinki|津市|つし
25|滋賀|滋賀県|しがけん|kinki|大津市|おおつし
26|京都|京都府|きょうとふ|kinki|京都市|きょうとし
27|大阪|大阪府|おおさかふ|kinki|大阪市|おおさかし
28|兵庫|兵庫県|ひょうごけん|kinki|神戸市|こうべし
29|奈良|奈良県|ならけん|kinki|奈良市|ならし
30|和歌山|和歌山県|わかやまけん|kinki|和歌山市|わかやまし
31|鳥取|鳥取県|とっとりけん|chugoku|鳥取市|とっとりし
32|島根|島根県|しまねけん|chugoku|松江市|まつえし
33|岡山|岡山県|おかやまけん|chugoku|岡山市|おかやまし
34|広島|広島県|ひろしまけん|chugoku|広島市|ひろしまし
35|山口|山口県|やまぐちけん|chugoku|山口市|やまぐちし
36|徳島|徳島県|とくしまけん|shikoku|徳島市|とくしまし
37|香川|香川県|かがわけん|shikoku|高松市|たかまつし
38|愛媛|愛媛県|えひめけん|shikoku|松山市|まつやまし
39|高知|高知県|こうちけん|shikoku|高知市|こうちし
40|福岡|福岡県|ふくおかけん|kyushu|福岡市|ふくおかし
41|佐賀|佐賀県|さがけん|kyushu|佐賀市|さがし
42|長崎|長崎県|ながさきけん|kyushu|長崎市|ながさきし
43|熊本|熊本県|くまもとけん|kyushu|熊本市|くまもとし
44|大分|大分県|おおいたけん|kyushu|大分市|おおいたし
45|宮崎|宮崎県|みやざきけん|kyushu|宮崎市|みやざきし
46|鹿児島|鹿児島県|かごしまけん|kyushu|鹿児島市|かごしまし
47|沖縄|沖縄県|おきなわけん|kyushu|那覇市|なはし"""

REGION_COLOR = {'hokkaido': '#6699cc', 'tohoku': '#52bbd1', 'kanto': '#71d5cb', 'chubu': '#c0c743', 'kinki': '#efb838',
                'chugoku': '#f58c3f', 'shikoku': '#f1a296', 'kyushu': '#e77a72'}
HOKURIKU = {15, 16, 17, 18}  # 中部地方のうち北陸は色を変える（参考にした地図と同じ）

# 陸でとなり合う県（県境の一覧）。地図の画素から求めると、鳴門海峡（兵庫・徳島）や
# 4 県が集まるあたり（茨城・群馬）のように近すぎる所を区別できないので、この一覧を正とし、
# 画素の解析は「一覧のとなりが地図でも接しているか」の検算に使う
NEAR = {1: [], 2: [3, 5], 3: [2, 4, 5], 4: [3, 5, 6, 7], 5: [2, 3, 4, 6], 6: [4, 5, 7, 15], 7: [4, 6, 8, 9, 10, 15],
        8: [7, 9, 11, 12], 9: [7, 8, 10, 11], 10: [7, 9, 11, 15, 20], 11: [8, 9, 10, 12, 13, 19, 20], 12: [8, 11, 13],
        13: [11, 12, 14, 19], 14: [13, 19, 22], 15: [6, 7, 10, 16, 20], 16: [15, 17, 20, 21], 17: [16, 18, 21],
        18: [17, 21, 25, 26], 19: [11, 13, 14, 20, 22], 20: [10, 11, 15, 16, 19, 21, 22, 23], 21: [16, 17, 18, 20, 23, 24, 25],
        22: [14, 19, 20, 23], 23: [20, 21, 22, 24], 24: [21, 23, 25, 26, 29, 30], 25: [18, 21, 24, 26],
        26: [18, 24, 25, 27, 28, 29], 27: [26, 28, 29, 30], 28: [26, 27, 31, 33], 29: [24, 26, 27, 30], 30: [24, 27, 29],
        31: [28, 32, 33, 34], 32: [31, 34, 35], 33: [28, 31, 34], 34: [31, 32, 33, 35], 35: [32, 34], 36: [37, 38, 39],
        37: [36, 38], 38: [36, 37, 39], 39: [36, 38], 40: [41, 43, 44], 41: [40, 42], 42: [41], 43: [40, 44, 45, 46],
        44: [40, 43, 45], 45: [43, 44, 46], 46: [43, 45], 47: []}

# 県庁所在地の答えとして認める別の書き方（文字入力で使う）
ALIASES = {13: ['東京', '新宿区', '新宿', 'とうきょう', 'しんじゅくく', 'しんじゅく']}

HEADER = """<!--
  日本地図（都道府県）
  この SVG は Geolonia「japanese-prefectures」の map-full.svg（https://github.com/geolonia/japanese-prefectures、GFDL）を加工したものです。
  その元データは Lincun「Japan Map Lincun.svg」（https://commons.wikimedia.org/wiki/File:Japan_Map_Lincun.svg、
  GFDL 1.2 以降 / CC BY-SA 3.0、国土交通省 国土数値情報をもとに作成）です。
  加工内容: 塗り・線・線幅などの表示用の属性を外し（CSS で色分けするため）、このコメントを追加しました。図形は変えていません。
  ライセンス: GNU Free Documentation License 1.3（全文は ../../LICENSE-GFDL-1.3.txt）。
  Permission is granted to copy, distribute and/or modify this document under the terms of the GNU Free Documentation License,
  Version 1.3 or any later version published by the Free Software Foundation; with no Invariant Sections, no Front-Cover Texts,
  and no Back-Cover Texts.
-->
"""


def derive_svg(src):
    svg = re.sub(r'<\?xml[^>]*\?>\s*', '', src)
    for attr in ('fill', 'stroke', 'stroke-width', 'fill-rule', 'stroke-linejoin', 'style'):
        svg = re.sub(r'\s%s="[^"]*"' % attr, '', svg)
    svg = svg.replace('<svg ', '<svg ', 1)
    return HEADER + svg.strip() + '\n'


def rasterize(svg):
    # 県ごとに R = コード、G = 128、B = 64 で塗る。境界をぼかさないよう crispEdges
    colored = re.sub(r'(<g class="[^"]*prefecture" data-code="(\d+)")',
                     lambda m: f'{m.group(1)} style="fill:rgb({m.group(2)},128,64)"', svg)
    html = ('<html><body style="margin:0;background:#fff">' + colored +
            f'<style>svg{{width:{SIZE * SCALE}px;height:{SIZE * SCALE}px;display:block}}'
            '*{shape-rendering:crispEdges;stroke:none}.boundary-line{display:none}</style></body></html>')
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={'width': SIZE * SCALE, 'height': SIZE * SCALE})
        pg.set_content(html)
        png = pg.screenshot()
        b.close()
    img = np.array(Image.open(io.BytesIO(png)).convert('RGB')).astype(np.int16)
    codes = np.where((np.abs(img[..., 1] - 128) <= 1) & (np.abs(img[..., 2] - 64) <= 1), img[..., 0], 0)
    return codes


def erode(m):
    e = m.copy()
    e[1:, :] &= m[:-1, :]
    e[:-1, :] &= m[1:, :]
    e[:, 1:] &= m[:, :-1]
    e[:, :-1] &= m[:, 1:]
    e[0, :] = e[-1, :] = False
    e[:, 0] = e[:, -1] = False
    return e


def dilate_within(seed, mask):
    # seed から mask の中だけを広げて、seed を含むひとかたまりを取り出す
    cur = seed & mask
    while True:
        n = cur.copy()
        n[1:, :] |= cur[:-1, :]
        n[:-1, :] |= cur[1:, :]
        n[:, 1:] |= cur[:, :-1]
        n[:, :-1] |= cur[:, 1:]
        n &= mask
        if (n == cur).all():
            return cur
        cur = n


def analyse(codes):
    out = {}
    for code in range(1, 48):
        ys, xs = np.nonzero(codes == code)
        assert len(xs) > 0, f'code {code} not rendered'
        y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        mask = np.zeros((y1 - y0 + 2, x1 - x0 + 2), bool)
        mask[1:-1, 1:-1] = codes[y0:y1, x0:x1] == code
        # 内側から削っていき、最後まで残った点をラベル位置にする（いちばん奥まった場所）
        m = mask
        last = m
        while m.any():
            last = m
            m = erode(m)
        ly, lx = np.nonzero(last)
        cy, cx = ly.mean(), lx.mean()
        i = int(np.argmin((ly - cy) ** 2 + (lx - cx) ** 2))
        py, px = ly[i], lx[i]
        seed = np.zeros_like(mask)
        seed[py, px] = True
        main = dilate_within(seed, mask)
        my, mx = np.nonzero(main)
        to_unit = lambda v, off: round(float(v + off - 1 + 0.5) / SCALE, 1)
        out[code] = {
            'label': [to_unit(px, x0), to_unit(py, y0)],
            'box': [to_unit(mx.min(), x0), to_unit(my.min(), y0),
                    round(float(mx.max() - mx.min() + 1) / SCALE, 1), round(float(my.max() - my.min() + 1) / SCALE, 1)],
            'area': round(int(mask.sum()) / SCALE ** 2),
        }
    # 陸でとなり合う県: 3 画素以内に別の県の画素があれば、となりとみなす
    near = {c: set() for c in range(1, 48)}
    r = 3
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx == 0 and dy == 0:
                continue
            a = codes[max(0, dy):codes.shape[0] + min(0, dy), max(0, dx):codes.shape[1] + min(0, dx)]
            b = codes[max(0, -dy):codes.shape[0] + min(0, -dy), max(0, -dx):codes.shape[1] + min(0, -dx)]
            sel = (a > 0) & (b > 0) & (a != b)
            for x, y in set(zip(a[sel].tolist(), b[sel].tolist())):
                near[x].add(y)
    for c in out:
        missing = set(NEAR[c]) - near[c]
        assert not missing, f'{c}: 一覧ではとなりなのに地図で接していない {missing}'
        extra = near[c] - set(NEAR[c])
        if extra:
            print(f'  （参考）{c} は地図上で {sorted(extra)} とも近いが、陸の県境ではないので除く')
        out[c]['near'] = NEAR[c]
    return out


def main():
    src = Path(sys.argv[1]).read_text(encoding='utf-8')
    svg = derive_svg(src)
    (ROOT / 'shakai' / 'map').mkdir(parents=True, exist_ok=True)
    (ROOT / 'shakai' / 'map' / 'japan.svg').write_text(svg, encoding='utf-8')
    geo = analyse(rasterize(svg))
    prefs = []
    for line in TABLE.splitlines():
        code, short, name, kana, region, cap, cap_kana = line.split('|')
        code = int(code)
        color = '#75b777' if code in HOKURIKU else REGION_COLOR[region]
        p = {'code': code, 'short': short, 'name': name, 'kana': kana, 'region': region, 'capital': cap, 'capitalKana': cap_kana,
             'color': color, **{k: geo[code][k] for k in ('label', 'box', 'near')}}
        if code in ALIASES:
            p['capitalAliases'] = ALIASES[code]
        prefs.append(p)
    js = [
        '// 都道府県データ。label / box / near は日本地図 SVG（map/japan.svg、GFDL）から scripts/gen_map.py で計算した。',
        '// 座標は地図の viewBox（0 0 1000 1000）の単位。box は本土（いちばん大きいまとまり）の範囲、near は陸でとなり合う県。',
        '// 地方区分は小学校社会の 8 地方（沖縄県は九州地方にふくめる）。',
        '',
        'export const REGIONS = [',
        "  { id: 'hokkaido', name: '北海道地方', kana: 'ほっかいどうちほう', color: '#6699cc' },",
        "  { id: 'tohoku', name: '東北地方', kana: 'とうほくちほう', color: '#52bbd1' },",
        "  { id: 'kanto', name: '関東地方', kana: 'かんとうちほう', color: '#71d5cb' },",
        "  { id: 'chubu', name: '中部地方', kana: 'ちゅうぶちほう', color: '#c0c743' },",
        "  { id: 'kinki', name: '近畿地方', kana: 'きんきちほう', color: '#efb838' },",
        "  { id: 'chugoku', name: '中国地方', kana: 'ちゅうごくちほう', color: '#f58c3f' },",
        "  { id: 'shikoku', name: '四国地方', kana: 'しこくちほう', color: '#f1a296' },",
        "  { id: 'kyushu', name: '九州地方', kana: 'きゅうしゅうちほう', color: '#e77a72' },",
        '];',
        '',
        'export const MAP_VIEWBOX = [0, 0, 1000, 1000];',
        "export const MAP_URL = new URL('../map/japan.svg', import.meta.url).href;",
        '',
        'export const PREFECTURES = [',
        *['  ' + json.dumps(p, ensure_ascii=False) + ',' for p in prefs],
        '];',
        '',
        'export const PREF = Object.fromEntries(PREFECTURES.map((p) => [p.code, p]));',
        'export const REGION = Object.fromEntries(REGIONS.map((r) => [r.id, r]));',
        '',
    ]
    (ROOT / 'shakai' / 'js' / 'prefectures.js').write_text('\n'.join(js), encoding='utf-8')
    for p in prefs:
        if p['code'] in (1, 13, 21, 27, 37, 46, 47):
            print(p['name'], 'label', p['label'], 'box', p['box'], 'near', [q['short'] for q in prefs if q['code'] in p['near']])
    print('ok', len(prefs))


if __name__ == '__main__':
    main()
