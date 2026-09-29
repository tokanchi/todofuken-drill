// しゃかい（都道府県）のデータと出題ロジックのテスト。実行: cd tools/drill && npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { PREFECTURES, PREF, REGIONS, MAP_VIEWBOX } from '../public/shakai/js/prefectures.js';
import { RANGES, MODES, makeRng, rangeCodes, pickTargets, buildQuestion, distractors, weightOf, normalizeAnswer, checkCapital, kanaHint } from '../public/shakai/js/quiz.js';

test('47 都道府県がそろっていて、コードは 1〜47', () => {
  assert.equal(PREFECTURES.length, 47);
  assert.deepEqual(PREFECTURES.map((p) => p.code), Array.from({ length: 47 }, (_, i) => i + 1));
  assert.equal(new Set(PREFECTURES.map((p) => p.name)).size, 47);
  assert.equal(new Set(PREFECTURES.map((p) => p.capital)).size, 47);
});

test('地方区分は小学校社会の 8 地方', () => {
  const count = Object.fromEntries(REGIONS.map((r) => [r.id, 0]));
  for (const p of PREFECTURES) {
    assert.ok(p.region in count, `${p.name} の地方が不正`);
    count[p.region] += 1;
  }
  assert.deepEqual(count, { hokkaido: 1, tohoku: 6, kanto: 7, chubu: 9, kinki: 7, chugoku: 5, shikoku: 4, kyushu: 8 });
  assert.equal(PREF[24].region, 'kinki', '三重県は近畿地方');
  assert.equal(PREF[19].region, 'chubu', '山梨県は中部地方');
  assert.equal(PREF[47].region, 'kyushu', '沖縄県は九州地方にふくめる');
});

test('県庁所在地（とくに県名とちがうもの）', () => {
  const byName = Object.fromEntries(PREFECTURES.map((p) => [p.name, p.capital]));
  assert.equal(byName['北海道'], '札幌市');
  assert.equal(byName['岩手県'], '盛岡市');
  assert.equal(byName['宮城県'], '仙台市');
  assert.equal(byName['茨城県'], '水戸市');
  assert.equal(byName['栃木県'], '宇都宮市');
  assert.equal(byName['群馬県'], '前橋市');
  assert.equal(byName['埼玉県'], 'さいたま市');
  assert.equal(byName['神奈川県'], '横浜市');
  assert.equal(byName['石川県'], '金沢市');
  assert.equal(byName['山梨県'], '甲府市');
  assert.equal(byName['愛知県'], '名古屋市');
  assert.equal(byName['三重県'], '津市');
  assert.equal(byName['滋賀県'], '大津市');
  assert.equal(byName['兵庫県'], '神戸市');
  assert.equal(byName['島根県'], '松江市');
  assert.equal(byName['香川県'], '高松市');
  assert.equal(byName['愛媛県'], '松山市');
  assert.equal(byName['沖縄県'], '那覇市');
});

test('地図: 県の範囲とラベルが地図の中にあり、ラベルは県の本土部分の中', () => {
  const [X, Y, W, H] = MAP_VIEWBOX;
  for (const p of PREFECTURES) {
    const [x, y, w, h] = p.box;
    assert.ok(w > 0 && h > 0 && x >= X && y >= Y && x + w <= X + W && y + h <= Y + H, `${p.name} の位置`);
    assert.ok(p.label[0] > x && p.label[0] < x + w && p.label[1] > y && p.label[1] < y + h, `${p.name} のラベル`);
  }
});

test('地図: となりの県（陸で接する県）は、たがいに登録されている', () => {
  for (const p of PREFECTURES) {
    for (const c of p.near) assert.ok(PREF[c].near.includes(p.code), `${p.name} と ${PREF[c].name}`);
  }
  const names = (code) => PREF[code].near.map((c) => PREF[c].short).sort();
  assert.deepEqual(PREF[1].near, [], '北海道は陸でとなりの県がない');
  assert.deepEqual(PREF[47].near, [], '沖縄県も');
  assert.deepEqual(names(13), ['千葉', '埼玉', '山梨', '神奈川'].sort());
  assert.equal(PREF[20].near.length, 8, '長野県は 8 県と接する');
  assert.ok(!PREF[8].near.includes(10), '茨城と群馬は接していない');
  assert.ok(!PREF[28].near.includes(36), '兵庫と徳島は海をはさむ');
});

