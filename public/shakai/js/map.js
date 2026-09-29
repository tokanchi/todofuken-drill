// 日本地図（SVG）。タップ判定・ピンチで拡大・ドラッグで移動・地方へのズームに対応する。
// 地図の形は map/japan.svg（Geolonia「japanese-prefectures」をもとにした GFDL の地図）をそのまま使う。
import { PREFECTURES, PREF, MAP_VIEWBOX } from './prefectures.js';

const NS = 'http://www.w3.org/2000/svg';
const [BX, BY, BW, BH] = MAP_VIEWBOX;
const MIN_W = BW / 10; // これ以上は拡大しない
const LABEL_PX = 13; // 県名ラベルの画面上の文字の大きさ
const SNAP_PX = 22; // 海の上を押したとき、この距離までの県に当たったことにする
const FRONT = new Set(['target', 'pick', 'hint', 'ok', 'wrong']);

const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

export function createMap(container, { svgText, onTap = () => {}, zoomable = true, compact = false } = {}) {
  const wrap = document.createElement('div');
  wrap.className = `jmap-wrap${compact ? ' compact' : ''}`;
  wrap.innerHTML = svgText;
  const svg = wrap.querySelector('svg');
  svg.classList.add('jmap');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '日本地図');
  // 元の SVG の title は、マウスを乗せると県名が出てしまう（答えがわかる）ので外す
  svg.querySelectorAll('title, desc').forEach((t) => t.remove());

  const tiles = new Map();
  svg.querySelectorAll('.prefecture').forEach((g) => {
    const code = Number(g.dataset.code);
    g.classList.add('tile');
    g.style.setProperty('--c', PREF[code].color);
    tiles.set(code, { g, lbl: null });
  });
  const labels = svgEl('g', { class: 'labels' });
  for (const p of PREFECTURES) {
    const t = svgEl('text', { class: 'lbl', x: p.label[0], y: p.label[1], 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    t.textContent = p.short;
    labels.appendChild(t);
    tiles.get(p.code).lbl = t;
  }
  svg.appendChild(labels);

  let controls = null;
  if (zoomable) {
    controls = document.createElement('div');
    controls.className = 'jmap-zoom';
    controls.innerHTML = '<button type="button" data-z="in" aria-label="おおきく">＋</button><button type="button" data-z="out" aria-label="ちいさく">−</button><button type="button" data-z="all" aria-label="ぜんたい">ぜんたい</button>';
    wrap.appendChild(controls);
  }
  container.appendChild(wrap);

  // ---- 表示範囲（viewBox）
  // 枠の縦横比に合わせて表示範囲を取り、余白（海）を減らして県をできるだけ大きく見せる
  let aspect = BH / BW; // 枠の 高さ / 幅
  const PAD = 14; // 全体表示で、島が枠のふちに掛からないよう少しあける
  const fullVb = () => {
    const [x0, y0, W, H] = [BX - PAD, BY - PAD, BW + PAD * 2, BH + PAD * 2];
    if (aspect >= H / W) { const h = W * aspect; return { x: x0, y: y0 - (h - H) / 2, w: W, h }; }
    const w = H / aspect;
    return { x: x0 - (w - W) / 2, y: y0, w, h: H };
  };
  let vb = fullVb();
  let goal = vb; // アニメーション中でも、最後に行き着く表示範囲
  let anim = 0;
  let animEnd = 0;
  const pxPerUnit = (v = vb) => (svg.getBoundingClientRect().width || 1) / v.w;

  // 県名は画面上でいつも同じ大きさにし、県の中に収まらないもの・となりの県名と重なるものは隠す（拡大すると出てくる）。
  // 答えた県など .show の県名は必ず出し、残りは大きい県から順に置いていく
  const BY_SIZE = [...PREFECTURES].sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3]);
  const updateLabels = () => {
    const s = pxPerUnit();
    labels.style.fontSize = `${LABEL_PX / s}px`;
    labels.style.strokeWidth = `${3 / s}px`;
    const placed = [];
    const rectOf = (p) => {
      const w = ([...p.short].length * LABEL_PX + 4) / s;
      const h = (LABEL_PX * 1.2) / s;
      return [p.label[0] - w / 2, p.label[1] - h / 2, w, h];
    };
    const hits = (r) => placed.some((q) => r[0] < q[0] + q[2] && q[0] < r[0] + r[2] && r[1] < q[1] + q[3] && q[1] < r[1] + r[3]);
    for (const p of PREFECTURES) if (tiles.get(p.code).lbl.classList.contains('show')) placed.push(rectOf(p));
    for (const p of BY_SIZE) {
      const { lbl } = tiles.get(p.code);
      if (lbl.classList.contains('show')) continue;
      const r = rectOf(p);
      const fits = p.box[2] * s >= [...p.short].length * LABEL_PX * 1.02 && p.box[3] * s >= LABEL_PX * 1.15 && !hits(r);
      if (fits) placed.push(r);
      lbl.classList.toggle('fits', fits);
    }
  };
  const apply = () => {
    svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
    updateLabels();
  };
  const clampAxis = (pos, size, base0, baseSize, margin) => (
    size >= baseSize + margin * 2 ? base0 + baseSize / 2 - size / 2 : Math.min(base0 + baseSize + margin - size, Math.max(base0 - margin, pos)));
  const clampVb = (v) => {
    const w = Math.min(fullVb().w * 1.1, Math.max(MIN_W, v.w));
    const h = w * aspect;
    return { x: clampAxis(v.x, w, BX, BW, 40), y: clampAxis(v.y, h, BY, BH, 40), w, h };
  };
  const setVb = (v, ms = 0) => {
    cancelAnimationFrame(anim);
    const to = clampVb(v);
    goal = to;
    animEnd = ms ? performance.now() + ms : 0;
    if (!ms) {
      vb = to;
      apply();
      return;
    }
    const from = { ...vb };
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - (1 - k) ** 3;
      vb = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e };
      apply();
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };
  const zoomAt = (factor, cx, cy, ms = 0) => {
    const w = vb.w / factor;
    const h = w * aspect;
    setVb({ x: cx - ((cx - vb.x) * w) / vb.w, y: cy - ((cy - vb.y) * h) / vb.h, w, h }, ms);
  };
  // 枠の大きさが変わったら（画面の回転・表示切り替え）、中心と拡大率を保ったまま合わせ直す。
  // 拡大・移動のアニメーション中なら、行き先も合わせ直して続ける
  new ResizeObserver(() => {
    const r = wrap.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    const fullW = fullVb().w - 1;
    const vbFull = vb.w >= fullW;
    const goalFull = goal.w >= fullW;
    aspect = r.height / r.width;
    const refit = (v, full) => (full ? fullVb() : clampVb({ x: v.x, y: v.y + v.h / 2 - (v.w * aspect) / 2, w: v.w }));
    const left = animEnd - performance.now();
    const target = refit(goal, goalFull);
    vb = refit(vb, vbFull);
    apply();
    if (left > 16) setVb(target, left);
    else setVb(target);
  }).observe(wrap);
  // 幅 w の表示範囲を、要素いっぱい（縦横比を保って中央寄せ）に描いたときの拡大率と余白
  const fit = (w) => {
    const rect = svg.getBoundingClientRect();
    const h = w * aspect;
    const s = Math.min(rect.width / w, rect.height / h) || 1;
    return { s, ox: (rect.width - w * s) / 2, oy: (rect.height - h * s) / 2, left: rect.left, top: rect.top };
  };
  const toSvg = (clientX, clientY) => {
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const pt = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return { x: pt.x, y: pt.y };
  };
  const toScreen = (x, y) => {
    const m = svg.getScreenCTM();
    if (!m) return { x: innerWidth / 2, y: innerHeight / 2 };
    const pt = new DOMPoint(x, y).matrixTransform(m);
    return { x: pt.x, y: pt.y };
  };

  if (controls) {
    controls.addEventListener('click', (e) => {
      const z = e.target.closest('button');
      if (!z) return;
      const c = { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 };
      if (z.dataset.z === 'in') zoomAt(1.8, c.x, c.y, 220);
      else if (z.dataset.z === 'out') zoomAt(1 / 1.8, c.x, c.y, 220);
      else setVb(fullVb(), 260);
    });
  }

  // ---- 入力: 1 本指のタップ = 回答、ドラッグ = 移動、2 本指 = ピンチ
  const pointers = new Map();
  let gesture = null;
  let enabled = true;
  svg.addEventListener('pointerdown', (e) => {
    svg.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false,
      tile: e.target.closest('.tile') });
    if (pointers.size === 2 && zoomable) {
      const [a, b] = [...pointers.values()];
      gesture = { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: toSvg((a.x + b.x) / 2, (a.y + b.y) / 2), vb: { ...vb } };
      pointers.forEach((p) => { p.moved = true; });
    }
  });
  svg.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (Math.hypot(p.x - p.x0, p.y - p.y0) > 9) p.moved = true;
    if (!zoomable) return;
    if (pointers.size === 2 && gesture) {
      // 最初に指の間にあった地図上の点が、いまの指の間に来るように拡大・移動する
      const [a, b] = [...pointers.values()];
      const factor = Math.hypot(a.x - b.x, a.y - b.y) / Math.max(1, gesture.dist);
      const w = Math.min(fullVb().w * 1.1, Math.max(MIN_W, gesture.vb.w / factor));
      const f = fit(w);
      const mx = (a.x + b.x) / 2 - f.left;
      const my = (a.y + b.y) / 2 - f.top;
      setVb({ x: gesture.mid.x - (mx - f.ox) / f.s, y: gesture.mid.y - (my - f.oy) / f.s, w, h: w * aspect });
    } else if (pointers.size === 1 && p.moved && vb.w < fullVb().w - 1) {
      const f = fit(vb.w);
      setVb({ ...vb, x: vb.x - dx / f.s, y: vb.y - dy / f.s });
    }
  });
  // 海の上を押したときは、ラベル位置がいちばん近い県（一定の距離以内）に当たったことにする
  const nearestTile = (clientX, clientY) => {
    let best = null;
    let bestD = SNAP_PX;
    for (const p of PREFECTURES) {
      const s = toScreen(p.label[0], p.label[1]);
      const d = Math.hypot(s.x - clientX, s.y - clientY);
      if (d < bestD) { bestD = d; best = p.code; }
    }
    return best;
  };
  const end = (e) => {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) gesture = null;
    if (!p || e.type === 'pointercancel') return;
    const quick = performance.now() - p.t0 < 700;
    if (p.moved || !quick || !enabled) return;
    const hit = p.tile || document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.tile');
    const code = hit && svg.contains(hit) ? Number(hit.dataset.code) : nearestTile(e.clientX, e.clientY);
    if (code) onTap(code, { x: e.clientX, y: e.clientY });
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  if (zoomable) {
    svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      const c = toSvg(e.clientX, e.clientY);
      zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, c.x, c.y);
    }, { passive: false });
  }

  const each = (fn) => tiles.forEach((t, code) => fn(t, code));
  function zoomTo(codes, { pad = 30, ms = 380 } = {}) {
    if (!codes || !codes.length) {
      setVb(fullVb(), ms);
      return;
    }
    const boxes = codes.map((c) => PREF[c].box);
    const x0 = Math.min(...boxes.map((b) => b[0])) - pad;
    const y0 = Math.min(...boxes.map((b) => b[1])) - pad;
    const x1 = Math.max(...boxes.map((b) => b[0] + b[2])) + pad;
    const y1 = Math.max(...boxes.map((b) => b[1] + b[3])) + pad;
    // 枠の縦横比のまま、範囲がすべて入るいちばん大きい表示にする
    const w = Math.min(fullVb().w, Math.max(MIN_W, x1 - x0, (y1 - y0) / aspect));
    const h = w * aspect;
    setVb({ x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h }, ms);
  }
  apply();

  return {
    el: wrap,
    svg,
    setEnabled(on) { enabled = on; },
    // colors: 地方の色で塗る / labels: 'all'（入る県は表示）| 'none'（答えた県だけ表示）
    setStyle({ colors = true, labels: mode = 'all' } = {}) {
      svg.classList.toggle('plain', !colors);
      svg.classList.toggle('hide-labels', mode === 'none');
    },
    clearMarks() {
      each(({ g, lbl }) => {
        g.classList.remove('target', 'dim', 'wrong', 'ok', 'hint', 'show', 'pick');
        lbl.classList.remove('show');
      });
      updateLabels();
    },
    mark(code, cls, on = true) {
      const t = tiles.get(code);
      if (!t) return;
      t.g.classList.toggle(cls, on);
      if (cls === 'show') {
        t.lbl.classList.toggle('show', on);
        updateLabels();
      }
      if (on && FRONT.has(cls)) t.g.parentNode.appendChild(t.g); // 太い枠が隣の県に隠れないよう前に出す
    },
    flash(code, cls, ms = 700) {
      const t = tiles.get(code);
      if (!t) return;
      t.g.parentNode.appendChild(t.g);
      t.g.classList.remove(cls);
      void t.g.getBBox();
      t.g.classList.add(cls);
      setTimeout(() => t.g.classList.remove(cls), ms);
    },
    dimExcept(codes) {
      const keep = codes ? new Set(codes) : null;
      each(({ g }, code) => g.classList.toggle('dim', Boolean(keep) && !keep.has(code)));
    },
    setLevels(levelOf) {
      each(({ g }, code) => {
        for (let i = 0; i <= 3; i++) g.classList.toggle(`lv-${i}`, levelOf(code) === i);
      });
    },
    // 県の中心（ラベル位置）を画面座標で返す（演出の位置合わせ用）
    centerOf(code) {
      const p = PREF[code];
      return p ? toScreen(p.label[0], p.label[1]) : { x: innerWidth / 2, y: innerHeight / 2 };
    },
    // 県（本土部分）が画面上で何ピクセルに見えるか（拡大・移動のアニメーション中は、行き着いた先での大きさ）
    screenBox(code) {
      const s = pxPerUnit(goal);
      return { w: PREF[code].box[2] * s, h: PREF[code].box[3] * s };
    },
    zoomTo,
    // 県が小さくしか見えないときは、となりの県ごと寄る（まわりも入れて、どこの県か分かるようにする）
    showSmall(code, { minPx = 28, ms = 300 } = {}) {
      const p = PREF[code];
      const s = pxPerUnit(goal);
      if (Math.min(p.box[2], p.box[3]) * s >= minPx) return;
      zoomTo([code, ...p.near], { pad: p.near.length ? 30 : 90, ms });
    },
    resetZoom(ms = 0) { setVb(fullVb(), ms); },
  };
}
