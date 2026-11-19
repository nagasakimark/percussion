'use strict';

/* =========================================================
   DATA
   ========================================================= */
const W = 1366, H = 598;     // design size (student Chromebook usable area)

const GROUPS = {
  skin:  '<ruby>皮<rt>かわ</rt></ruby>が はってある がっき',
  metal: '<ruby>金属<rt>きんぞく</rt></ruby>で できている がっき',
  wood:  '<ruby>木<rt>き</rt></ruby>で できている がっき',
};

// rms: measured loudness of each sample (dB) → used to balance levels.
// roll: hits per second for ウ/エ cards. ring: sound keeps ringing (metal etc.)
const INSTRUMENTS = [
  { id: 'bongo',      group: 'skin',  name: 'ボンゴ',          rms: -17.3, roll: 11 },
  { id: 'tambourine', group: 'skin',  name: 'タンブリン',      rms: -17.9, roll: 10 },
  { id: 'conga',      group: 'skin',  name: 'コンガ',          rms: -14.5, roll: 10 },
  { id: 'framedrum',  group: 'skin',  name: 'フレームドラム',  rms: -12.1, roll: 10 },
  { id: 'snare',      group: 'skin',  name: '<ruby>小<rt>こ</rt></ruby>だいこ', rms: -18.8, roll: 14 },
  { id: 'triangle',   group: 'metal', name: 'トライアングル',  rms: -18.8, roll: 12, ring: true },
  { id: 'suzu',       group: 'metal', name: 'すず',            rms: -16.9, roll: 8,  ring: true },
  { id: 'cymbal',     group: 'metal', name: 'シンバル',        rms: -22.8, roll: 10, ring: true },
  { id: 'tonechime',  group: 'metal', name: 'トーンチャイム',  rms: -10.8, roll: 6,  ring: true },
  { id: 'glock',      group: 'metal', name: '<ruby>鉄琴<rt>てっきん</rt></ruby>', rms: -14.2, roll: 10, ring: true },
  { id: 'castanet',   group: 'wood',  name: 'カスタネット',    rms: -23.5, roll: 10 },
  { id: 'claves',     group: 'wood',  name: 'クラベス',        rms: -26.9, roll: 9 },
  { id: 'woodblock',  group: 'wood',  name: 'ウッドブロック',  rms: -19.6, roll: 10 },
  { id: 'maracas',    group: 'wood',  name: 'マラカス',        rms: -27.0, roll: 9 },
  { id: 'guiro',      group: 'wood',  name: 'ギロ',            rms: -18.7, roll: 4 },
  { id: 'xylophone',  group: 'wood',  name: '<ruby>木琴<rt>もっきん</rt></ruby>', rms: -12.8, roll: 10 },
];
function iconSVG(id, size = 56) {
  return `<img class="icon" src="icons/${id}.svg" width="${size}" height="${size}" alt="" draggable="false">`;
}
const INST = Object.fromEntries(INSTRUMENTS.map(i => [i.id, i]));
INSTRUMENTS.forEach(i => { i.gain = Math.pow(10, Math.min(0, -19 - i.rms) * 0.8 / 20); });

const WEAK = 0.28, STRONG = 1.0;
const CARDS = {
  a: { label: 'ア', kind: 'hits', vel: [WEAK, WEAK, STRONG, STRONG], cap: 'よわ よわ つよ つよ' },
  i: { label: 'イ', kind: 'hits', vel: [STRONG, STRONG, WEAK, WEAK], cap: 'つよ つよ よわ よわ' },
  u: { label: 'ウ', kind: 'cresc', cap: 'だんだん つよく' },
  e: { label: 'エ', kind: 'dim',   cap: 'だんだん よわく' },
};
const CARD_ORDER = ['a', 'i', 'u', 'e'];

const COLS = 12;                 // 0 = はじめ, 1..10 = なか, 11 = おわり
const MID = [1, 10];
const isTutti = c => c === 0 || c === COLS - 1;   // all 3 play together
const ROW_COLORS = ['#e8504f', '#2f9e6b', '#2f7ec4'];

const EXAMPLE = {
  inst: ['woodblock', 'castanet', 'claves'],
  grid: [
    ['a', 'a', null, null, 'u', null, null, null, null, null, 'i', 'u'],
    ['a', null, 'a', null, null, 'e', null, null, null, 'i', 'i', 'u'],
    ['a', null, null, 'a', null, null, 'u', 'e', 'i', 'i', 'i', 'u'],
  ],
};