test('文字で答える: 漢字・ひらがな・カタカナ・「市」のあるなし を正解にする', () => {
  for (const ok of ['仙台市', '仙台', 'せんだいし', 'せんだい', 'センダイ', 'ｾﾝﾀﾞｲ', ' 仙台 ']) assert.ok(checkCapital(4, ok), ok);
  for (const ng of ['', '宮城', 'せんだ', '盛岡市']) assert.ok(!checkCapital(4, ng), ng);
  for (const ok of ['東京', 'とうきょう', '新宿区', 'しんじゅく']) assert.ok(checkCapital(13, ok), ok);
  for (const ok of ['津', 'つ', '津市', 'つし']) assert.ok(checkCapital(24, ok), ok);
  assert.ok(checkCapital(11, 'さいたま') && checkCapital(11, 'サイタマ市'));
  assert.equal(normalizeAnswer('ナゴヤ　シ'), 'なごやし');
  // すべての県で、表示している書き方そのものは正解になる
  for (const p of PREFECTURES) {
    assert.ok(checkCapital(p.code, p.capital), p.capital);
    assert.ok(checkCapital(p.code, p.capitalKana), p.capitalKana);
  }
});

test('文字で答える: ヒントのよみ', () => {
  assert.equal(kanaHint(PREF[4], 1), 'せ○○○○');
  assert.equal(kanaHint(PREF[4], 2), 'せ○だ○し');
  assert.equal(kanaHint(PREF[13], 1), 'と○○○○');
});

test('出題範囲は、どれも 4 択が作れる大きさ', () => {
  assert.equal(rangeCodes('all').length, 47);
  const total = RANGES.filter((r) => r.id !== 'all').reduce((sum, r) => sum + rangeCodes(r.id).length, 0);
  assert.equal(total, 47, '地方ごとの範囲で全県をちょうど 1 回ずつ覆う');
  for (const r of RANGES) assert.ok(rangeCodes(r.id).length >= 4, r.id);
});

test('pickTargets: 重複なし・指定の数・「ぜんぶ」は全県', () => {
  const rng = makeRng(1);
  const codes = rangeCodes('all');
  const ten = pickTargets({ codes, count: 10, rng });
  assert.equal(ten.length, 10);
  assert.equal(new Set(ten).size, 10);
  const all = pickTargets({ codes, count: 99, rng });
  assert.deepEqual([...all].sort((a, b) => a - b), codes);
});

test('pickTargets: 苦手な県（前回まちがえた県）ほど出やすい', () => {
  const codes = rangeCodes('kanto');
  const weak = 13;
  const statOf = (code) => (code === weak ? { n: 3, first: 0, lastFirst: false } : { n: 5, first: 5, lastFirst: true });
  assert.ok(weightOf(statOf(weak)) > weightOf(statOf(8)) * 3);
  const rng = makeRng(42);
  let hits = 0;
  for (let i = 0; i < 2000; i++) if (pickTargets({ codes, count: 1, rng, statOf })[0] === weak) hits += 1;
  assert.ok(hits > 2000 / codes.length * 2, `苦手な県が選ばれた回数 ${hits}`);
});

test('makeRng は同じ種なら同じ並び', () => {
  const a = makeRng(7); const b = makeRng(7);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test('distractors: 範囲内から、答えと重ならない 3 県を、となりの県から優先して選ぶ', () => {
  const rng = makeRng(3);
  const pool = rangeCodes('chubu');
  for (const code of pool) {
    const d = distractors(code, 3, { rng, pool });
    assert.equal(d.length, 3);
    assert.equal(new Set(d).size, 3);
    assert.ok(!d.includes(code));
    assert.ok(d.every((c) => pool.includes(c)), '中部の範囲内から選ぶ');
  }
  // 岐阜県のとなり（地図上）は富山・石川・福井・長野・愛知・三重・滋賀。範囲が全国なら、ほぼとなりから選ばれる
  const near = new Set(PREF[21].near);
  const d = distractors(21, 3, { rng, pool: rangeCodes('all') });
  assert.ok(d.every((c) => near.has(c)), `岐阜のまぎらわしい選択肢: ${d.map((c) => PREF[c].name)}`);
});

test('buildQuestion: すべてのモード・すべての県で問題が作れる', () => {
  const rng = makeRng(9);
  for (const mode of MODES.map((m) => m.id)) {
    for (const range of RANGES) {
      const pool = rangeCodes(range.id);
      for (const code of pool) {
        const q = buildQuestion({ mode, code, rng, pool });
        assert.equal(q.code, code);
        assert.ok(q.prompt.length > 0);
        if (q.input === 'choice') {
          assert.equal(q.choices.length, 4, `${mode} ${code}`);
          assert.equal(new Set(q.choices.map((c) => c.id)).size, 4);
          assert.ok(q.choices.some((c) => c.id === q.answer));
          assert.ok(q.choices.every((c) => c.text && c.kana));
        } else if (q.input === 'region') {
          assert.equal(q.choices.length, 8);
          assert.equal(q.answer, PREF[code].region);
          assert.equal(q.colors, false, '地方の色で答えがわからないように');
        } else if (q.input === 'text') {
          assert.equal(mode, 'capitalType');
          assert.equal(q.highlight, code, '地図で県を光らせる');
          assert.ok(!q.choices);
        } else {
          assert.equal(q.input, 'map');
          assert.equal(q.answer, code);
          assert.equal(q.labels, 'none', '地図に名前を出さない');
        }
      }
    }
  }
});
