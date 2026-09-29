// ドパドリル しゃかい（都道府県） — ドパドリルの非公式改造版。
// 演出（ドパキチ・音楽・パーティクル・背景）は元のドパドリルのモジュールをそのまま使い、
// 問題の出し方と答え方だけを「地図をタップ」「えらぶ」に作りかえている。
import { startClock, onFrame, wait, tween, clamp, lerp, rand, pick, chance, centerOf, easeOutBack, easeOutCubic, easeInCubic } from '../../sansu/js/core.js';
import { AudioEngine } from '../../sansu/js/audio.js';
import { Dopakichi } from '../../sansu/js/dopakichi.js';
import { FX } from '../../sansu/js/fx.js';
import { Backdrop } from '../../sansu/js/bg.js';
import { BASIC_SCORE, basicDopaL, addDopa, comboMult, comboMaxed, fmtDopa } from '../../sansu/js/scoring.js';
import { PREFECTURES, PREF, REGIONS, REGION, MAP_URL } from './prefectures.js';
import { RANGES, RANGE, MODES, MODE, KENCHO, makeRng, pickTargets, buildQuestion, rangeCodes, checkCapital, kanaHint } from './quiz.js';
import * as store from './store.js';
import { createMap } from './map.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const body = document.body;
const now = () => performance.now();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTime = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

const audio = new AudioEngine({});
const fx = new FX($('#fx'), 300);
const fxBack = new FX($('#fx-back'), 520);
const bg = new Backdrop($('#bg'), $('#rays-fallback'));
const backLayer = $('#actors-back');
const frontLayer = $('#actors-front');
const hero = new Dopakichi(backLayer, { scale: 0.7, front: frontLayer });
const actors = [hero];
const crowd = [];
const stage = $('#stage');
const card = $('#card');

const S = {
  screen: 'title', mode: 'find', N: 10, targets: [], pool: [], qi: 0, q: null, ready: false, rng: Math.random, only: null,
  E: 0.06, visualE: 0.02, level: 0, combo: 0, comboPeak: 0, firstTry: 0, solved: 0, misses: 0, qMisses: 0, wrongInQ: false,
  wrong: [], done: [], startT: 0, endT: 0, dopa: { L: 0 }, motion: 1, reduced: false, muted: false,
  flash: 0, shake: 0, kick: 0, busyUntil: 0, idleAt: 0, run: 0, settingsOpen: false, studyCode: null,
};
window.__shakai = { S };

const settings = store.settings();
// 元の fx.js が canvas に書く文字（shakai.css・okane.css で丸ゴシックに差しかえた "Dela Gothic One"）の書体を先に読みこむ。
// 読みこむ前に描くと、ちがう書体のまま残ることがある
if (document.fonts) { document.fonts.load('20px "Dela Gothic One"'); document.fonts.load('900 20px "Dela Gothic One"'); }

// 日本地図（GFDL の SVG）を 1 回だけ読み込み、3 つの地図（記録・プレイ・おぼえる）で使い回す
let svgText = '';
try {
  svgText = await (await fetch(MAP_URL)).text();
} catch (err) {
  document.body.insertAdjacentHTML('afterbegin', '<p class="sk-load-error">地図を 読みこめませんでした。ページを 読みこみ直してね。</p>');
  throw err;
}
const furigana = () => settings.furigana !== false;
const partsHtml = (parts) => parts.map(rubyHtml).join('');

// ---------------------------------------------------------------- 見た目の段階（元のドパドリルと同じ考え方）
function setLevelClasses(L) {
  for (let i = 0; i <= 10; i++) body.classList.toggle(`lv${i}`, i <= L);
}

function applyLevel(E, { key, bpm } = {}) {
  S.E = E;
  const L = Math.min(10, Math.round(E * 10));
  S.level = L;
  setLevelClasses(L);
  if (key !== undefined) audio.key = key;
  audio.setLevel(L, bpm || 112 + 16 * Math.min(1, E));
  hero.bob = clamp(E * 1.4);
  ensureCrowd(E);
}

const basicE = (i) => (S.N <= 1 ? 1 : 0.08 + 0.92 * (i / (S.N - 1)) ** 1.3);

function burstKinds(E) {
  const k = ['confetti'];
  if (E > 0.18) k.push('star');
  if (E > 0.4) k.push('spark', 'spark');
  if (E > 0.58) k.push('coin');
  if (E > 0.72) k.push('mini', 'heart');
  return k;
}

const CROWD_PALETTES = ['blue', 'yellow', 'mint', 'violet'];
function ensureCrowd(E) {
  const want = [];
  if (E >= 0.45) want.push({ side: -1, s: 0.4 });
  if (E >= 0.68) want.push({ side: 1, s: 0.4 });
  if (E >= 0.88) want.push({ side: -1.9, s: 0.32 }, { side: 1.9, s: 0.32 });
  if (S.reduced || S.motion < 0.5 || S.screen !== 'play') want.length = 0;
  while (crowd.length > want.length) { const m = crowd.pop(); m.destroy(); actors.splice(actors.indexOf(m), 1); }
  for (let i = crowd.length; i < want.length; i++) {
    const w = want[i];
    const m = new Dopakichi(backLayer, { scale: w.s, palette: CROWD_PALETTES[i % CROWD_PALETTES.length], front: frontLayer });
    m.side = w.side; m.bob = 1;
    crowd.push(m); actors.push(m);
    placeCrowd(m);
    const home = { ...m.home };
    m.place(w.side < 0 ? -80 : innerWidth + 80, home.y);
    m.hop(80, 520, { to: home }).then(() => { m.place(home.x, home.y); });
  }
}
function placeCrowd(m) {
  if (S.screen !== 'play') { m.visible = false; return; }
  m.visible = true;
  const r = stage.getBoundingClientRect();
  const off = Math.abs(m.side) > 1.5 ? 0.04 : 0.16;
  const x = m.side < 0 ? r.left + r.width * off : r.right - r.width * off;
  m.place(x, r.bottom - 8 - (Math.abs(m.side) > 1.5 ? 12 : 0));
}