/* =========================================================
   STATE  (saved to localStorage)
   ========================================================= */
const STORE_KEY = 'percussion-v1';
let state = {
  inst: ['tambourine', 'triangle', 'castanet'],
  grid: [0, 1, 2].map(() => Array(COLS).fill(null)),
  bpm: 92,
  mute: [false, false, false],
  chart: {},                    // id -> {x, y} as fractions 0..1
};
try {
  const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
  if (saved && saved.grid && saved.inst) {
    // older saves had a shorter middle section: keep start/middle/end in place
    saved.grid = saved.grid.map(row => {
      if (row.length === COLS) return row;
      const mid = row.slice(1, -1).concat(Array(COLS).fill(null)).slice(0, COLS - 2);
      return [row[0], ...mid, row[row.length - 1]];
    });
    Object.assign(state, saved);
  }
} catch (e) { /* storage blocked – fine */ }
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
}

/* =========================================================
   AUDIO
   ========================================================= */
const AC = window.AudioContext || window.webkitAudioContext;
const ctx = new AC();
const master = ctx.createGain();
master.gain.value = 0.9;
const comp = ctx.createDynamicsCompressor();
comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
master.connect(comp).connect(ctx.destination);

const buffers = {};
INSTRUMENTS.forEach(inst => {
  fetch(`sounds/${inst.id}.mp3`)
    .then(r => r.arrayBuffer())
    .then(b => new Promise((ok, ng) => ctx.decodeAudioData(b, ok, ng)))
    .then(buf => { buffers[inst.id] = buf; })
    .catch(() => {});
});

function unlockAudio() { if (ctx.state === 'suspended') ctx.resume(); }
document.addEventListener('pointerdown', unlockAudio, true);

let liveSources = [];

function hit(dest, id, time, vel) {
  const buf = buffers[id];
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.03;
  const g = ctx.createGain();
  g.gain.value = vel * INST[id].gain;
  src.connect(g).connect(dest);
  src.start(Math.max(time, ctx.currentTime));
  liveSources.push(src);
  src.onended = () => { liveSources = liveSources.filter(s => s !== src); };
}

// Schedule one 4-beat card.
function scheduleCard(dest, instId, cardId, t0, beat) {
  const card = CARDS[cardId], inst = INST[instId];
  if (card.kind === 'hits') {
    card.vel.forEach((v, k) => hit(dest, instId, t0 + k * beat, v));
    return;
  }
  // ウ / エ : a roll of quick, even hits whose overall volume swells or fades
  const dur = 4 * beat;
  const bus = ctx.createGain();
  bus.connect(dest);
  const n = Math.max(4, Math.floor(dur * inst.roll));
  const step = dur / n;
  const per = inst.ring ? 0.45 : 0.75;
  for (let k = 0; k < n; k++) {
    const jitter = (Math.random() - 0.5) * step * 0.12;
    hit(bus, instId, t0 + k * step + (k ? jitter : 0), per * (0.9 + Math.random() * 0.2));
  }
  if (card.kind === 'cresc') {
    bus.gain.setValueAtTime(0.05, t0);
    bus.gain.exponentialRampToValueAtTime(1.0, t0 + dur);
  } else {
    bus.gain.setValueAtTime(1.0, t0);
    bus.gain.exponentialRampToValueAtTime(0.03, t0 + dur);
  }
}

/* ---------- playback of the score ---------- */
let playing = null;   // {t0, from, to, bar, beat, rows, bus, rowBus}

function play(from = 0, to = COLS - 1, rows = [0, 1, 2], opts = {}) {
  stop(true);
  unlockAudio();
  const beat = 60 / state.bpm, bar = 4 * beat;
  const t0 = ctx.currentTime + 0.12;
  const bus = ctx.createGain();
  bus.connect(master);
  const rowBus = [0, 1, 2].map(r => {
    const g = ctx.createGain();
    g.gain.value = (state.mute[r] && !opts.ignoreMute) ? 0 : 1;
    g.connect(bus);
    return g;
  });
  for (let c = from; c <= to; c++) {
    rows.forEach(r => {
      const card = state.grid[r][c];
      if (card) scheduleCard(rowBus[r], state.inst[r], card, t0 + (c - from) * bar, beat);
    });
  }
  playing = { t0, from, to, bar, beat, rows, bus, rowBus, showHead: !opts.preview };
  setPlayingUI(true);
  requestAnimationFrame(tick);
}

