// 都道府県ドリルの出題ロジック（画面に依存しない。Node のテストからも使う）。
import { PREFECTURES, PREF, REGIONS, REGION } from './prefectures.js';

// 出題範囲。小さい地方はまとめて、どの範囲でも 4 択が作れるようにしている
export const RANGES = [
  { id: 'all', label: '全国', regions: REGIONS.map((r) => r.id) },
  { id: 'hokkaido-tohoku', label: '北海道・東北', regions: ['hokkaido', 'tohoku'] },
  { id: 'kanto', label: '関東', regions: ['kanto'] },
  { id: 'chubu', label: '中部', regions: ['chubu'] },
  { id: 'kinki', label: '近畿', regions: ['kinki'] },
  { id: 'chugoku-shikoku', label: '中国・四国', regions: ['chugoku', 'shikoku'] },
  { id: 'kyushu', label: '九州・沖縄', regions: ['kyushu'] },
];
export const RANGE = Object.fromEntries(RANGES.map((r) => [r.id, r]));

// 画面の文は、小学 3 年までに習う漢字は そのまま使い、それより上の漢字を含む ことばは ふりがな付き（{ text, kana }）にする
export const KENCHO = { text: '県庁所在地', kana: 'けんちょうしょざいち' };
const SHOZAICHI = { text: '所在地', kana: 'しょざいち' };

// input: map = 地図をタップ / choice = 4 択 / region = 8 地方から選ぶ / text = 文字で答える
// title と chip は prompt と同じ [文字列 | { text, kana }] の並び
export const MODES = [
  { id: 'find', title: ['どこかな？'], chip: ['県の 場所'], input: 'map' },
  { id: 'name', title: ['何県？'], chip: ['県の 名前'], input: 'choice' },
  { id: 'region', title: ['何地方？'], chip: ['地方'], input: 'region' },
  { id: 'capital', title: [KENCHO], chip: [KENCHO], input: 'choice' },
  { id: 'capitalFind', title: [SHOZAICHI, 'から さがす'], chip: [KENCHO], input: 'map' },
  { id: 'capitalType', title: ['文字で 答える'], chip: [KENCHO], input: 'text' },
];
export const MODE = Object.fromEntries(MODES.map((m) => [m.id, m]));

// 決定的な擬似乱数（mulberry32）
export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function rangeCodes(rangeId) {
  const range = RANGE[rangeId] || RANGE.all;
  return PREFECTURES.filter((p) => range.regions.includes(p.region)).map((p) => p.code);
}

// 苦手ほど出やすくする重み。まだ出ていない県・前回まちがえた県を優先する
export function weightOf(stat) {
  if (!stat || !stat.n) return 1.6;
  let w = 1 / (1 + stat.first * 0.7);
  if (stat.lastFirst === false) w += 1.5;
  return w;
}

