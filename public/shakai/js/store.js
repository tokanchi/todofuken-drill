// 記録と設定。すべて端末内（localStorage）に保存し、外部には送らない。
const KEY = 'dopa-drill-shakai-v1';

const defaults = () => ({
  settings: { sound: true, volume: 80, motion: 1, furigana: true, count: 10, range: 'all' },
  // stats[県コード][モード] = { n: 出題数, first: 一発正解数, miss: まちがえた回数, lastFirst: 前回一発で正解したか }
  stats: {},
  plays: [],
});

let state = null;

export function load() {
  if (state) return state;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    state = raw && typeof raw === 'object' ? { ...defaults(), ...raw, settings: { ...defaults().settings, ...(raw.settings || {}) } } : defaults();
  } catch (err) {
    state = defaults();
  }
  return state;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(load()));
  } catch (err) {
    // 保存できない環境（プライベートモードなど）では、その場かぎりで遊べるようにする
  }
}

export const settings = () => load().settings;

export function updateSettings(patch) {
  Object.assign(load().settings, patch);
  save();
}

export function statOf(code, mode) {
  const byCode = load().stats[code];
  return byCode ? byCode[mode] || null : null;
}

export function record(code, mode, firstTry, misses) {
  const s = load();
  const byCode = s.stats[code] || (s.stats[code] = {});
  const st = byCode[mode] || (byCode[mode] = { n: 0, first: 0, miss: 0, lastFirst: null });
  st.n += 1;
  if (firstTry) st.first += 1;
  st.miss += misses;
  st.lastFirst = firstTry;
}

// その県を、すべてのモードあわせて何回「一発で」答えられたか
export function firstTotal(code) {
  const byCode = load().stats[code];
  return byCode ? Object.values(byCode).reduce((sum, st) => sum + st.first, 0) : 0;
}

// 0: まだ / 1: がんばり中 / 2: おぼえた（一発正解 3 回以上）/ 3: ばっちり（6 回以上）
export function levelOf(code) {
  const n = firstTotal(code);
  return n >= 6 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0;
}

export function addPlay(entry) {
  const s = load();
  s.plays.push({ ...entry, at: Date.now() });
  if (s.plays.length > 60) s.plays.splice(0, s.plays.length - 60);
  save();
}

// 記録だけを消す（設定はそのまま）
export function reset() {
  const s = load();
  s.stats = {};
  s.plays = [];
  save();
}