function stop(quick) {
  if (!playing) return;
  const p = playing;
  playing = null;
  const now = ctx.currentTime;
  p.bus.gain.cancelScheduledValues(now);
  p.bus.gain.setValueAtTime(p.bus.gain.value, now);
  p.bus.gain.linearRampToValueAtTime(0, now + (quick ? 0.05 : 0.15));
  const srcs = liveSources.slice();
  setTimeout(() => srcs.forEach(s => { try { s.stop(); } catch (e) {} }), 200);
  setPlayingUI(false);
}

function previewCard(cardId, instId, rowForHighlight = null, col = null) {
  // play one card on its own (used for taps)
  stop(true);
  unlockAudio();
  const beat = 60 / state.bpm;
  const t0 = ctx.currentTime + 0.05;
  const bus = ctx.createGain();
  bus.connect(master);
  scheduleCard(bus, instId, cardId, t0, beat);
  playing = {
    t0, from: col ?? 0, to: col ?? 0, bar: 4 * beat, beat,
    rows: rowForHighlight == null ? [] : [rowForHighlight], bus, rowBus: [], showHead: false,
    single: rowForHighlight == null ? null : { r: rowForHighlight, c: col },
  };
  setPlayingUI(true, true);
  requestAnimationFrame(tick);
}

function tick() {
  if (!playing) { clearBeatMarks(); return; }
  const p = playing;
  const el = ctx.currentTime - p.t0;
  const total = (p.to - p.from + 1) * p.bar;
  if (el > total + 0.05) {
    // let ringing sounds finish naturally
    playing = null;
    setPlayingUI(false);
    clearBeatMarks();
    return;
  }
  if (el >= 0) {
    const col = p.from + Math.floor(el / p.bar);
    const inBar = (el % p.bar) / p.bar;
    const beatIdx = Math.floor((el % p.bar) / p.beat);
    if (p.showHead) movePlayhead(col, inBar);
    markBeat(col, beatIdx, inBar, p);
  }
  requestAnimationFrame(tick);
}

/* =========================================================
   UI HELPERS
   ========================================================= */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let scale = 1;

function fit() {
  scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  $('#app').style.transform = `scale(${scale})`;
}
window.addEventListener('resize', fit);

function cardSVG(id, w = 100, h = 60) {
  const shapes = {
    a: `<circle class="s0" cx="16" cy="30" r="6"/><circle class="s1" cx="33" cy="30" r="6"/>
        <circle class="s2" cx="57" cy="30" r="11"/><circle class="s3" cx="83" cy="30" r="11"/>`,
    i: `<circle class="s0" cx="18" cy="30" r="11"/><circle class="s1" cx="44" cy="30" r="11"/>
        <circle class="s2" cx="68" cy="30" r="6"/><circle class="s3" cx="85" cy="30" r="6"/>`,
    u: `<polygon class="wedge" points="9,30 91,11 91,49"/>`,
    e: `<polygon class="wedge" points="9,11 9,49 91,30"/>`,
  }[id];
  return `<svg class="cardsvg card-${id}" viewBox="0 0 100 60" width="${w}" height="${h}">
    <rect class="cbg" x="1.5" y="1.5" width="97" height="57" rx="9"/>${shapes}</svg>`;
}

/* =========================================================
   SCORE (grid) – built once, refreshed on change
   ========================================================= */
// css grid columns: 1 inst | 2 はじめ | 3 gap | 4..13 なか | 14 gap | 15 おわり
const END_COL = COLS + 3;
const gridCol = c => c === 0 ? 2 : (c === COLS - 1 ? END_COL : 3 + c);

