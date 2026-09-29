// 都道府県データ。label / box / near は日本地図 SVG（map/japan.svg、GFDL）から scripts/gen_map.py で計算した。
// 座標は地図の viewBox（0 0 1000 1000）の単位。box は本土（いちばん大きいまとまり）の範囲、near は陸でとなり合う県。
// 地方区分は小学校社会の 8 地方（沖縄県は九州地方にふくめる）。

export const REGIONS = [
  { id: 'hokkaido', name: '北海道地方', kana: 'ほっかいどうちほう', color: '#6699cc' },
  { id: 'tohoku', name: '東北地方', kana: 'とうほくちほう', color: '#52bbd1' },
  { id: 'kanto', name: '関東地方', kana: 'かんとうちほう', color: '#71d5cb' },
  { id: 'chubu', name: '中部地方', kana: 'ちゅうぶちほう', color: '#c0c743' },
  { id: 'kinki', name: '近畿地方', kana: 'きんきちほう', color: '#efb838' },
  { id: 'chugoku', name: '中国地方', kana: 'ちゅうごくちほう', color: '#f58c3f' },
  { id: 'shikoku', name: '四国地方', kana: 'しこくちほう', color: '#f1a296' },
  { id: 'kyushu', name: '九州地方', kana: 'きゅうしゅうちほう', color: '#e77a72' },
];

export const MAP_VIEWBOX = [0, 0, 1000, 1000];
export const MAP_URL = new URL('../map/japan.svg', import.meta.url).href;