// ---------------------------------------------------------------- 画面
function showScreen(name) {
  S.screen = name;
  $$('.screen').forEach((s) => s.classList.toggle('is-active', s.id === `screen-${name}`));
  const el = $(`#screen-${name}`);
  if (!S.reduced) tween(260, (k) => { el.style.opacity = k; el.style.transform = `translateY(${(1 - k) * 18}px)`; }).then(() => { el.style.transform = ''; });
  if (name !== 'play') ensureCrowd(0);
  requestAnimationFrame(layoutActors);
}

function layoutActors() {
  hero.begin();
  hero.visible = true;
  if (S.settingsOpen) {
    const c = $('#settings .modal-card').getBoundingClientRect();
    hero.S = 0.45; hero.place(c.left + c.width * 0.8, c.top + 4); hero.lift = 0; hero.rot = 0;
    return;
  }
  let r;
  let scale;
  if (S.screen === 'title') { r = $('#title-stage').getBoundingClientRect(); scale = clamp(r.height / 190, 0.5, 0.9); }
  else if (S.screen === 'play') { r = stage.getBoundingClientRect(); scale = clamp(r.height / 150, 0.4, 0.62); }
  else if (S.screen === 'study') { r = $('#study-stage').getBoundingClientRect(); scale = clamp(r.height / 150, 0.34, 0.5); }
  else { r = $('#screen-result .result-card').getBoundingClientRect(); scale = 0.55; }
  hero.S = scale;
  const onCard = S.screen === 'result';
  hero.place(r.left + r.width / 2, onCard ? r.top + 6 : r.bottom - 8);
  hero.lift = 0; hero.rot = 0;
  crowd.forEach(placeCrowd);
}

// ふりがな付きの文字列（{ text, kana } か ただの文字列）を HTML にする
function rubyHtml(part) {
  if (typeof part === 'string') return esc(part);
  return furigana() ? `<ruby>${esc(part.text)}<rt>${esc(part.kana)}</rt></ruby>` : esc(part.text);
}