function buildScore() {
  const score = $('#score');
  const head = (cls, label, rule, colStart, colEnd, from, to) => {
    const d = document.createElement('div');
    d.className = 'sec-head ' + cls;
    d.style.gridColumn = `${colStart} / ${colEnd}`;
    d.innerHTML = `<button class="sec-play" title="ここだけ きく">▶</button>
      <span class="sec-label">${label}</span><span class="sec-rule">${rule}</span>`;
    d.querySelector('.sec-play').addEventListener('click', () => play(from, to));
    score.appendChild(d);
  };
  head('h-start', '<ruby>始<rt>はじ</rt></ruby>め', '3人いっしょに', 2, 3, 0, 0);
  head('h-mid', '<ruby>中<rt>なか</rt></ruby>', 'ア・イ・ウ・エ を ぜんぶ つかって じゆうに ならべよう', 4, END_COL - 1, MID[0], MID[1]);
  head('h-end', '<ruby>終<rt>お</rt></ruby>わり', '3人いっしょに', END_COL, END_COL + 1, COLS - 1, COLS - 1);

  // background panels
  [['p-start', 2, 3], ['p-mid', 4, END_COL - 1], ['p-end', END_COL, END_COL + 1]].forEach(([cls, a, b]) => {
    const p = document.createElement('div');
    p.className = 'panel ' + cls;
    p.style.gridColumn = `${a} / ${b}`;
    p.style.gridRow = '2 / 5';
    score.appendChild(p);
  });

  for (let r = 0; r < 3; r++) {
    const ib = document.createElement('div');
    ib.className = 'inst';
    ib.style.gridRow = r + 2;
    ib.style.setProperty('--rc', ROW_COLORS[r]);
    ib.innerHTML = `<button class="inst-btn" data-r="${r}">
        <span class="num">${r + 1}</span><span class="ico"></span><span class="nm"></span>
      </button>
      <button class="mute" data-r="${r}" title="おとを けす"></button>`;
    ib.querySelector('.inst-btn').addEventListener('click', () => openPicker(r));
    ib.querySelector('.mute').addEventListener('click', () => {
      state.mute[r] = !state.mute[r];
      if (playing && playing.rowBus[r]) playing.rowBus[r].gain.setTargetAtTime(state.mute[r] ? 0 : 1, ctx.currentTime, 0.02);
      save(); refresh();
    });
    score.appendChild(ib);

    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell' + (isTutti(c) ? ' tutti' : '');
      cell.dataset.r = r; cell.dataset.c = c;
      cell.style.gridRow = r + 2;
      cell.style.gridColumn = gridCol(c);
      cell.style.setProperty('--rc', ROW_COLORS[r]);
      score.appendChild(cell);
    }
  }
}

function cellEl(r, c) { return $(`.cell[data-r="${r}"][data-c="${c}"]`); }

function refresh() {
  // instruments
  for (let r = 0; r < 3; r++) {
    const inst = INST[state.inst[r]];
    const box = $$('.inst')[r];
    box.querySelector('.ico').innerHTML = iconSVG(inst.id, 38);
    box.querySelector('.nm').innerHTML = inst.name;
    const m = box.querySelector('.mute');
    m.textContent = state.mute[r] ? '🔇' : '🔊';
    m.classList.toggle('on', state.mute[r]);
    box.classList.toggle('muted', state.mute[r]);
  }
  // cards
  for (let r = 0; r < 3; r++) for (let c = 0; c < COLS; c++) {
    const cell = cellEl(r, c), id = state.grid[r][c];
    const cur = cell.querySelector('.pcard');
    if (cur && cur.dataset.card === id) continue;
    cell.innerHTML = '';
    if (id) {
      const pc = document.createElement('div');
      pc.className = 'pcard';
      pc.dataset.card = id;
      pc.innerHTML = cardSVG(id, 84, 52);
      cell.appendChild(pc);
      makeDraggable(pc, {
        ghost: () => cardSVG(id, 104, 62),
        onTap: () => { lastRow = r; previewCard(id, state.inst[r], r, c); },
        onStart: () => { $('#trash').classList.add('show'); },
        onMove: (x, y) => hoverCell(x, y, id),
        onDrop: (x, y) => { dropCard(id, x, y, { r, c }); $('#trash').classList.remove('show'); },
      });
    }
  }
  // checklist
  const used = new Set();
  for (let r = 0; r < 3; r++) for (let c = MID[0]; c <= MID[1]; c++) if (state.grid[r][c]) used.add(state.grid[r][c]);
  $$('#check .chip').forEach(ch => ch.classList.toggle('ok', used.has(ch.dataset.card)));
  $('#check').classList.toggle('all', used.size === 4);
  // tempo
  $$('#tempoSeg button').forEach(b => b.classList.toggle('on', +b.dataset.bpm === state.bpm));
  renderChart();
}