export const PREFECTURES = [
  {"code": 1, "short": "北海道", "name": "北海道", "kana": "ほっかいどう", "region": "hokkaido", "capital": "札幌市", "capitalKana": "さっぽろし", "color": "#6699cc", "label": [741.8, 164.2], "box": [593.8, 29.2, 279.0, 266.0], "near": []},
  {"code": 2, "short": "青森", "name": "青森県", "kana": "あおもりけん", "region": "tohoku", "capital": "青森市", "capitalKana": "あおもりし", "color": "#52bbd1", "label": [631.2, 339.2], "box": [600.8, 285.2, 88.5, 84.5], "near": [3, 5]},
  {"code": 3, "short": "岩手", "name": "岩手県", "kana": "いわてけん", "region": "tohoku", "capital": "盛岡市", "capitalKana": "もりおかし", "color": "#52bbd1", "label": [674.2, 422.8], "box": [642.2, 354.2, 69.5, 110.0], "near": [2, 4, 5]},
  {"code": 4, "short": "宮城", "name": "宮城県", "kana": "みやぎけん", "region": "tohoku", "capital": "仙台市", "capitalKana": "せんだいし", "color": "#52bbd1", "label": [658.2, 475.8], "box": [625.8, 447.8, 68.5, 80.0], "near": [3, 5, 6, 7]},
  {"code": 5, "short": "秋田", "name": "秋田県", "kana": "あきたけん", "region": "tohoku", "capital": "秋田市", "capitalKana": "あきたし", "color": "#52bbd1", "label": [626.2, 387.8], "box": [593.8, 352.2, 61.5, 105.0], "near": [2, 3, 4, 6]},
  {"code": 6, "short": "山形", "name": "山形県", "kana": "やまがたけん", "region": "tohoku", "capital": "山形市", "capitalKana": "やまがたし", "color": "#52bbd1", "label": [614.8, 476.2], "box": [588.8, 441.8, 54.0, 89.5], "near": [4, 5, 7, 15]},
  {"code": 7, "short": "福島", "name": "福島県", "kana": "ふくしまけん", "region": "tohoku", "capital": "福島市", "capitalKana": "ふくしまし", "color": "#52bbd1", "label": [634.2, 551.8], "box": [569.8, 515.8, 96.0, 76.0], "near": [4, 6, 8, 9, 10, 15]},
  {"code": 8, "short": "茨城", "name": "茨城県", "kana": "いばらきけん", "region": "kanto", "capital": "水戸市", "capitalKana": "みとし", "color": "#71d5cb", "label": [626.8, 632.8], "box": [598.8, 581.8, 61.0, 75.0], "near": [7, 9, 11, 12]},
  {"code": 9, "short": "栃木", "name": "栃木県", "kana": "とちぎけん", "region": "kanto", "capital": "宇都宮市", "capitalKana": "うつのみやし", "color": "#71d5cb", "label": [603.8, 596.2], "box": [579.2, 569.2, 49.5, 61.5], "near": [7, 8, 10, 11]},
  {"code": 10, "short": "群馬", "name": "群馬県", "kana": "ぐんまけん", "region": "kanto", "capital": "前橋市", "capitalKana": "まえばしし", "color": "#71d5cb", "label": [561.2, 610.8], "box": [531.8, 576.2, 66.0, 69.0], "near": [7, 9, 11, 15, 20]},
  {"code": 11, "short": "埼玉", "name": "埼玉県", "kana": "さいたまけん", "region": "kanto", "capital": "さいたま市", "capitalKana": "さいたまし", "color": "#71d5cb", "label": [582.8, 643.2], "box": [548.2, 625.8, 62.0, 34.0], "near": [8, 9, 10, 12, 13, 19, 20]},
  {"code": 12, "short": "千葉", "name": "千葉県", "kana": "ちばけん", "region": "kanto", "capital": "千葉市", "capitalKana": "ちばし", "color": "#71d5cb", "label": [631.2, 665.2], "box": [604.2, 639.2, 56.5, 75.0], "near": [8, 11, 13]},
  {"code": 13, "short": "東京", "name": "東京都", "kana": "とうきょうと", "region": "kanto", "capital": "東京（新宿区）", "capitalKana": "とうきょう（しんじゅくく）", "color": "#71d5cb", "label": [578.2, 661.2], "box": [560.8, 650.8, 50.5, 25.5], "near": [11, 12, 14, 19], "capitalAliases": ["東京", "新宿区", "新宿", "とうきょう", "しんじゅくく", "しんじゅく"]},
  {"code": 14, "short": "神奈川", "name": "神奈川県", "kana": "かながわけん", "region": "kanto", "capital": "横浜市", "capitalKana": "よこはまし", "color": "#71d5cb", "label": [575.8, 678.8], "box": [560.2, 664.8, 44.5, 35.0], "near": [13, 19, 22]},
  {"code": 15, "short": "新潟", "name": "新潟県", "kana": "にいがたけん", "region": "chubu", "capital": "新潟市", "capitalKana": "にいがたし", "color": "#75b777", "label": [550.8, 567.2], "box": [491.8, 479.8, 114.0, 117.0], "near": [6, 7, 10, 16, 20]},
  {"code": 16, "short": "富山", "name": "富山県", "kana": "とやまけん", "region": "chubu", "capital": "富山市", "capitalKana": "とやまし", "color": "#75b777", "label": [483.8, 602.8], "box": [447.8, 581.8, 51.0, 45.0], "near": [15, 17, 20, 21]},
  {"code": 17, "short": "石川", "name": "石川県", "kana": "いしかわけん", "region": "chubu", "capital": "金沢市", "capitalKana": "かなざわし", "color": "#75b777", "label": [435.8, 622.2], "box": [419.8, 546.8, 58.5, 93.5], "near": [16, 18, 21]},
  {"code": 18, "short": "福井", "name": "福井県", "kana": "ふくいけん", "region": "chubu", "capital": "福井市", "capitalKana": "ふくいし", "color": "#75b777", "label": [421.2, 645.8], "box": [378.8, 625.8, 72.0, 59.5], "near": [17, 21, 25, 26]},
  {"code": 19, "short": "山梨", "name": "山梨県", "kana": "やまなしけん", "region": "chubu", "capital": "甲府市", "capitalKana": "こうふし", "color": "#c0c743", "label": [549.2, 667.2], "box": [520.8, 646.2, 49.0, 51.5], "near": [11, 13, 14, 20, 22]},
  {"code": 20, "short": "長野", "name": "長野県", "kana": "ながのけん", "region": "chubu", "capital": "長野市", "capitalKana": "ながのし", "color": "#c0c743", "label": [514.8, 634.2], "box": [476.2, 578.2, 73.0, 118.5], "near": [10, 11, 15, 16, 19, 21, 22, 23]},
  {"code": 21, "short": "岐阜", "name": "岐阜県", "kana": "ぎふけん", "region": "chubu", "capital": "岐阜市", "capitalKana": "ぎふし", "color": "#c0c743", "label": [463.2, 666.2], "box": [421.8, 615.2, 71.0, 84.0], "near": [16, 17, 18, 20, 23, 24, 25]},
  {"code": 22, "short": "静岡", "name": "静岡県", "kana": "しずおかけん", "region": "chubu", "capital": "静岡市", "capitalKana": "しずおかし", "color": "#c0c743", "label": [517.8, 705.2], "box": [484.8, 668.2, 87.5, 66.5], "near": [14, 19, 20, 23]},
  {"code": 23, "short": "愛知", "name": "愛知県", "kana": "あいちけん", "region": "chubu", "capital": "名古屋市", "capitalKana": "なごやし", "color": "#c0c743", "label": [477.8, 708.8], "box": [441.2, 682.2, 61.5, 53.5], "near": [20, 21, 22, 24]},
  {"code": 24, "short": "三重", "name": "三重県", "kana": "みえけん", "region": "kinki", "capital": "津市", "capitalKana": "つし", "color": "#efb838", "label": [428.8, 743.2], "box": [397.2, 692.8, 57.5, 97.5], "near": [21, 23, 25, 26, 29, 30]},
  {"code": 25, "short": "滋賀", "name": "滋賀県", "kana": "しがけん", "region": "kinki", "capital": "大津市", "capitalKana": "おおつし", "color": "#efb838", "label": [416.2, 704.8], "box": [394.2, 663.8, 36.0, 57.5], "near": [18, 21, 24, 26]},
  {"code": 26, "short": "京都", "name": "京都府", "kana": "きょうとふ", "region": "kinki", "capital": "京都市", "capitalKana": "きょうとし", "color": "#efb838", "label": [384.2, 696.8], "box": [346.8, 657.8, 61.5, 70.0], "near": [18, 24, 25, 27, 28, 29]},
  {"code": 27, "short": "大阪", "name": "大阪府", "kana": "おおさかふ", "region": "kinki", "capital": "大阪市", "capitalKana": "おおさかし", "color": "#efb838", "label": [379.8, 741.2], "box": [357.2, 704.8, 34.5, 49.5], "near": [26, 28, 29, 30]},
  {"code": 28, "short": "兵庫", "name": "兵庫県", "kana": "ひょうごけん", "region": "kinki", "capital": "神戸市", "capitalKana": "こうべし", "color": "#efb838", "label": [341.2, 700.8], "box": [313.8, 663.8, 64.0, 68.0], "near": [26, 27, 31, 33]},
  {"code": 29, "short": "奈良", "name": "奈良県", "kana": "ならけん", "region": "kinki", "capital": "奈良市", "capitalKana": "ならし", "color": "#efb838", "label": [396.2, 765.2], "box": [380.8, 722.2, 37.0, 59.0], "near": [24, 26, 27, 30]},
  {"code": 30, "short": "和歌山", "name": "和歌山県", "kana": "わかやまけん", "region": "kinki", "capital": "和歌山市", "capitalKana": "わかやまし", "color": "#efb838", "label": [371.2, 773.2], "box": [354.8, 748.2, 50.5, 60.5], "near": [24, 27, 29]},
  {"code": 31, "short": "鳥取", "name": "鳥取県", "kana": "とっとりけん", "region": "chugoku", "capital": "鳥取市", "capitalKana": "とっとりし", "color": "#f58c3f", "label": [314.8, 681.2], "box": [255.2, 666.8, 73.0, 34.0], "near": [28, 32, 33, 34]},
  {"code": 32, "short": "島根", "name": "島根県", "kana": "しまねけん", "region": "chugoku", "capital": "松江市", "capitalKana": "まつえし", "color": "#f58c3f", "label": [249.8, 682.2], "box": [176.2, 664.8, 90.0, 80.0], "near": [31, 34, 35]},
  {"code": 33, "short": "岡山", "name": "岡山県", "kana": "おかやまけん", "region": "chugoku", "capital": "岡山市", "capitalKana": "おかやまし", "color": "#f58c3f", "label": [289.2, 711.8], "box": [262.2, 682.2, 61.0, 59.5], "near": [28, 31, 34]},
  {"code": 34, "short": "広島", "name": "広島県", "kana": "ひろしまけん", "region": "chugoku", "capital": "広島市", "capitalKana": "ひろしまし", "color": "#f58c3f", "label": [243.2, 723.2], "box": [195.8, 696.8, 75.0, 57.0], "near": [31, 32, 33, 35]},
  {"code": 35, "short": "山口", "name": "山口県", "kana": "やまぐちけん", "region": "chugoku", "capital": "山口市", "capitalKana": "やまぐちし", "color": "#f58c3f", "label": [167.8, 746.8], "box": [131.8, 720.2, 74.0, 55.5], "near": [32, 34]},
  {"code": 36, "short": "徳島", "name": "徳島県", "kana": "とくしまけん", "region": "shikoku", "capital": "徳島市", "capitalKana": "とくしまし", "color": "#f1a296", "label": [313.8, 777.8], "box": [279.8, 755.2, 58.5, 44.5], "near": [37, 38, 39]},
  {"code": 37, "short": "香川", "name": "香川県", "kana": "かがわけん", "region": "shikoku", "capital": "高松市", "capitalKana": "たかまつし", "color": "#f1a296", "label": [296.8, 755.2], "box": [276.2, 744.2, 46.0, 24.5], "near": [36, 38]},
  {"code": 38, "short": "愛媛", "name": "愛媛県", "kana": "えひめけん", "region": "shikoku", "capital": "松山市", "capitalKana": "まつやまし", "color": "#f1a296", "label": [242.8, 778.8], "box": [190.8, 758.8, 91.0, 78.0], "near": [36, 37, 39]},
  {"code": 39, "short": "高知", "name": "高知県", "kana": "こうちけん", "region": "shikoku", "capital": "高知市", "capitalKana": "こうちし", "color": "#f1a296", "label": [260.2, 793.8], "box": [222.2, 777.2, 91.5, 71.0], "near": [36, 38]},
  {"code": 40, "short": "福岡", "name": "福岡県", "kana": "ふくおかけん", "region": "kyushu", "capital": "福岡市", "capitalKana": "ふくおかし", "color": "#e77a72", "label": [122.2, 786.2], "box": [86.2, 763.8, 61.0, 59.5], "near": [41, 43, 44]},
  {"code": 41, "short": "佐賀", "name": "佐賀県", "kana": "さがけん", "region": "kyushu", "capital": "佐賀市", "capitalKana": "さがし", "color": "#e77a72", "label": [86.2, 804.2], "box": [70.2, 785.8, 42.0, 39.5], "near": [40, 42]},
  {"code": 42, "short": "長崎", "name": "長崎県", "kana": "ながさきけん", "region": "kyushu", "capital": "長崎市", "capitalKana": "ながさきし", "color": "#e77a72", "label": [82.2, 825.2], "box": [49.8, 793.8, 51.0, 54.0], "near": [41]},
  {"code": 43, "short": "熊本", "name": "熊本県", "kana": "くまもとけん", "region": "kyushu", "capital": "熊本市", "capitalKana": "くまもとし", "color": "#e77a72", "label": [129.8, 838.2], "box": [96.8, 813.2, 55.5, 68.5], "near": [40, 44, 45, 46]},
  {"code": 44, "short": "大分", "name": "大分県", "kana": "おおいたけん", "region": "kyushu", "capital": "大分市", "capitalKana": "おおいたし", "color": "#e77a72", "label": [164.8, 826.2], "box": [126.8, 783.2, 66.5, 61.5], "near": [40, 43, 45]},
  {"code": 45, "short": "宮崎", "name": "宮崎県", "kana": "みやざきけん", "region": "kyushu", "capital": "宮崎市", "capitalKana": "みやざきし", "color": "#e77a72", "label": [151.8, 857.8], "box": [115.2, 837.8, 67.0, 93.5], "near": [43, 44, 46]},
  {"code": 46, "short": "鹿児島", "name": "鹿児島県", "kana": "かごしまけん", "region": "kyushu", "capital": "鹿児島市", "capitalKana": "かごしまし", "color": "#e77a72", "label": [103.2, 895.2], "box": [80.8, 875.8, 59.0, 76.0], "near": [43, 45]},
  {"code": 47, "short": "沖縄", "name": "沖縄県", "kana": "おきなわけん", "region": "kyushu", "capital": "那覇市", "capitalKana": "なはし", "color": "#e77a72", "label": [324.8, 197.8], "box": [290.2, 188.8, 40.0, 47.0], "near": []},
];

export const PREF = Object.fromEntries(PREFECTURES.map((p) => [p.code, p]));
export const REGION = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