// 読み上げ（端末の日本語音声）。問題文や県名を耳でも覚えられるように
function speak(text) {
  if (!('speechSynthesis' in window) || S.muted) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  u.rate = 0.95;
  const voice = speechSynthesis.getVoices().find((v) => v.lang && v.lang.startsWith('ja'));
  if (voice) u.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// ---------------------------------------------------------------- タイトル
const titleMap = createMap($('#mini-map'), { svgText, zoomable: false, compact: true });
titleMap.setStyle({ colors: true, labels: 'none' });

function renderTitle() {
  $$('#modes [data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === S.mode)));
  $$('#ranges [data-range]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.range === settings.range)));
  $$('#counts [data-count]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.count === String(settings.count))));
  const learned = PREFECTURES.filter((p) => store.levelOf(p.code) >= 2).length;
  $('#learned').textContent = learned;
  titleMap.setLevels((code) => store.levelOf(code));
  const plays = store.load().plays.length;
  $('#progress-note').textContent = plays ? `これまで ${plays}回 遊んだよ` : '答えるたびに 地図が 色づくよ';
}

function toTitle() {
  audio.stopMusic();
  audio.play('musicGain', audio.now(), { v: 0.8, ramp: 0.1 });
  applyLevel(0.04);
  renderTitle();
  $('#screen-title').scrollTop = 0;
  showScreen('title');
}

// ---------------------------------------------------------------- プレイ
const playMap = createMap($('#play-map'), { svgText, onTap: (code, pt) => answer(code, pt) });

function startGame(mode, { only = null } = {}) {
  audio.unlock();
  S.run += 1;
  S.mode = mode;
  S.rng = makeRng(Math.floor(Math.random() * 1e9));
  S.pool = rangeCodes(settings.range);
  const codes = only && only.length ? only : S.pool;
  const count = only ? codes.length : settings.count === 'all' ? codes.length : Math.min(Number(settings.count) || 10, codes.length);
  S.only = only;
  S.targets = pickTargets({ codes, count, rng: S.rng, statOf: (code) => store.statOf(code, mode) });
  S.N = S.targets.length;
  Object.assign(S, { qi: 0, firstTry: 0, solved: 0, misses: 0, combo: 0, comboPeak: 0, wrong: [], done: [], endT: 0, dopa: { L: 0 } });
  $('#dopa').textContent = '0';
  showCombo();
  $('#ok-total').textContent = `/${S.N}`;
  const pips = $('#pips');
  pips.innerHTML = '';
  pips.classList.toggle('many', S.N > 10);
  pips.classList.toggle('lots', S.N > 20);
  for (let i = 0; i < S.N; i++) { const s = document.createElement('span'); s.className = 'pip'; pips.appendChild(s); }
  S.targetMs = Math.ceil((S.N * 12) / 10) * 10 * 1000;
  $('#clock-label').textContent = `目標 ${fmtTime(S.targetMs)}`;
  $('.clock').classList.remove('over');
  updateTally();
  card.dataset.input = MODE[mode].input;
  audio.key = 0;
  audio.play('musicGain', audio.now(), { v: 0.8, ramp: 0.2 });
  audio.startMusic();
  audio.jingle();
  showScreen('play');
  S.startT = now();
  setupQuestion();
}

function updateTally() {
  $('#ok').textContent = S.solved;
  $('#ng').textContent = S.misses;
}

function renderChoices(q) {
  const box = $('#choices');
  box.innerHTML = '';
  box.className = `sk-choices ${q.input === 'region' ? 'regions' : ''}`;
  const form = $('#type-form');
  form.hidden = q.input !== 'text';
  if (q.input === 'text') {
    const input = $('#type-input');
    input.value = '';
    input.readOnly = false;
    input.classList.remove('ng');
    $('#type-reveal').disabled = false;
    return;
  }
  if (q.input === 'map') return;
  for (const c of q.choices) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sk-choice';
    b.dataset.id = c.id;
    if (c.color) b.style.setProperty('--dot', c.color);
    b.innerHTML = rubyHtml({ text: c.text, kana: c.kana });
    b.addEventListener('click', () => {
      const r = b.getBoundingClientRect();
      answer(q.input === 'region' ? c.id : Number(c.id), { x: r.left + r.width / 2, y: r.top + r.height / 2 }, b);
    });
    box.appendChild(b);
  }
}

async function setupQuestion() {
  S.ready = false;
  const E = basicE(S.qi);
  const last = S.qi === S.N - 1;
  applyLevel(E, { key: last ? 2 : 0 });
  const q = buildQuestion({ mode: S.mode, code: S.targets[S.qi], rng: S.rng, pool: S.pool });
  S.q = q;
  S.qMisses = 0;
  S.wrongInQ = false;
  S.nearHelp = false;
  S.revealed = false;
  $$('.pip').forEach((p, i) => p.classList.toggle('now', i === S.qi));
  $('#qtitle').innerHTML = partsHtml(MODE[S.mode].chip);
  $('#qno').textContent = `第${S.qi + 1}問`;
  $('#prompt').innerHTML = partsHtml(q.prompt);
  $('#step-label').innerHTML = '&nbsp;';
  // 地図: この回で答えた県は名前を出しておき、目印にする
  playMap.clearMarks();
  playMap.setStyle({ colors: q.colors, labels: q.labels });
  S.done.forEach((c) => playMap.mark(c, 'show'));
  if (q.highlight) { playMap.mark(q.highlight, 'target'); playMap.mark(q.highlight, 'show', false); }
  playMap.setEnabled(q.input === 'map');
  if (settings.range !== 'all') playMap.zoomTo(S.pool, { ms: S.qi === 0 ? 0 : 300 });
  else playMap.resetZoom(S.qi === 0 ? 0 : 300);
  // 光らせて答えてもらう問題で、その県が小さすぎるときは寄って見せる
  if (q.highlight && q.input !== 'map') playMap.showSmall(q.highlight, { ms: S.qi === 0 ? 0 : 300 });
  renderChoices(q);
  const run = S.run;
  if (E > 0.22) cutin(last ? 'ラスト1問' : `第${S.qi + 1}問`, E);
  await cardEnter(E);
  if (S.screen !== 'play' || run !== S.run) return;
  S.ready = true;
  S.qStart = now();
  if (q.input === 'text') $('#type-input').focus({ preventScroll: true });
}

async function cardEnter(E) {
  const el = $('#prompt');
  if (S.reduced) return;
  await tween(260 + 80 * E, (k) => { el.style.transform = `translateY(${(1 - k) * -16}px) scale(${0.9 + 0.1 * k})`; el.style.opacity = k; }, easeOutBack);
  el.style.transform = '';
  el.style.opacity = 1;
}

function typedAnswer() {
  if (!S.ready || S.screen !== 'play' || S.q.input !== 'text') return;
  const input = $('#type-input');
  if (!input.value.trim()) return;
  const r = input.getBoundingClientRect();
  const pt = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  if (checkCapital(S.q.code, input.value)) {
    // disabled にするとフォーカスが外れてスマホのキーボードが閉じるので、readOnly で止める
    input.readOnly = true;
    $('#type-reveal').disabled = true;
    onCorrect(pt, null);
  } else {
    onWrong('text', pt, null);
    input.select();
  }
}

// 「わからない」: 答えを見せて、書き写してもらう（まちがい 1 回として数える）
function revealTyped() {
  if (!S.ready || S.revealed) return;
  S.qMisses = Math.max(S.qMisses, 2);
  onWrong('text', centerOf($('#type-input')), null);
}

function answer(value, pt, btn = null) {
  if (!S.ready || S.screen !== 'play') return;
  const q = S.q;
  if (value === q.answer) onCorrect(pt, btn);
  else onWrong(value, pt, btn);
}

function onCorrect(pt, btn) {
  S.ready = false;
  const q = S.q;
  const E = S.E;
  addCombo();
  bumpDopa(pt);
  playMap.mark(q.code, 'ok');
  playMap.mark(q.code, 'show');
  playMap.mark(q.code, 'target', false);
  if (btn) btn.classList.add('ok');
  const firstTry = !S.wrongInQ;
  store.record(q.code, S.mode, firstTry, S.qMisses);
  store.save();
  S.solved += 1;
  if (firstTry) S.firstTry += 1;
  S.done.push(q.code);
  updateTally();
  const info = q.answerInfo;
  $('#step-label').innerHTML = `<b>${rubyHtml(info.name)}</b>　${esc(info.region.name)}　${rubyHtml(KENCHO)} ${rubyHtml(info.capital)}`;
  const pip = $$('.pip')[S.qi];
  pip.classList.remove('now');
  pip.classList.add('done');
  const cols = ['#3b6bff', '#3fdcb0', '#ff5a4f', '#ffd23f'];
  if (E > 0.85) pip.classList.add('rainbow'); else pip.style.setProperty('--c', cols[Math.min(3, Math.floor(E * 4.5))]);
  if (!S.reduced) {
    fx.burst(pt.x, pt.y, { count: Math.round(8 + 26 * E), speed: 280 + 280 * E, kinds: burstKinds(E).filter((k) => k !== 'mini' && k !== 'coin'), up: 120, life: 0.55 });
    fx.ring(pt.x, pt.y, { color: E > 0.5 ? '#ffd23f' : '#ff7ab6', radius: 40 + 60 * E, width: 6 });
  }
  audio.clear(E);
  celebrate(E, S.qi === S.N - 1);
  clearProblem();
}

function onWrong(value, pt, btn) {
  const q = S.q;
  const E = S.E;
  if (q.input === 'map' && typeof value === 'number' && !S.nearHelp && PREF[q.code].near.includes(value)) {
    const box = playMap.screenBox(q.code);
    if (Math.min(box.w, box.h) < 30) {
      // 答えの県が小さく見えていて、となりの県を押した: 数えずに、押した県のまわりを拡大して、もう一度
      S.nearHelp = true;
      playMap.zoomTo([value, ...PREF[value].near], { pad: 20 });
      const b = playMap.screenBox(q.code);
      if (Math.min(b.w, b.h) < 30) playMap.zoomTo([q.code, value], { pad: 24 });
      $('#step-label').innerHTML = '<span class="help-text">近い！ 大きく したから もう一度 タップしてね</span>';
      audio.play('blip', audio.now(), { m: 76, v: 0.1 });
      return;
    }
  }
  S.misses += 1;
  S.qMisses += 1;
  if (!S.wrongInQ && !S.wrong.includes(q.code)) S.wrong.push(q.code);
  S.wrongInQ = true;
  breakCombo();
  updateTally();
  audio.wrong(E);
  if (btn) {
    btn.classList.add('ng');
    btn.disabled = true;
  } else if (value === 'text') {
    const input = $('#type-input');
    input.classList.remove('ng');
    void input.offsetWidth;
    input.classList.add('ng');
  } else if (typeof value === 'number') {
    playMap.flash(value, 'wrong', 900);
    // まちがえた場所の県名を見せて、ついでに覚えてもらう
    if (!S.reduced) fx.text(pt.x, pt.y - 10, `そこは ${PREF[value].name}`, { color: '#a77bff', size: 18, vy: -50, life: 1.3 });
  }
  giveHint();
  if (S.reduced) return;
  S.busyUntil = now() + 900;
  hero.hurt(E, pt, { audio });
  if (E > 0.5) { S.shake = Math.max(S.shake, 6); S.flash = Math.max(S.flash, 0.1); }
  crowd.forEach((m) => { m.setFace('wide', 'o'); m.sq.kick(-3); setTimeout(() => m.resetFace(), 600); });
}

// 2 回まちがえたら地方を教え、3 回目で答えの場所を光らせる
function giveHint() {
  const q = S.q;
  const p = PREF[q.code];
  const region = REGION[p.region];
  if (q.input === 'text') {
    if (S.qMisses >= 3) {
      S.revealed = true;
      $('#type-reveal').disabled = true;
      $('#step-label').innerHTML = `<span class="help-text">答えは ${rubyHtml({ text: p.capital, kana: p.capitalKana })}。書いて みよう</span>`;
      if (!S.reduced) setTimeout(() => hero.point(centerOf($('#type-input'))), 500);
    } else {
      $('#step-label').innerHTML = `<span class="help-text">ヒント　読みは「${kanaHint(p, S.qMisses)}」</span>`;
    }
    return;
  }
  if (S.qMisses === 2) {
    if (q.input === 'map') {
      const codes = PREFECTURES.filter((x) => x.region === p.region).map((x) => x.code);
      playMap.dimExcept(codes);
      // 沖縄は左上の囲みにあるので、答えが沖縄でなければ九州の本土だけに寄る
      playMap.zoomTo(q.code === 47 ? codes : codes.filter((c) => c !== 47), { pad: 50 });
      $('#step-label').innerHTML = `<span class="help-text">ヒント　${rubyHtml({ text: region.name, kana: region.kana })}の どこか だよ</span>`;
    } else {
      // 残っている不正解の選択肢を 1 つ消す
      const rest = $$('#choices .sk-choice:not(.ng)').filter((b) => b.dataset.id !== String(q.answer));
      if (rest.length > 1) { const b = pick(rest); b.classList.add('ng', 'gone'); b.disabled = true; }
      $('#step-label').innerHTML = '<span class="help-text">ヒント　1つ へらしたよ</span>';
    }
  }
  if (S.qMisses >= 3) {
    if (q.input === 'map') {
      playMap.mark(q.code, 'hint');
      $('#step-label').innerHTML = '<span class="help-text">光っている ところを タップしてね</span>';
    } else {
      const b = $(`#choices .sk-choice[data-id="${q.answer}"]`);
      if (b) b.classList.add('hint');
      $('#step-label').innerHTML = '<span class="help-text">光っている ボタンだよ</span>';
    }
    if (!S.reduced) setTimeout(() => hero.point(q.input === 'map' ? playMap.centerOf(q.code) : centerOf($(`#choices .sk-choice[data-id="${q.answer}"]`) || card)), 600);
  }
}

async function clearProblem() {
  const run = S.run;
  const last = S.qi === S.N - 1;
  if (last) { await wait(500); await finale(); return; }
  await wait(lerp(900, 1300, clamp(S.E)));
  if (S.screen !== 'play' || run !== S.run) return;
  S.qi += 1;
  setupQuestion();
}

function celebrate(E, big) {
  const r = card.getBoundingClientRect();
  const cx = r.left + r.width / 2; const cy = r.top + r.height * 0.35;
  const W = innerWidth; const H = innerHeight;
  S.busyUntil = now() + 900;
  if (S.reduced) { hero.setFace('happy', 'grin'); setTimeout(() => hero.resetFace(), 700); return; }
  hero.celebrate(Math.min(1, E), { big: E > 0.5 || big, audio });
  crowd.forEach((m, i) => setTimeout(() => m.celebrate(Math.min(1, E), { big: E > 0.8 }), 60 * i));
  const n = Math.round(14 + 70 * Math.min(1.2, E));
  fx.burst(cx, cy, { count: n, speed: 500 + 500 * E, kinds: burstKinds(E), up: 250, life: 0.6 });
  if (E > 0.25) fxBack.burst(cx, cy, { count: Math.round(90 * Math.min(1.2, E)), speed: 900 + 400 * E, kinds: burstKinds(E), up: 400 });
  if (E > 0.3) fx.streamers(W, H, Math.round(2 + 6 * E));
  if (E > 0.5) { fxBack.fireworks(W, H, Math.round(2 + 6 * E), 0.06, 0.3); S.flash = Math.max(S.flash, 0.2 * E); }
  if (E > 0.62) fxBack.rain(W, Math.round(20 + 30 * E), { kinds: ['confetti', 'confetti', 'mini', 'coin'] });
  S.shake = Math.max(S.shake, 2 + 7 * E);
}

function cutin(text, E) {
  if (S.reduced) return;
  audio.cutin();
  const r = stage.getBoundingClientRect();
  const band = document.createElement('div');
  band.className = 'cutin-band';
  const h = 54 + 24 * Math.min(1, E);
  const palettes = [['#3b6bff', '#5b8cff'], ['#ff7ab6', '#ff9ccc'], ['#ffb000', '#ffd23f'], ['#1b1d4d', '#3b3f8f']];
  const pal = palettes[Math.min(3, Math.floor(E * 3.6))];
  band.style.cssText = `top:${r.top + r.height / 2 - h / 2}px;height:${h}px;--c1:${pal[0]};--c2:${pal[1]}`;
  band.innerHTML = `<div class="band-bg"></div><div class="band-text" style="font-size:${30 + 14 * Math.min(1, E)}px">${esc(text)}</div>`;
  $('#cutins').appendChild(band);
  (async () => {
    await tween(240, (k) => { band.style.transform = `translateX(${(1 - k) * 110}%) rotate(-6deg) scaleY(${0.6 + 0.4 * k})`; }, easeOutBack);
    await wait(320 + 160 * E);
    await tween(200, (k) => { band.style.transform = `translateX(${-k * 110}%) rotate(-6deg)`; }, easeInCubic);
    band.remove();
  })();
}

// ---------------------------------------------------------------- ドパとコンボ（得点とは別の、盛り上がりの数値）
function bumpDopa(pt) {
  const prev = S.dopa.L;
  const base = basicDopaL((S.qi + 1) / S.N) - basicDopaL(S.qi / S.N);
  S.dopa.L = addDopa(prev, base, S.combo);
  $('#dopa').textContent = fmtDopa(S.dopa.L);
  if (S.E > 0.12 && !S.reduced) {
    const gain = S.dopa.L + Math.log10(1 - 10 ** (prev - S.dopa.L));
    fx.text(pt.x, pt.y - 30, `+${10 ** gain < 1 ? 1 : fmtDopa(gain)}`, { color: pick(['#ffd23f', '#fff', '#8fd3ff', '#ffb3d6']), size: 16 + 10 * Math.min(1, S.E), vy: -120 });
  }
  popEl($('#dopa-box'), 0.12 + 0.2 * S.E, 260);
}

function popEl(el, amount = 0.6, dur = 320) {
  if (!el || S.reduced) return;
  tween(dur, (k) => { el.style.transform = `scale(${1 + Math.sin(k * Math.PI) * 0.25 * amount})`; }).then(() => { el.style.transform = ''; });
}

function addCombo() {
  S.combo += 1;
  S.comboPeak = Math.max(S.comboPeak, S.combo);
  showCombo();
  if (S.combo < 2) return;
  const box = $('#combo-box');
  popEl(box, 0.25 + 0.25 * Math.min(1, S.E), 240);
  if (S.combo % 5 !== 0 || S.reduced) return;
  audio.unit(Math.min(1, 0.3 + S.combo / 60));
  const c = centerOf(box);
  fx.text(c.x, c.y + 26, `${S.combo}コンボ！`, { color: '#ffd23f', size: 26 + Math.min(20, S.combo / 3), vy: -90, life: 1 });
  fx.burst(c.x, c.y, { count: 16 + Math.min(40, S.combo), kinds: ['star', 'spark', 'confetti'], speed: 380, up: 80 });
}
function breakCombo() {
  const had = S.combo;
  S.combo = 0;
  showCombo();
  if (had >= 5 && !S.reduced) {
    const c = centerOf($('#combo-box'));
    fx.text(c.x, c.y + 20, `${had}コンボ`, { color: '#b9bbd9', size: 15, vy: 40, life: 0.8 });
  }
}
function showCombo() {
  const box = $('#combo-box');
  const on = S.combo >= 2;
  box.classList.toggle('on', on);
  if (!on) return;
  $('#combo').textContent = S.combo;
  $('#combo-mult').textContent = comboMaxed(S.combo) ? 'ドパ×2 MAX' : `ドパ×${comboMult(S.combo).toFixed(2)}`;
  box.classList.toggle('hot', comboMaxed(S.combo));
}

// ---------------------------------------------------------------- フィナーレと結果
function bigStamp(text) {
  const el = document.createElement('div');
  el.className = 'unit-slam';
  el.style.fontSize = `${Math.min(110, innerWidth * 0.26)}px`;
  el.style.color = '#ff7ab6';
  el.textContent = text;
  $('#cutins').appendChild(el);
  const w = el.offsetWidth; const h = el.offsetHeight;
  el.style.left = `${innerWidth / 2 - w / 2}px`; el.style.top = `${innerHeight * 0.22 - h / 2}px`;
  (async () => {
    await tween(320, (k) => { el.style.transform = `scale(${lerp(4, 1, k)}) rotate(${lerp(-25, -6, k)}deg)`; el.style.opacity = Math.min(1, k * 2); }, easeOutBack);
    await wait(1300);
    await tween(300, (k) => { el.style.opacity = 1 - k; el.style.transform = `scale(${1 + k * 0.3}) rotate(-6deg)`; });
    el.remove();
  })();
}

async function finale() {
  const run = S.run;
  S.ready = false;
  S.endT = now();
  audio.finale();
  if (!S.reduced) {
    const W = innerWidth; const H = innerHeight;
    fx.streamers(W, H, 12);
    fx.burst(W / 2, H * 0.4, { count: 70, speed: 1200, kinds: ['confetti', 'star', 'spark', 'coin', 'mini'], up: 300, life: 0.7 });
    for (let i = 0; i < 3; i++) { fxBack.fireworks(W, H, 4 + i, 0.05, 0.5); audio.play('crash', audio.now(), { v: 0.15 }); S.shake = Math.max(S.shake, 6); await wait(240); }
    bigStamp(`${BASIC_SCORE}点`);
    hero.celebrate(1, { big: true, audio });
    await wait(1500);
  } else {
    await wait(700);
  }
  if (run === S.run) showResult();
}

function countUp(el, to, dur) {
  if (S.reduced) { el.textContent = to; return; }
  let lastV = -1;
  tween(dur, (k) => { const v = Math.round(lerp(0, to, k)); if (v !== lastV) { el.textContent = v; lastV = v; if (v % 5 === 0) audio.play('blip', audio.now(), { m: 72 + Math.floor((v / Math.max(1, to)) * 24), v: 0.06 }); } }, easeOutCubic)
    .then(() => { const c = centerOf(el); fx.burst(c.x, c.y, { count: 40, kinds: ['confetti', 'star', 'coin'], speed: 700, up: 200, life: 0.6 }); hero.celebrate(1, { big: true, audio }); });
}

function showResult() {
  const rate = S.firstTry / Math.max(1, S.N);
  const t = S.endT - S.startT;
  $('#r-ok').innerHTML = `${S.solved}<small>問</small>`;
  $('#r-ng').innerHTML = `${S.misses}<small>回</small>`;
  $('#r-rate').textContent = `${Math.round(rate * 100)}%`;
  $('#r-time').textContent = fmtTime(t);
  $('#r-dopa').textContent = fmtDopa(S.dopa.L);
  $('#result-title').innerHTML = `${partsHtml(MODE[S.mode].title)} クリア`;
  const list = $('#r-wrong');
  list.innerHTML = '';
  if (S.wrong.length) {
    const h = document.createElement('p');
    h.className = 'sk-wrong-title';
    h.textContent = 'まちがえた 県（もう一度 おぼえよう）';
    list.appendChild(h);
    for (const code of S.wrong) {
      const p = PREF[code];
      const li = document.createElement('div');
      li.className = 'sk-wrong-item';
      li.style.setProperty('--c', p.color);
      li.innerHTML = `<b>${rubyHtml({ text: p.name, kana: p.kana })}</b><span>${esc(REGION[p.region].name)}・${rubyHtml({ text: p.capital, kana: p.capitalKana })}</span>`;
      li.addEventListener('click', () => speak(`${p.kana}。${REGION[p.region].kana}。けんちょうしょざいちは ${p.capitalKana}`));
      list.appendChild(li);
    }
  } else {
    list.innerHTML = '<p class="sk-perfect">全部 一発で 正解！</p>';
  }
  $('#go-retry').hidden = !S.wrong.length;
  store.addPlay({ mode: S.mode, range: settings.range, count: S.N, firstRate: rate, timeMs: Math.round(t), wrong: S.wrong.slice() });
  $('#screen-result').scrollTop = 0;
  // 結果画面では BGM を少し小さくして流しつづける（元のドパドリルと同じ）
  audio.play('musicGain', audio.now(), { v: 0.55, ramp: 0.6 });
  showScreen('result');
  countUp($('#r-score'), BASIC_SCORE, 900);
}

// ---------------------------------------------------------------- ちずで おぼえる
const studyMap = createMap($('#study-map'), { svgText, onTap: (code) => showStudy(code) });
const studyView = { labels: true, colors: true };
function openStudy() {
  audio.unlock();
  studyMap.clearMarks();
  studyMap.setStyle({ colors: studyView.colors, labels: studyView.labels ? 'all' : 'none' });
  studyMap.resetZoom();
  $('#study-info').innerHTML = `<p class="sk-study-empty">県を タップすると、名前と ${rubyHtml(KENCHO)}が 出るよ</p>`;
  showScreen('study');
}
function showStudy(code) {
  const p = PREF[code];
  const region = REGION[p.region];
  studyMap.clearMarks();
  studyMap.mark(code, 'pick');
  studyMap.mark(code, 'show');
  S.studyCode = code;
  const note = p.code === 47 ? '<small>（九州・沖縄地方と いうことも あるよ）</small>' : '';
  $('#study-info').innerHTML = `
    <div class="sk-study-name">${rubyHtml({ text: p.name, kana: p.kana })}</div>
    <p class="sk-study-row"><span class="sk-region-dot" style="--dot:${region.color}"></span>${rubyHtml({ text: region.name, kana: region.kana })}${note}</p>
    <p class="sk-study-row">${rubyHtml(KENCHO)}：<b>${rubyHtml({ text: p.capital, kana: p.capitalKana })}</b></p>
    <button type="button" class="sub-btn sk-speak" id="study-speak">🔊 読み上げ</button>`;
  $('#study-speak').addEventListener('click', () => speak(`${p.kana}。${region.kana}。けんちょうしょざいちは ${p.capitalKana}`));
  audio.play('blip', audio.now(), { m: 79, v: 0.1 });
  if (!S.reduced) {
    const c = studyMap.centerOf(code);
    fx.burst(c.x, c.y, { count: 14, kinds: ['star', 'confetti'], speed: 260, up: 80 });
    hero.celebrate(0.4, { variant: 'earflap' });
  }
}

// ---------------------------------------------------------------- 設定
function setMotion(v, persist = true) {
  S.motion = clamp(v);
  S.reduced = S.motion <= 0.001;
  fx.reduced = S.reduced; fxBack.reduced = S.reduced;
  fx.motion = S.motion; fxBack.motion = S.motion;
  body.classList.toggle('reduced', S.reduced);
  $('#motion').value = Math.round(S.motion * 100);
  $('#motion-val').textContent = `${Math.round(S.motion * 100)}%`;
  if (persist) store.updateSettings({ motion: S.motion });
}
function setMuted(m, persist = true) {
  S.muted = m;
  audio.setMuted(m);
  const b = $('[data-toggle="sound"]');
  b.setAttribute('aria-pressed', String(!m));
  b.querySelector('b').textContent = m ? 'オフ' : 'オン';
  $('#mute').textContent = m ? '♪̸' : '♪';
  if (persist) store.updateSettings({ sound: !m });
}
function setFurigana(on, persist = true) {
  const b = $('[data-toggle="furigana"]');
  b.setAttribute('aria-pressed', String(on));
  b.querySelector('b').textContent = on ? 'オン' : 'オフ';
  if (persist) store.updateSettings({ furigana: on });
  // 画面に書いてある（HTML の）ふりがなは CSS で出し入れする
  body.classList.toggle('no-furigana', !on);
  if (S.screen === 'play' && S.q) { $('#prompt').innerHTML = partsHtml(S.q.prompt); $('#qtitle').innerHTML = partsHtml(MODE[S.mode].chip); }
}
function openSettings() {
  S.settingsOpen = true;
  $('#settings').hidden = false;
  requestAnimationFrame(layoutActors);
}
function closeSettings() {
  S.settingsOpen = false;
  $('#settings').hidden = true;
  requestAnimationFrame(layoutActors);
}

// ---------------------------------------------------------------- 配線
$('#modes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-mode]');
  if (!b) return;
  audio.unlock();
  startGame(b.dataset.mode);
});
$('#ranges').addEventListener('click', (e) => {
  const b = e.target.closest('[data-range]');
  if (!b) return;
  store.updateSettings({ range: b.dataset.range });
  audio.unlock();
  audio.play('blip', audio.now(), { m: 79, v: 0.1 });
  renderTitle();
});
$('#counts').addEventListener('click', (e) => {
  const b = e.target.closest('[data-count]');
  if (!b) return;
  store.updateSettings({ count: b.dataset.count === 'all' ? 'all' : Number(b.dataset.count) });
  audio.unlock();
  audio.play('blip', audio.now(), { m: 79, v: 0.1 });
  renderTitle();
});
$('#open-study').addEventListener('click', openStudy);
$('#study-back').addEventListener('click', toTitle);
$('#study-labels').addEventListener('click', (e) => {
  studyView.labels = !studyView.labels;
  e.currentTarget.setAttribute('aria-pressed', String(studyView.labels));
  studyMap.setStyle({ colors: studyView.colors, labels: studyView.labels ? 'all' : 'none' });
  if (S.studyCode) studyMap.mark(S.studyCode, 'show');
});
$('#study-colors').addEventListener('click', (e) => {
  studyView.colors = !studyView.colors;
  e.currentTarget.setAttribute('aria-pressed', String(studyView.colors));
  studyMap.setStyle({ colors: studyView.colors, labels: studyView.labels ? 'all' : 'none' });
});
$('#speak').addEventListener('click', () => { if (S.q) speak(S.q.speech); });
$('#type-form').addEventListener('submit', (e) => { e.preventDefault(); typedAnswer(); });
// 変換中の Enter（かな漢字変換の確定）では答えない
$('#type-input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.isComposing || e.keyCode === 229)) e.preventDefault(); });
$('#type-reveal').addEventListener('click', revealTyped);
$('#quit').addEventListener('click', () => { if (confirm('とちゅうで やめて タイトルに もどる？')) { S.run += 1; toTitle(); } });
$('#go-retry').addEventListener('click', () => startGame(S.mode, { only: S.wrong.slice() }));
$('#go-again').addEventListener('click', () => startGame(S.mode));
$('#go-title').addEventListener('click', toTitle);
$('#open-settings').addEventListener('click', openSettings);
$('#close-settings').addEventListener('click', closeSettings);
$('#settings').addEventListener('click', (e) => { if (e.target.id === 'settings') closeSettings(); });
$('[data-toggle="sound"]').addEventListener('click', () => { audio.unlock(); setMuted(!S.muted); });
$('[data-toggle="furigana"]').addEventListener('click', () => setFurigana(!furigana()));
$('#mute').addEventListener('click', () => { audio.unlock(); setMuted(!S.muted); });
$('#volume').addEventListener('input', (e) => { audio.setVolume(Number(e.target.value) / 100); store.updateSettings({ volume: Number(e.target.value) }); });
$('#motion').addEventListener('input', (e) => setMotion(Number(e.target.value) / 100));
$('#reset-records').addEventListener('click', () => {
  if (!confirm('社会の きろくを 全部 消しますか？（元に もどせません）')) return;
  store.reset();
  renderTitle();
});
addEventListener('resize', () => requestAnimationFrame(layoutActors));
// 画面をスクロールしたら、ドパキチも一緒に動かす（元のドパドリルと同じ）
$$('#screen-title, #screen-result').forEach((el) => el.addEventListener('scroll', () => requestAnimationFrame(layoutActors), { passive: true }));

// ---------------------------------------------------------------- 毎フレーム
let lastClockText = '';
onFrame((dt, t) => {
  // BGM は毎フレーム少し先まで音を予約して鳴らす（元のドパドリルと同じ）。拍に合わせて背景や飾りも はずませる
  audio.update();
  const pulse = audio.pulse();
  S.kick = S.reduced || !audio.playing ? 0 : pulse.kick * (S.level >= 1 ? 1 : 0.2);
  body.style.setProperty('--kick', S.kick.toFixed(3));
  if (S.screen === 'play') {
    const el = (S.endT || t) - S.startT;
    const txt = fmtTime(el);
    if (txt !== lastClockText) { $('#clock').textContent = txt; lastClockText = txt; }
    $('.clock').classList.toggle('over', el > S.targetMs);
    if (!S.reduced && S.motion >= 0.35 && S.E > 0.3 && t > S.idleAt && t > S.busyUntil && !hero.hands.some((h) => h.job)) {
      S.idleAt = t + rand(2200, 4200) / (0.6 + S.E);
      const r = stage.getBoundingClientRect();
      const x = clamp(r.left + r.width / 2 + rand(-0.28, 0.28) * r.width, r.left + 50, r.right - 50);
      hero.hop(20 + 30 * S.E, 420, { to: { x, y: hero.home.y }, spin: S.E > 0.6 && chance(0.3) ? 360 : 0 }).then((ok) => { if (ok) hero.x = x; });
    }
  } else if (S.screen === 'title' && !S.reduced && !S.settingsOpen && t > S.idleAt && t > S.busyUntil) {
    S.idleAt = t + rand(1600, 2800);
    const r = $('#title-stage').getBoundingClientRect();
    const x = r.left + r.width / 2 + rand(-0.25, 0.25) * r.width;
    const roll = Math.random();
    if (roll < 0.35) hero.hop(40, 420, { to: { x, y: hero.home.y } }).then((ok) => { if (ok) hero.x = x; });
    else if (roll < 0.55) hero.hop(70, 560, { spin: 360 });
    else if (roll < 0.75) hero.celebrate(0.4, { variant: 'earflap' });
    else hero.clap(3);
  }
  S.shake = Math.max(0, S.shake - dt * 30);
  const shk = S.shake * S.motion;
  const sx = shk > 0.1 && !S.reduced ? rand(-shk, shk) : 0;
  const sy = shk > 0.1 && !S.reduced ? rand(-shk, shk) : 0;
  stage.style.translate = shk > 0.1 ? `${sx}px ${sy}px` : '';
  S.flash = Math.max(0, S.flash - dt * 3.2);
  $('#flash').style.opacity = S.reduced ? 0 : ((S.flash * S.motion) ** 1.5 * 0.6).toFixed(3);
  const vE = S.screen === 'play' ? lerp(Math.min(S.E, 0.3), S.E, S.motion) : 0.04;
  S.visualE = lerp(S.visualE, vE, Math.min(1, dt * 2.2));
  const st = bg.state;
  st.E = S.visualE;
  st.kick = S.kick;
  st.flash = S.reduced ? 0 : S.flash * S.motion;
  st.reach = 0;
  st.hue += dt * 0.03 * S.visualE;
  st.cx = lerp(st.cx || innerWidth / 2, S.screen === 'play' ? stage.getBoundingClientRect().left + stage.clientWidth / 2 : innerWidth / 2, Math.min(1, dt * 3));
  st.cy = lerp(st.cy || innerHeight * 0.4, S.screen === 'play' ? stage.getBoundingClientRect().top + stage.clientHeight * 0.55 : innerHeight * 0.4, Math.min(1, dt * 3));
  bg.render(t);
  fx.update(dt);
  fx.draw();
  fxBack.update(dt);
  fxBack.draw();
  for (const a of actors) a.update(dt, t, { beat: S.kick });
});

// ---------------------------------------------------------------- 起動
setMotion(typeof settings.motion === 'number' ? settings.motion : matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.3 : 1, false);
setMuted(settings.sound === false, false);
setFurigana(furigana(), false);
$('#volume').value = settings.volume ?? 80;
audio.setVolume((settings.volume ?? 80) / 100);
applyLevel(0.04);
renderTitle();
startClock();
requestAnimationFrame(layoutActors);