/* ---------- placing cards ---------- */
function setCard(r, c, id) {
  if (isTutti(c)) for (let rr = 0; rr < 3; rr++) state.grid[rr][c] = id;
  else state.grid[r][c] = id;
}

function cellAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return el && el.closest ? el.closest('.cell') : null;
}

function hoverCell(x, y) {
  $$('.cell.hover').forEach(c => c.classList.remove('hover'));
  const cell = cellAt(x, y);
  if (cell) {
    const c = +cell.dataset.c;
    if (isTutti(c)) for (let r = 0; r < 3; r++) cellEl(r, c).classList.add('hover');
    else cell.classList.add('hover');
  }
  const el = document.elementFromPoint(x, y);
  $('#trash').classList.toggle('over', !!(el && el.closest && el.closest('#trash')));
}

function dropCard(id, x, y, from) {
  $$('.cell.hover').forEach(c => c.classList.remove('hover'));
  $('#trash').classList.remove('over');
  const cell = cellAt(x, y);
  if (!cell) {
    if (from) { setCard(from.r, from.c, null); poof(x, y); }
  } else {
    const r = +cell.dataset.r, c = +cell.dataset.c;
    if (from && from.r === r && from.c === c) return;
    if (from) setCard(from.r, from.c, null);
    setCard(r, c, id);
    lastRow = r;
    pop(r, c);
  }
  save(); refresh();
}

function pop(r, c) {
  const rows = isTutti(c) ? [0, 1, 2] : [r];
  rows.forEach(rr => {
    const pc = cellEl(rr, c).querySelector('.pcard');
    if (pc) { pc.classList.remove('popin'); void pc.offsetWidth; pc.classList.add('popin'); }
  });
}

function poof(x, y) {
  const p = document.createElement('div');
  p.className = 'poof';
  p.textContent = '💨';
  p.style.left = x + 'px'; p.style.top = y + 'px';
  document.body.appendChild(p);
  setTimeout(() => p.remove(), 600);
}

/* ---------- playhead & beat lights ---------- */
function movePlayhead(col, frac) {
  const cell = cellEl(0, Math.min(col, COLS - 1));
  if (!cell) return;
  const ph = $('#playhead');
  ph.style.display = 'block';
  ph.style.left = (cell.offsetLeft + frac * cell.offsetWidth) + 'px';
}

let marked = [];
function clearBeatMarks() {
  marked.forEach(el => { el.removeAttribute('data-beat'); el.classList.remove('now'); el.style.removeProperty('--swell'); });
  marked = [];
  $('#playhead').style.display = 'none';
  $$('.cell.now').forEach(c => c.classList.remove('now'));
}
function markBeat(col, beatIdx, frac, p) {
  clearBeatMarksKeepHead();
  const rows = p.single ? [p.single.r] : p.rows;
  rows.forEach(r => {
    const cell = cellEl(r, col);
    if (!cell) return;
    const pc = cell.querySelector('.pcard');
    if (!pc) return;
    pc.dataset.beat = beatIdx;
    pc.classList.add('now');
    const kind = CARDS[pc.dataset.card].kind;
    if (kind === 'cresc') pc.style.setProperty('--swell', (0.25 + 0.75 * frac).toFixed(3));
    if (kind === 'dim') pc.style.setProperty('--swell', (1 - 0.75 * frac).toFixed(3));
    marked.push(pc);
  });
  // tray card preview highlight
  if (p.trayCard) {
    const tc = p.trayCard, kind = CARDS[tc.dataset.card].kind;
    tc.dataset.beat = beatIdx;
    tc.classList.add('now');
    if (kind === 'cresc') tc.style.setProperty('--swell', (0.25 + 0.75 * frac).toFixed(3));
    if (kind === 'dim') tc.style.setProperty('--swell', (1 - 0.75 * frac).toFixed(3));
    marked.push(tc);
  }
}
function clearBeatMarksKeepHead() {
  marked.forEach(el => { el.removeAttribute('data-beat'); el.classList.remove('now'); el.style.removeProperty('--swell'); });
  marked = [];
}

function setPlayingUI(on, preview) {
  $('#btnPlay').classList.toggle('active', on && !preview);
  $('#btnStop').disabled = !on;
  if (!on) $('#playhead').style.display = 'none';
}

/* =========================================================
   DRAG & DROP (pointer events – works with mouse and touch)
   ========================================================= */