// 重み付きの非復元抽出（Efraimidis–Spirakis）。count が範囲より多ければ全部を並べ替える
export function pickTargets({ codes, count, rng, statOf = () => null }) {
  if (count >= codes.length) return shuffle(codes, rng);
  return codes
    .map((code) => ({ code, key: rng() ** (1 / weightOf(statOf(code))) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, count)
    .map((x) => x.code);
}

// まぎらわしい選択肢: 陸でとなりの県 → 地図で近い県 → 同じ地方 → 範囲内 → 全国 の順に選ぶ
const dist2 = (a, b) => (a.label[0] - b.label[0]) ** 2 + (a.label[1] - b.label[1]) ** 2;
export function distractors(code, n, { rng, pool }) {
  const target = PREF[code];
  const inPool = new Set(pool);
  const nearest = pool.filter((c) => c !== code).sort((a, b) => dist2(PREF[a], target) - dist2(PREF[b], target)).slice(0, 5);
  const tiers = [
    target.near.filter((c) => inPool.has(c)),
    nearest,
    pool.filter((c) => PREF[c].region === target.region),
    pool,
    PREFECTURES.map((p) => p.code),
  ];
  const out = [];
  for (const tier of tiers) {
    for (const c of shuffle(tier, rng)) {
      if (out.length >= n) return out;
      if (c !== code && !out.includes(c)) out.push(c);
    }
  }
  return out;
}

// ---- 文字で答える（県庁所在地）
// 全角・半角、カタカナ・ひらがな、空白や記号のちがいは気にしない
export function normalizeAnswer(text) {
  return String(text)
    .normalize('NFKC')
    .replace(/[\s・、。,.()（）「」]/g, '')
    .replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .toLowerCase();
}

// 正解として認める書き方: 「仙台市」「仙台」「せんだいし」「せんだい」など
export function capitalAnswers(p) {
  const list = [p.capital, p.capital.replace(/市$/, ''), p.capitalKana, p.capitalKana.replace(/し$/, ''), ...(p.capitalAliases || [])];
  return new Set(list.map(normalizeAnswer).filter(Boolean));
}

export function checkCapital(code, input) {
  const n = normalizeAnswer(input);
  return n.length > 0 && capitalAnswers(PREF[code]).has(n);
}

// ヒント用のよみ。level 1: さいしょの 1 文字だけ / level 2: 1 文字おきに見せる
export function kanaHint(p, level) {
  const kana = [...(p.code === 13 ? 'とうきょう' : p.capitalKana)];
  if (level <= 1) return kana[0] + '○'.repeat(kana.length - 1);
  return kana.map((c, i) => (i % 2 === 0 ? c : '○')).join('');
}

const nameOf = (p) => ({ text: p.name, kana: p.kana });
const capitalOf = (p) => ({ text: p.capital, kana: p.capitalKana });

// 1 問ぶんのデータ。prompt は [文字列 | { text, kana }] の並び（kana はふりがな）
export function buildQuestion({ mode, code, rng, pool }) {
  const p = PREF[code];
  const answerInfo = { name: nameOf(p), capital: capitalOf(p), region: REGION[p.region] };
  switch (mode) {
    case 'find':
      return { mode, code, input: 'map', answer: code, labels: 'none', colors: true, highlight: null,
        prompt: [nameOf(p), ' は どこ？'], speech: `${p.kana}は どこ？`, answerInfo };
    case 'capitalFind':
      return { mode, code, input: 'map', answer: code, labels: 'none', colors: true, highlight: null,
        prompt: [capitalOf(p), ' が ', KENCHO, 'の 県は？'], speech: `${p.capitalKana}が けんちょうしょざいちの けんは どこ？`, answerInfo };
    case 'name': {
      const ids = shuffle([code, ...distractors(code, 3, { rng, pool })], rng);
      return { mode, code, input: 'choice', answer: code, labels: 'none', colors: true, highlight: code,
        prompt: ['光っている 県の 名前は？'], speech: 'ひかっている けんの なまえは？',
        choices: ids.map((c) => ({ id: c, ...nameOf(PREF[c]) })), answerInfo };
    }
    case 'capital': {
      const ids = shuffle([code, ...distractors(code, 3, { rng, pool })], rng);
      return { mode, code, input: 'choice', answer: code, labels: 'none', colors: true, highlight: code,
        prompt: [nameOf(p), ' の ', KENCHO, 'は？'], speech: `${p.kana}の けんちょうしょざいちは？`,
        choices: ids.map((c) => ({ id: c, ...capitalOf(PREF[c]) })), answerInfo };
    }
    case 'capitalType':
      return { mode, code, input: 'text', answer: code, labels: 'none', colors: true, highlight: code,
        prompt: [nameOf(p), ' の ', KENCHO, 'は？'], speech: `${p.kana}の けんちょうしょざいちは？ もじで こたえてね`, answerInfo };
    case 'region':
      // 地方の色で答えがわからないよう、地図は無地にする
      return { mode, code, input: 'region', answer: p.region, labels: 'none', colors: false, highlight: code,
        prompt: [nameOf(p), ' は 何地方？'], speech: `${p.kana}は なにちほう？`,
        choices: REGIONS.map((r) => ({ id: r.id, text: r.name, kana: r.kana, color: r.color })), answerInfo };
    default:
      throw new Error(`unknown mode: ${mode}`);
  }
}