function makeDraggable(el, o) {
  el.addEventListener('pointerdown', e => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY;
    let ghost = null;
    const move = ev => {
      if (!ghost) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        ghost = document.createElement('div');
        ghost.className = 'ghost';
        ghost.innerHTML = o.ghost();
        ghost.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(-3deg)`;
        document.body.appendChild(ghost);
        el.classList.add('dragging');
        o.onStart && o.onStart();
      }
      ghost.style.left = ev.clientX + 'px';
      ghost.style.top = ev.clientY + 'px';
      o.onMove && o.onMove(ev.clientX, ev.clientY);
    };
    const up = ev => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.classList.remove('dragging');
      if (ghost) {
        ghost.remove();
        o.onDrop && o.onDrop(ev.clientX, ev.clientY);
      } else if (ev.type === 'pointerup') {
        o.onTap && o.onTap();
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
}

/* =========================================================
   TRAY
   ========================================================= */
let lastRow = 0;
function buildTray() {
  const t = $('#trayCards');
  CARD_ORDER.forEach(id => {
    const d = document.createElement('div');
    d.className = 'tcard';
    d.innerHTML = `<div class="tcard-face" data-card="${id}">${cardSVG(id, 116, 70)}</div>
      <div class="tcard-cap"><b>${CARDS[id].label}</b> ${CARDS[id].cap}</div>`;
    t.appendChild(d);
    makeDraggable(d, {
      ghost: () => cardSVG(id, 104, 62),
      onTap: () => {
        previewCard(id, state.inst[lastRow]);
        if (playing) playing.trayCard = d.querySelector('.tcard-face');
      },
      onMove: (x, y) => hoverCell(x, y),
      onDrop: (x, y) => dropCard(id, x, y, null),
    });
  });
}

/* =========================================================
   INSTRUMENT PICKER
   ========================================================= */
let pickRow = 0;
function buildPicker() {
  const body = $('#pickerBody');
  body.innerHTML = Object.keys(GROUPS).map(g => `
    <div class="pgroup g-${g}">
      <div class="pgroup-title">${GROUPS[g]}</div>
      <div class="pgrid">
        ${INSTRUMENTS.filter(i => i.group === g).map(i => `
          <button class="ptile" data-id="${i.id}">${iconSVG(i.id, 52)}<span>${i.name}</span></button>`).join('')}
      </div>
    </div>`).join('') + `<div class="picker-foot"><button id="pickerOk" class="btn-play">これに する！</button></div>`;
  $$('#pickerBody .ptile').forEach(b => b.addEventListener('click', () => {
    state.inst[pickRow] = b.dataset.id;
    $$('#pickerBody .ptile').forEach(x => x.classList.toggle('sel', x === b));
    unlockAudio();
    stop(true);
    hit(master, b.dataset.id, ctx.currentTime + 0.02, 0.9);
    b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    save(); refresh();
  }));
  $('#pickerOk').addEventListener('click', closePicker);
  $('#pickerClose').addEventListener('click', closePicker);
  $('#picker').addEventListener('pointerdown', e => { if (e.target.id === 'picker') closePicker(); });
}
function openPicker(r) {
  pickRow = r; lastRow = r;
  $('#pickerTitle').innerHTML = `<span class="num" style="background:${ROW_COLORS[r]}">${r + 1}</span> がっきを えらぼう <small>（タップすると 音が でるよ）</small>`;
  $$('#pickerBody .ptile').forEach(x => x.classList.toggle('sel', x.dataset.id === state.inst[r]));
  $('#picker').classList.remove('hidden');
}
function closePicker() { $('#picker').classList.add('hidden'); }

/* =========================================================
   EXPLORE: hard/soft × short/long chart
   ========================================================= */
function buildPalette() {
  const pal = $('#palette');
  pal.innerHTML = Object.keys(GROUPS).map(g => `
    <div class="pgroup g-${g}">
      <div class="pgroup-title">${GROUPS[g]}</div>
      <div class="pgrid">
        ${INSTRUMENTS.filter(i => i.group === g).map(i => `
          <div class="ptile etile" data-id="${i.id}">${iconSVG(i.id, 38)}<span>${i.name}</span></div>`).join('')}
      </div>
    </div>`).join('');
  $$('.etile').forEach(t => {
    const id = t.dataset.id;
    makeDraggable(t, {
      ghost: () => `<div class="chip-inst">${iconSVG(id, 48)}</div>`,
      onTap: () => sampleTap(id, t),
      onMove: (x, y) => $('#chart').classList.toggle('over', overChart(x, y)),
      onDrop: (x, y) => placeOnChart(id, x, y),
    });
  });
}

function sampleTap(id, el) {
  unlockAudio();
  stop(true);
  hit(master, id, ctx.currentTime + 0.02, 0.9);
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}

function overChart(x, y) {
  const r = $('#chart').getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function placeOnChart(id, x, y) {
  const chart = $('#chart');
  chart.classList.remove('over');
  if (overChart(x, y)) {
    const r = chart.getBoundingClientRect();
    const fx = Math.min(0.95, Math.max(0.05, (x - r.left) / r.width));
    const fy = Math.min(0.93, Math.max(0.07, (y - r.top) / r.height));
    state.chart[id] = { x: fx, y: fy };
  } else {
    delete state.chart[id];
  }
  save(); renderChart();
}

function renderChart() {
  const chart = $('#chart');
  chart.querySelectorAll('.placed').forEach(p => p.remove());
  Object.entries(state.chart).forEach(([id, pos]) => {
    if (!INST[id]) return;
    const d = document.createElement('div');
    d.className = 'placed';
    d.style.left = (pos.x * 100) + '%';
    d.style.top = (pos.y * 100) + '%';
    d.innerHTML = `${iconSVG(id, 42)}<span>${INST[id].name}</span>`;
    chart.appendChild(d);
    makeDraggable(d, {
      ghost: () => `<div class="chip-inst">${iconSVG(id, 48)}</div>`,
      onTap: () => sampleTap(id, d),
      onMove: (x, y) => chart.classList.toggle('over', overChart(x, y)),
      onDrop: (x, y) => placeOnChart(id, x, y),
    });
  });
  $$('.etile').forEach(t => t.classList.toggle('used', !!state.chart[t.dataset.id]));
}

/* =========================================================
   HEADER / CONTROLS
   ========================================================= */
function twoTap(btn, label, confirmLabel, action) {
  let armed = false, timer;
  btn.addEventListener('click', () => {
    if (!armed && !gridEmpty()) {
      armed = true;
      btn.classList.add('armed');
      btn.textContent = confirmLabel;
      timer = setTimeout(() => { armed = false; btn.classList.remove('armed'); btn.innerHTML = label; }, 3000);
      return;
    }
    clearTimeout(timer);
    armed = false; btn.classList.remove('armed'); btn.innerHTML = label;
    action();
  });
}
function gridEmpty() { return state.grid.every(row => row.every(v => !v)); }

function setupControls() {
  $$('.tab').forEach(t => t.addEventListener('click', () => {
    stop(true);
    $$('.tab').forEach(x => x.classList.toggle('active', x === t));
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === t.dataset.screen));
    document.body.dataset.screen = t.dataset.screen;
  }));
  $('#btnPlay').addEventListener('click', () => play());
  $('#btnStop').addEventListener('click', () => stop());
  $$('#tempoSeg button').forEach(b => b.addEventListener('click', () => {
    state.bpm = +b.dataset.bpm; save(); refresh();
  }));
  twoTap($('#btnExample'), '📖 おてほん', 'うわがき してもいい？', () => {
    stop(true);
    state.inst = EXAMPLE.inst.slice();
    state.grid = EXAMPLE.grid.map(r => r.slice());
    state.mute = [false, false, false];
    save(); refresh();
    for (let c = 0; c < COLS; c++) pop(0, c);
  });
  twoTap($('#btnClear'), '🗑 ぜんぶ けす', 'ほんとうに けす？', () => {
    stop(true);
    state.grid = [0, 1, 2].map(() => Array(COLS).fill(null));
    save(); refresh();
  });
  $('#btnQR').addEventListener('click', () => $('#qr').classList.remove('hidden'));
  $('#qr').addEventListener('pointerdown', () => $('#qr').classList.add('hidden'));
  $('#btnChartReset').addEventListener('click', () => { state.chart = {}; save(); renderChart(); });
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !e.repeat && document.body.dataset.screen !== 'explore') {
      e.preventDefault();
      playing ? stop() : play();
    }
  });
}

/* =========================================================
   INIT
   ========================================================= */
document.body.dataset.screen = 'compose';
buildScore();
buildTray();
buildPicker();
buildPalette();
setupControls();
refresh();
fit();
