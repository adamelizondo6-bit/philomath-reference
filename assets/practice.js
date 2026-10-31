/* Philomath Reference — must-knows and practice.
   Registers the #/must and #/practice routes, the drill settings pages, the shared round player
   (multiple choice and typed answers), the grid games, and the progress hooks used elsewhere. */
(function () {
'use strict';
var P = window.PM, h = P.h, store = P.store, save = P.save, shuffle = P.shuffle;
var MK = window.MUSTKNOWS || { groups: [], items: [] };
var DR = window.DRILLS || [], GR = window.GRIDS || [], U = window.DRILL_UTIL;
var SETS = (window.QBANK && window.QBANK.sets) || [];
var LETTERS = 'ABCDE';
var DS_CHOICES = [
  'Statement (1) ALONE is sufficient, but statement (2) alone is not.',
  'Statement (2) ALONE is sufficient, but statement (1) alone is not.',
  'BOTH statements TOGETHER are sufficient, but NEITHER statement alone is.',
  'EACH statement ALONE is sufficient.',
  'Statements (1) and (2) TOGETHER are NOT sufficient.'
];
var KIND = { ps: 'Problem solving', ds: 'Data sufficiency', cr: 'Critical reasoning', rc: 'Reading comprehension' };
var REALM_GROUP = { lin: 'R', log: 'V' };

/* ---------- progress helpers ---------- */
function starsFor(c, t) { var p = t ? c / t : 0; return p >= 0.9 ? 3 : p >= 0.7 ? 2 : p >= 0.5 ? 1 : 0; }
function recordRound(bucket, id, correct, total, byCount) {
  var b = P.bucket(bucket), r = b[id] || { best: 0, total: total, stars: 0, plays: 0 };
  r.plays++; r.last = Date.now();
  if (byCount) { if (correct >= (r.best || 0)) { r.best = correct; r.total = total; } }
  else if (correct / total >= (r.best || 0) / (r.total || total)) { r.best = correct; r.total = total; }
  r.stars = Math.max(r.stars || 0, starsFor(correct, total));
  b[id] = r; save(); return r;
}
function roundRec(bucket, id) { return P.bucket(bucket)[id] || null; }
function mustRec(id) { return P.bucket('must')[id] || null; }
function boxOf(id) { var r = mustRec(id); return r ? (r.box || 0) : 0; }
function markMust(id, ok) {
  var b = P.bucket('must'), r = b[id] || { box: 0, seen: 0, miss: 0 };
  r.seen++; r.last = Date.now();
  if (ok) r.box = Math.min(3, (r.box || 0) + 1); else { r.box = 1; r.miss++; }
  b[id] = r; save();
}
function groupItems(gid) { return MK.items.filter(function (i) { return i.g === gid; }); }
function groupOf(gid) { for (var i = 0; i < MK.groups.length; i++) if (MK.groups[i].id === gid) return MK.groups[i]; return null; }
function stats(items) {
  var s = { n: items.length, known: 0, learning: 0, weak: 0, fresh: 0 };
  items.forEach(function (i) { var r = mustRec(i.id); if (!r || !r.seen) s.fresh++; else if (r.box >= 3) s.known++; else if (r.box === 2) s.learning++; else s.weak++; });
  return s;
}
function isWeak(i) { var r = mustRec(i.id); return !!(r && r.seen && r.box <= 1); }
function weakFirst(items) { return shuffle(items.slice()).sort(function (a, b) { return boxOf(a.id) - boxOf(b.id); }); }
function scopeItems(scope) {
  if (scope === 'all') return MK.items.slice();
  if (scope === 'weak') { var w = MK.items.filter(isWeak); return w.length >= 4 ? w : w.concat(MK.items.filter(function (i) { return !isWeak(i) && !mustRec(i.id); })); }
  return groupItems(scope);
}
function scopeTitle(scope) { if (scope === 'all') return 'All must-knows'; if (scope === 'weak') return 'Weak spots'; var g = groupOf(scope); return g ? g.title : 'Must-knows'; }
function setById(id) { for (var i = 0; i < SETS.length; i++) if (SETS[i].id === id) return SETS[i]; return null; }
function drillById(id) { for (var i = 0; i < DR.length; i++) if (DR[i].id === id) return DR[i]; return null; }
function gridById(id) { for (var i = 0; i < GR.length; i++) if (GR[i].id === id) return GR[i]; return null; }
function allQuestions(filter) {
  var out = [];
  SETS.forEach(function (s) { s.questions.forEach(function (q) { if (!filter || filter(s, q)) out.push(toItem(s, q)); }); });
  return out;
}
function toItem(set, q) {
  return { id: q.id, set: set.id, kind: set.kind, q: q.q, p: q.p || null, c: q.c || (set.kind === 'ds' ? DS_CHOICES : []), a: q.a, e: q.e || '', l: q.l || null, big: false };
}
function mmss(s) { var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
function linkTitle(l) {
  var m = l && l.match(/^#\/(num|lin|log)\/([a-z0-9-]+)$/);
  if (m) return P.titleOf(m[1], m[2]);
  if (l && l.indexOf('#/formulas') === 0) return 'Formula sheet';
  return 'reference';
}
function starsBig(n) { var s = h('div.stars'); for (var i = 0; i < 3; i++) s.appendChild(h(i < n ? 'span' : 'span.off', '★')); return s; }
function bar(frac) { return h('div.bar', h('i', { style: 'width:' + Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%' })); }
function parseNumber(str) {
  var s = String(str).replace(/[,\s$%]/g, '').replace(/[−–]/g, '-');
  if (!s) return null;
  var m = s.match(/^(-?)(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/), v;
  if (m) v = (m[1] ? -1 : 1) * parseFloat(m[2]) / parseFloat(m[3]); else { if (!/^-?\d*\.?\d+$/.test(s)) return null; v = parseFloat(s); }
  return isFinite(v) ? v : null;
}
function typedOk(v, it) { var tol = Math.max(it.tol || 0, 1e-9 * Math.max(1, Math.abs(it.ans))); return Math.abs(v - it.ans) <= tol + 1e-12; }

/* ---------- drill settings ---------- */
function settingsFor(def) {
  var saved = P.bucket('dopts')[def.id] || {}, s = {};
  def.opts.forEach(function (o) {
    var v = saved[o.key];
    if (o.type === 'multi') {
      var arr = Array.isArray(v) ? v.filter(function (x) { return o.values.indexOf(x) >= 0; }) : o.def.slice();
      if (!arr.length && !o.any) arr = o.def.slice();
      s[o.key] = arr;
    } else s[o.key] = o.values.indexOf(v) >= 0 ? v : o.def;
  });
  return s;
}
function saveSetting(def, key, val) { var b = P.bucket('dopts'); if (!b[def.id]) b[def.id] = {}; b[def.id][key] = val; save(); }
function recLine(rec, id) {
  var parts = [];
  if (rec) parts.push(h('span', [P.stars(rec.stars), ' best ' + rec.best + '/' + rec.total + ' \u00b7 ' + rec.plays + ' play' + (rec.plays === 1 ? '' : 's')]));
  if (id) {
    var sprint = null;
    ['t60', 't120', 't180', 'lives3'].forEach(function (m) { var r = roundRec('drills', id + '@' + m); if (r && (!sprint || r.best > sprint.best)) sprint = { best: r.best, m: m }; });
    if (sprint) parts.push(h('span', (parts.length ? ' \u00b7 ' : '') + modeLabel(sprint.m) + ': ' + sprint.best));
  }
  return parts.length ? h('div.sub', parts) : h('div.sub', 'Not played yet');
}
function settingsPage(def, playHref, note) {
  var s = settingsFor(def);
  var pg = h('div.pg.pg-prac', [h('div.crumb', [h('a', { href: '#/practice' }, 'Practice')]), h('h1', def.title), h('p.intro', def.sub), recLine(roundRec('drills', def.id), def.id)]);
  if (note) pg.appendChild(h('div.settings-note', note));
  def.opts.forEach(function (o) {
    var row = h('div.optrow', [h('div.lab', o.label)]), chips = h('div.chips'), btns = [];
    function paint() {
      btns.forEach(function (b) { var v = b.val; var on = v === null ? !s[o.key].length : (o.type === 'multi' ? s[o.key].indexOf(v) >= 0 : s[o.key] === v); b.el.classList.toggle('on', on); });
    }
    o.values.forEach(function (v, i) {
      var lab = o.labels ? o.labels[i] : String(v);
      var el = h('button.chip' + (typeof v === 'number' && !o.labels ? '.num' : ''), { type: 'button' }, lab);
      el.addEventListener('click', function () {
        if (o.type === 'multi') { var arr = s[o.key].slice(), ix = arr.indexOf(v); if (ix >= 0) arr.splice(ix, 1); else arr.push(v); if (!arr.length && !o.any) return; arr.sort(function (a, b) { return o.values.indexOf(a) - o.values.indexOf(b); }); s[o.key] = arr; saveSetting(def, o.key, arr); }
        else { s[o.key] = v; saveSetting(def, o.key, v); }
        paint();
      });
      btns.push({ el: el, val: v }); chips.appendChild(el);
    });
    if (o.type === 'multi' && o.any) {
      var anyEl = h('button.chip', { type: 'button' }, 'Any');
      anyEl.addEventListener('click', function () { s[o.key] = []; saveSetting(def, o.key, []); paint(); });
      btns.push({ el: anyEl, val: null }); chips.appendChild(anyEl);
    }
    if (o.type === 'multi' && !o.any && o.values.length > 4) {
      var allEl = h('button.chip', { type: 'button' }, 'All');
      allEl.addEventListener('click', function () { s[o.key] = o.values.slice(); saveSetting(def, o.key, s[o.key]); paint(); });
      btns.push({ el: allEl, val: undefined }); chips.appendChild(allEl);
    }
    paint();
    row.appendChild(chips); pg.appendChild(row);
  });
  pg.appendChild(h('div.startbar', h('a.btn.primary.block', { href: playHref }, 'Start')));
  P.mount(pg, def.title);
}

/* ---------- building rounds ---------- */
function fromRaw(raw, s) {
  if (raw.kind === 'num') {
    var bigN = !!raw.big && raw.q.length <= 30;
    if (s.mode === 'choice') { var m = U.toChoice(raw); return { q: m.q, c: m.choices, a: m.ans, e: m.exp, big: bigN, l: null }; }
    return { type: 'num', q: raw.q, ans: raw.ans, unit: raw.unit, neg: raw.neg, tol: raw.tol, e: raw.exp, big: bigN, l: null, ansText: U.display(raw, raw.ans) };
  }
  return { q: raw.q, c: raw.choices, a: raw.ans, e: raw.exp, big: !!raw.big && raw.q.length <= 30, yn: !!raw.yn, l: null };
}
function genRound(def, s, n) {
  var items = [], seen = {}, tries = 0;
  while (items.length < n && tries++ < n * 12) {
    var raw = def.gen(s);
    if (!raw || seen[raw.q]) continue;
    seen[raw.q] = true;
    items.push(fromRaw(raw, s));
  }
  return items;
}
function genStream(def, s) {
  var seen = {};
  return function () {
    for (var t = 0; t < 30; t++) { var raw = def.gen(s); if (!raw) continue; if (!seen[raw.q] || t > 20) { seen[raw.q] = true; return fromRaw(raw, s); } }
    return null;
  };
}
function parseMode(mode) {
  if (/^t\d+$/.test(mode)) return { limit: { time: parseInt(mode.slice(1), 10) }, n: 0 };
  if (/^lives\d+$/.test(mode)) return { limit: { lives: parseInt(mode.slice(5), 10) }, n: 0 };
  return { limit: null, n: parseInt(String(mode).replace(/^q/, ''), 10) || 10 };
}
function modeLabel(mode) {
  var m = parseMode(mode);
  if (m.limit && m.limit.time) return mmss(m.limit.time) + ' sprint';
  if (m.limit && m.limit.lives) return m.limit.lives + ' lives';
  return m.n + ' questions';
}
function mustQuizItem(it) {
  var typed = store.mustTyped !== false, a = String(it.a);
  if (typed && /^\$?[\d,]+(\.\d+)?%?$/.test(a)) {
    var unit = a.charAt(0) === '$' ? '$' : a.slice(-1) === '%' ? '%' : '', v = parseNumber(a), dec = /\.\d/.test(a);
    return { type: 'num', id: it.id, mk: it.id, q: it.q, ans: v, unit: unit, neg: false, tol: dec ? (unit === '%' ? 0.05 : 0.006) : 0, e: it.n || '', l: it.l, big: it.q.length <= 30, ansText: a };
  }
  var ds = [];
  if (it.alts && it.alts.length >= 3) ds = shuffle(it.alts.slice()).slice(0, 3);
  else {
    var pool = MK.items.filter(function (x) { return x.id !== it.id && x.g === it.g && (!it.k || x.k === it.k); }).map(function (x) { return x.a; });
    if (pool.length < 3) pool = pool.concat(MK.items.filter(function (x) { return x.id !== it.id && x.g === it.g; }).map(function (x) { return x.a; }));
    if (pool.length < 3) pool = pool.concat(MK.items.filter(function (x) { return x.g !== it.g; }).map(function (x) { return x.a; }));
    var seen = {}; seen[it.a] = true;
    shuffle(pool).forEach(function (x) { if (ds.length < 3 && !seen[x]) { seen[x] = true; ds.push(x); } });
  }
  var choices = shuffle([it.a].concat(ds));
  return { id: it.id, mk: it.id, q: it.q, c: choices, a: choices.indexOf(it.a), e: it.n || '', l: it.l, big: false };
}

/* ---------- daily activity ---------- */
function todayKey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function bumpDaily() { var d = P.bucket('daily'), k = todayKey(); d[k] = (d[k] || 0) + 1; save(); }
function dailyStats() {
  var d = P.bucket('daily'), today = d[todayKey()] || 0, streak = 0, dt = new Date();
  for (var i = 0; i < 400; i++) {
    var k = dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate();
    if (d[k]) streak++; else if (i > 0) break;
    dt.setDate(dt.getDate() - 1);
  }
  return { today: today, streak: streak };
}
function dailyLine() { var d = dailyStats(); return h('div.daily', 'Today: ' + d.today + ' answered' + (d.streak > 1 ? ' · ' + d.streak + '-day streak' : d.today ? ' · streak started' : '')); }

/* ---------- on-screen keypad (no text box to tap into) ---------- */
function keypad(fn) {
  var el = h('div.keypad'), pm, enter;
  function key(label, cls, act) { var b = h('button' + (cls ? '.' + cls : ''), { type: 'button' }, label); b.addEventListener('click', act); el.appendChild(b); return b; }
  [['7', '8', '9', 'back'], ['4', '5', '6', 'pm'], ['1', '2', '3', '.'], ['0', '/']].forEach(function (row) {
    row.forEach(function (k) {
      if (k === 'back') key('⌫', null, function () { fn.back(); });
      else if (k === 'pm') pm = key('±', 'pmk', function () { fn.pm(); });
      else if (k === '0') key('0', 'wide', function () { fn.digit('0'); });
      else key(k, null, function () { fn.digit(k); });
    });
  });
  enter = key('Check', 'act', function () { fn.enter(); });
  el.press = function (k) { if (k === 'back') fn.back(); else if (k === 'pm') fn.pm(); else if (k === 'enter') fn.enter(); else fn.digit(k); };
  el.pm = pm; el.enter = enter;
  return el;
}

/* ---------- the round player ----------
   o: { title, back, backLabel, settings, items, more (fn for unlimited modes), limit ({time} | {lives} | null),
        letters, auto, deferred (exam mode: feedback at the end), pace (seconds per question, 0 = off), strict,
        cls, onItem, onDone(correct, total, stars, extra), again, againLabel } */
function playRound(o) {
  var items = (o.items || []).slice(), more = o.more || null, limit = o.limit || null, fixedN = limit ? 0 : items.length;
  var idx = 0, correct = 0, wrongs = 0, streak = 0, best = 0, misses = [], answers = [], t0 = Date.now(), qStart = Date.now(), lastPassage = null;
  var cur = null, answered = false, advanced = false, negOn = false, ended = false, timerId = null, choiceBtns = [];
  P.ext.lastRound = items;
  var root = h('div.pg.' + (o.cls || 'pg-prac'));
  P.mount(root, o.title);
  if (!limit && !fixedN) { root.appendChild(h('p.empty', 'Nothing to practice here yet.')); root.appendChild(h('a.btn', { href: o.back }, o.backLabel || 'Back')); return; }
  var headBox = h('div'), prog = h('i' + (limit && limit.time ? '.drain' : '')), passBox = h('div'), stemBox = h('div'), ansBox = h('div'), fbBox = h('div');
  root.appendChild(h('div.round', [headBox, h('div.prog', prog), passBox, stemBox, ansBox]));
  var entry = '';
  var tin = h('div.tin.disp.empty', '?'), pre = h('span.unit'), suf = h('span.unit');
  var typedBox = h('div.typed', [pre, tin, suf]);
  var pad = keypad({
    digit: function (d) { if (answered || !cur || cur.type !== 'num') return; if ((d === '.' || d === '/') && entry.indexOf(d) >= 0) return; if (entry.length < 12) { entry += d; paint(); } },
    back: function () { if (answered) return; entry = entry.slice(0, -1); paint(); },
    pm: function () { if (answered || !cur || !cur.neg) return; negOn = !negOn; paint(); },
    enter: function () { if (answered) advance(); else submitTyped(); }
  });
  function paint() {
    tin.textContent = (negOn ? '−' : '') + (entry || '?'); tin.classList.toggle('empty', !entry);
    pad.pm.classList.toggle('on', negOn);
    pad.enter.textContent = answered ? (hasNext() ? 'Next' : 'See results') : 'Check';
  }
  function hasNext() { return limit ? !(limit.lives && wrongs >= limit.lives) : idx + 1 < fixedN; }
  function remaining() { return limit && limit.time ? Math.max(0, limit.time - (Date.now() - t0) / 1000) : 0; }
  function qElapsed() { return (Date.now() - qStart) / 1000; }
  function head() {
    var mid;
    if (limit && limit.time) { var r = Math.ceil(remaining()); mid = h('span.clock' + (r <= 10 ? '.over' : ''), mmss(r)); }
    else if (limit && limit.lives) { var hearts = ''; for (var i = 0; i < limit.lives; i++) hearts += i < limit.lives - wrongs ? '♥' : '♡'; mid = h('span.lives', hearts); }
    else mid = h('span', (idx + 1) + ' / ' + fixedN);
    var qc = o.pace ? h('span.clock.q' + (qElapsed() > o.pace ? '.over' : ''), mmss(Math.floor(qElapsed()))) : null;
    return h('div.rhead', [h('a', { href: o.back }, '← ' + (o.backLabel || 'Back')), h('span.spacer'), qc, mid, h('span', '✓ ' + correct), streak >= 2 ? h('span.streak', '🔥 ' + streak) : null]);
  }
  function repaintHead() { P.clear(headBox); headBox.appendChild(head()); }
  function tick() {
    if (!document.body.contains(root)) { clearInterval(timerId); return; }
    if (ended) return;
    if (limit && limit.time) { prog.style.width = Math.round(remaining() / limit.time * 100) + '%'; if (remaining() <= 0) { finish(); return; } }
    repaintHead();
    if (o.pace && o.strict && !answered && qElapsed() >= o.pace) timeUp();
  }
  if ((limit && limit.time) || o.pace) timerId = setInterval(tick, 250);
  function onKey(ev) {
    if (!document.body.contains(root)) { document.removeEventListener('keydown', onKey); return; }
    if (ev.key === 'Enter') { ev.preventDefault(); if (answered) advance(); else if (cur && cur.type === 'num') submitTyped(); return; }
    if (!cur || answered) return;
    if (cur.type === 'num') {
      if (/^[0-9.\/]$/.test(ev.key)) { pad.press(ev.key); ev.preventDefault(); }
      else if (ev.key === 'Backspace') { pad.press('back'); ev.preventDefault(); }
      else if (ev.key === '-' && cur.neg) { pad.press('pm'); ev.preventDefault(); }
      return;
    }
    var k = ev.key.toLowerCase(), i = -1;
    if (cur.yn) { if (k === 'y') i = 0; else if (k === 'n') i = 1; }
    if (i < 0 && /^[a-e]$/.test(k)) i = k.charCodeAt(0) - 97;
    if (i < 0 && /^[1-5]$/.test(k)) i = parseInt(k, 10) - 1;
    if (i >= 0 && i < choiceBtns.length) { choiceBtns[i].click(); ev.preventDefault(); }
  }
  document.addEventListener('keydown', onKey);
  function nextItem() {
    if (idx < items.length) return items[idx];
    if (more) { var it = more(); if (it) { items.push(it); return it; } }
    return null;
  }
  function show() {
    cur = nextItem(); if (!cur) { finish(); return; }
    answered = false; advanced = false; qStart = Date.now(); choiceBtns = [];
    var it = cur;
    repaintHead();
    if (!limit) prog.style.width = Math.round(idx / fixedN * 100) + '%';
    else if (limit.lives) prog.style.width = '0%';
    P.clear(passBox);
    if (it.p) {
      var pass = h('div.passage', it.p);
      if (it.kind === 'rc' && it.p === lastPassage) {
        pass.classList.add('hidden');
        var tog = h('a.ptoggle', { href: '#' }, 'Show passage');
        tog.addEventListener('click', function (ev) { ev.preventDefault(); pass.classList.toggle('hidden'); tog.textContent = pass.classList.contains('hidden') ? 'Show passage' : 'Hide passage'; });
        passBox.appendChild(tog);
      }
      passBox.appendChild(pass);
      lastPassage = it.p;
    }
    P.clear(stemBox);
    if (it.kind === 'ds') stemBox.appendChild(h('div.ds-note', 'Data sufficiency: decide whether the statements give enough information to answer the question.'));
    stemBox.appendChild(h('div.stem' + (it.big ? '.big' : ''), it.q));
    P.clear(fbBox);
    if (it.type === 'num') {
      if (typedBox.parentNode !== ansBox) { P.clear(ansBox); ansBox.appendChild(typedBox); ansBox.appendChild(fbBox); ansBox.appendChild(pad); }
      pre.textContent = it.unit === '$' ? '$' : ''; suf.textContent = it.unit && it.unit !== '$' ? it.unit : '';
      pad.pm.classList.toggle('dim', !it.neg); negOn = false; entry = '';
      tin.classList.remove('ok', 'bad'); paint();
      window.scrollTo(0, 0);
    } else {
      P.clear(ansBox);
      var choices = h('div.choices' + (it.big ? '.grid2' : ''));
      it.c.forEach(function (c, i) {
        var b = h('button.choice', { type: 'button' }, [(o.letters && !it.big) ? h('span.lt', LETTERS[i]) : null, h('span', c)]);
        b.addEventListener('click', function () {
          if (answered) return;
          var ok = i === it.a;
          choiceBtns.forEach(function (bb, j) { bb.disabled = true; if (o.deferred) { if (j === i) bb.classList.add('picked'); return; } if (j === it.a) bb.classList.add('correct'); if (j === i) bb.classList.add(ok ? 'picked' : 'wrong'); });
          finishAnswer(ok, (o.letters && !it.big) ? LETTERS[it.a] : it.c[it.a], null, i);
        });
        choiceBtns.push(b); choices.appendChild(b);
      });
      ansBox.appendChild(choices); ansBox.appendChild(fbBox);
      window.scrollTo(0, 0);
    }
  }
  function submitTyped() {
    var v = parseNumber(entry);
    if (v == null) { if (entry) return; tin.classList.add('bad'); finishAnswer(false, cur.ansText, 'skip'); paint(); return; }
    if (negOn) v = -Math.abs(v);
    var ok = typedOk(v, cur);
    if (!o.deferred) tin.classList.add(ok ? 'ok' : 'bad');
    finishAnswer(ok, cur.ansText, null, null, (negOn ? '−' : '') + entry);
    if (!(ok && o.auto) && !o.deferred) paint();
  }
  function timeUp() {
    if (answered || !cur) return;
    if (cur.type === 'num') { if (!o.deferred) tin.classList.add('bad'); finishAnswer(false, cur.ansText, 'time'); paint(); }
    else { choiceBtns.forEach(function (bb, j) { bb.disabled = true; if (!o.deferred && j === cur.a) bb.classList.add('correct'); }); finishAnswer(false, (o.letters && !cur.big) ? LETTERS[cur.a] : cur.c[cur.a], 'time'); }
  }
  function finishAnswer(ok, ansText, why, pickedIdx, typedText) {
    answered = true;
    var it = cur, curIdx = idx, secs = qElapsed();
    answers.push({ it: it, ok: ok, why: why, picked: pickedIdx, typed: typedText, ansText: ansText, secs: secs });
    if (ok) { correct++; streak++; if (streak > best) best = streak; } else { streak = 0; wrongs++; misses.push(it); }
    if (o.onItem) o.onItem(it, ok);
    bumpDaily();
    repaintHead();
    var livesOut = limit && limit.lives && wrongs >= limit.lives;
    if (o.deferred && !livesOut) { setTimeout(function () { if (idx === curIdx && answered) advance(); }, 220); return; }
    if (ok && o.auto) { setTimeout(function () { if (idx === curIdx && answered) advance(); }, 450); return; }
    var f = h('div.feedback.' + (ok ? 'ok' : 'bad'));
    var label = ok ? ('Correct' + (streak >= 3 ? ' — ' + streak + ' in a row' : '')) : ((why === 'time' ? 'Time’s up' : why === 'skip' ? 'Skipped' : 'Not quite') + ' — the answer is ' + ansText);
    f.appendChild(h('b.v', label));
    if (it.e) f.appendChild(h('div.exp', it.e));
    if (it.l) f.appendChild(h('a.learn', { href: it.l }, 'Learn → ' + linkTitle(it.l)));
    if (it.type !== 'num') {
      var next = h('button.btn.primary.block', { type: 'button', style: 'margin-top:12px' }, hasNext() ? 'Next' : 'See results');
      next.addEventListener('click', advance);
      f.appendChild(next);
    } else paint();
    fbBox.appendChild(f);
    setTimeout(function () { f.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 30);
  }
  function advance() {
    if (!answered || advanced) return; advanced = true; idx++;
    if (limit && limit.lives && wrongs >= limit.lives) { finish(); return; }
    if (limit && limit.time && remaining() <= 0) { finish(); return; }
    show();
  }
  function finish() {
    if (ended) return; ended = true;
    clearInterval(timerId); document.removeEventListener('keydown', onKey);
    var answeredN = answers.length, secs = Math.round((Date.now() - t0) / 1000), total = limit ? answeredN : fixedN;
    var st = total ? starsFor(correct, total) : 0;
    if (limit && limit.time && answeredN < 5) st = 0;
    var avg = answeredN ? answers.reduce(function (a, x) { return a + x.secs; }, 0) / answeredN : 0;
    var rec = o.onDone ? o.onDone(correct, total, st, { answered: answeredN, secs: secs }) : null;
    P.clear(root);
    var res = h('div.result', [starsBig(st), h('div.score', correct + ' / ' + total)]);
    if (limit && limit.time) res.appendChild(h('div.modeline', answeredN + ' answered in ' + mmss(limit.time) + ' · ' + (Math.round(correct / limit.time * 600) / 10) + ' correct per minute'));
    else if (limit && limit.lives) res.appendChild(h('div.modeline', 'Survived ' + answeredN + ' question' + (answeredN === 1 ? '' : 's')));
    else if (o.pace) res.appendChild(h('div.modeline', 'Average ' + mmss(Math.round(avg)) + ' per question · target ' + mmss(o.pace) + ' · ' + answers.filter(function (x) { return x.secs > o.pace; }).length + ' over time'));
    res.appendChild(h('div.muted', st === 3 ? 'Excellent.' : st === 2 ? 'Solid — one more round for three stars.' : st === 1 ? 'Getting there.' : 'Keep at it — review below.'));
    res.appendChild(h('div.statrow', [h('div', [h('b', (total ? Math.round(correct / total * 100) : 0) + '%'), 'accuracy']), h('div', [h('b', String(best)), 'best streak']), h('div', [h('b', mmss(secs)), 'time'])]));
    if (rec && rec.best != null) res.appendChild(h('div.muted.small', 'Best so far: ' + rec.best + ' / ' + rec.total + ' · ' + rec.plays + ' play' + (rec.plays === 1 ? '' : 's')));
    var row = h('div.btnrow', { style: 'justify-content:center' });
    if (o.again) row.appendChild(h('button.btn.primary', { type: 'button', on: { click: o.again } }, o.againLabel || 'Play again'));
    if (o.settings) row.appendChild(h('a.btn', { href: o.settings }, 'Settings'));
    var list = h('div.review.hidden'), reviewAll = !!o.deferred, pool = reviewAll ? answers : answers.filter(function (x) { return !x.ok; });
    if (pool.length) {
      var mb = h('button.btn', { type: 'button' }, reviewAll ? 'Review all (' + pool.length + ')' : 'Review misses (' + pool.length + ')');
      mb.addEventListener('click', function () { list.classList.toggle('hidden'); });
      pool.forEach(function (x) {
        var m = x.it, your = x.why === 'time' ? 'ran out of time' : x.why === 'skip' ? 'skipped' : m.type === 'num' ? (x.typed || '') : ((o.letters && !m.big) ? LETTERS[x.picked] + ' — ' : '') + m.c[x.picked];
        var ansT = m.type === 'num' ? m.ansText : ((o.letters && !m.big) ? LETTERS[m.a] + ' — ' : '') + m.c[m.a];
        list.appendChild(h('div.miss', [o.pace || (limit && limit.time) ? h('span.t', mmss(Math.round(x.secs))) : null, h('div.q', m.q), h('div.your.' + (x.ok ? 'ok' : 'bad'), (x.ok ? '✓ ' : '✗ ') + 'Your answer: ' + your), x.ok ? null : h('div.a', 'Answer: ' + ansT), m.e ? h('div.small.muted', m.e) : null, m.l ? h('a.learn.small', { href: m.l }, 'Learn → ' + linkTitle(m.l)) : null]));
      });
      row.appendChild(mb);
    }
    row.appendChild(h('a.btn', { href: o.back }, o.backLabel || 'Back'));
    res.appendChild(row); res.appendChild(list);
    root.appendChild(h('div.round', [h('div.rhead', [h('a', { href: o.back }, '← ' + (o.backLabel || 'Back')), h('span.spacer'), h('span', o.title)]), res]));
    window.scrollTo(0, 0);
  }
  show();
}

/* ---------- grid games ---------- */
function playGrid(def) {
  var s = settingsFor(def), g = def.gen(s), checked = false, fills = [], cellEls = [], curCell = null;
  function selectCell(el) { if (curCell) curCell.classList.remove('cur'); curCell = el; el.classList.add('cur'); }
  var root = h('div.pg.pg-prac'); P.mount(root, def.title);
  var wrap = h('div.round', [h('div.rhead', [h('a', { href: '#/practice/grid/' + def.id }, '← ' + def.title), h('span.spacer'), h('span', g.targets + ' to find')]), h('div.stem', g.q)]);
  var gridEl = h('div.ggrid', { style: 'grid-template-columns:repeat(' + g.cols + ',1fr)' });
  g.cells.forEach(function (c) {
    var el;
    if (c.head) el = h('div.gcell.head', c.show);
    else if (g.mode === 'select') { el = h('button.gcell', { type: 'button' }, c.show); el.addEventListener('click', function () { if (!checked) el.classList.toggle('sel'); }); }
    else {
      el = h('div.gcell.fill', h('span.val', ''));
      el.addEventListener('click', function () { if (!checked) selectCell(el); });
      fills.push(el);
    }
    cellEls.push(el); gridEl.appendChild(el);
  });
  wrap.appendChild(gridEl);
  wrap.appendChild(h('div.glegend', g.mode === 'select' ? 'Tap a number to mark it; tap again to unmark. Then press Check.' : 'Tap a cell, key in the product, then Next cell. Press Check when the block is full.'));
  var pad = null;
  if (g.mode === 'fill') {
    pad = keypad({
      digit: function (d) { if (checked || !curCell || d === '.' || d === '/') return; var sp = curCell.firstChild; if (sp.textContent.length < 6) sp.textContent += d; },
      back: function () { if (checked || !curCell) return; var sp = curCell.firstChild; sp.textContent = sp.textContent.slice(0, -1); },
      pm: function () {},
      enter: function () { if (checked) return; var k = fills.indexOf(curCell); if (k >= 0 && k + 1 < fills.length) selectCell(fills[k + 1]); else if (fills.length) selectCell(fills[0]); }
    });
    pad.pm.classList.add('dim'); pad.enter.textContent = 'Next cell';
    wrap.appendChild(pad);
    if (fills.length) selectCell(fills[0]);
  }
  var checkBtn = h('button.btn.primary.block', { type: 'button' }, 'Check');
  checkBtn.addEventListener('click', check);
  wrap.appendChild(checkBtn);
  var resBox = h('div'); wrap.appendChild(resBox);
  root.appendChild(wrap);
  function onKey(ev) {
    if (!document.body.contains(root)) { document.removeEventListener('keydown', onKey); return; }
    if (!pad || checked) return;
    if (/^[0-9]$/.test(ev.key)) { pad.press(ev.key); ev.preventDefault(); }
    else if (ev.key === 'Backspace') { pad.press('back'); ev.preventDefault(); }
    else if (ev.key === 'Enter' || ev.key === 'Tab') { pad.press('enter'); ev.preventDefault(); }
  }
  document.addEventListener('keydown', onKey);
  function check() {
    if (checked) return; checked = true;
    var hits = 0, wrong = 0, missed = 0, total = g.targets;
    g.cells.forEach(function (c, i) {
      var el = cellEls[i]; if (c.head) return;
      if (g.mode === 'select') {
        var sel = el.classList.contains('sel'); el.classList.remove('sel'); el.disabled = true;
        if (c.target && sel) { hits++; el.classList.add('hit'); } else if (c.target) { missed++; el.classList.add('miss'); } else if (sel) { wrong++; el.classList.add('wrong'); }
      } else {
        var v = parseNumber(el.firstChild.textContent); el.classList.remove('cur');
        if (v !== null && v === c.ans) { hits++; el.classList.add('ok'); } else { wrong++; el.classList.add('bad'); el.appendChild(h('div.want', String(c.ans))); }
      }
    });
    var score = Math.max(0, hits - (g.mode === 'select' ? wrong : 0)), st = starsFor(score, total);
    var rec = recordRound('drills', def.id, score, total);
    checkBtn.classList.add('hidden'); if (pad) pad.classList.add('hidden');
    var res = h('div.result', [starsBig(st), h('div.score', hits + ' / ' + total), h('div.gscore', g.mode === 'select' ? (missed + ' missed · ' + wrong + ' wrong tap' + (wrong === 1 ? '' : 's')) : (wrong + ' wrong')), h('div.small.muted', { style: 'text-align:left;white-space:pre-line' }, g.exp)]);
    if (rec) res.appendChild(h('div.muted.small', 'Best so far: ' + rec.best + ' / ' + rec.total + ' · ' + rec.plays + ' play' + (rec.plays === 1 ? '' : 's')));
    res.appendChild(h('div.btnrow', { style: 'justify-content:center' }, [h('button.btn.primary', { type: 'button', on: { click: P.render } }, 'New grid'), h('a.btn', { href: '#/practice/grid/' + def.id }, 'Settings'), h('a.btn', { href: '#/practice' }, 'Practice')]));
    resBox.appendChild(res);
    setTimeout(function () { res.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 30);
  }
}

/* ---------- must-knows: hub ---------- */
P.route(/^#\/must$/, function () {
  var all = stats(MK.items), weak = MK.items.filter(isWeak).length, typed = store.mustTyped !== false;
  var pg = h('div.pg.pg-must', [
    h('h1', 'Must-knows'),
    h('p.intro', MK.items.length + ' facts, rules and tables to have cold on test day — pulled from the reference pages. Tap a group to browse, or test yourself with cards (self-graded) or a quiz. Weak items come back first.'),
    h('div.flex', [h('b', all.known + ' known'), h('span.muted', '· ' + all.learning + ' learning · ' + weak + ' weak · ' + all.fresh + ' not seen')]),
    bar(all.known / Math.max(1, all.n)),
    h('div.btnrow', [
      h('a.btn.primary', { href: '#/must/quiz/weak' }, weak >= 4 ? 'Quiz my weak spots (' + weak + ')' : 'Quiz: weak spots & new'),
      h('a.btn', { href: '#/must/quiz/all' }, 'Random quiz'),
      h('a.btn', { href: '#/must/cards/all' }, 'Random cards')
    ]),
    h('div.optrow', [h('div.lab', 'Number answers in quizzes'), h('div.chips', [
      h('button.chip' + (typed ? '.on' : ''), { type: 'button', on: { click: function () { store.mustTyped = true; save(); P.render(); } } }, 'Type them in'),
      h('button.chip' + (!typed ? '.on' : ''), { type: 'button', on: { click: function () { store.mustTyped = false; save(); P.render(); } } }, 'Multiple choice')
    ])]),
    h('div.optrow', [h('div.lab', 'Quiz round'), h('div.chips', ['q12', 'q24', 't60', 't120', 'lives3'].map(function (m) {
      return h('button.chip' + ((store.mustRound || 'q12') === m ? '.on' : ''), { type: 'button', on: { click: function () { store.mustRound = m; save(); P.render(); } } }, modeLabel(m));
    }))]),
    dailyLine()
  ]);
  var realm = '';
  MK.groups.forEach(function (g) {
    var label = g.realm === 'num' ? 'Math' : g.realm === 'lin' ? 'Verbal · Reading' : 'Verbal · Reasoning';
    if (label !== realm) { realm = label; pg.appendChild(h('div.fsec', label)); }
    var s = stats(groupItems(g.id));
    pg.appendChild(h('div.tile', { style: 'margin-top:10px' }, [
      h('a', { href: '#/must/g/' + g.id, style: 'text-decoration:none;color:inherit;display:block' }, [h('b', g.id + ' · ' + g.title), h('div.sub', s.n + ' items · ' + s.known + ' known' + (s.weak ? ' · ' + s.weak + ' weak' : ''))]),
      bar(s.known / Math.max(1, s.n)),
      h('div.flex', [h('a.btn.sm', { href: '#/must/g/' + g.id }, 'Browse'), h('a.btn.sm', { href: '#/must/cards/' + g.id }, 'Cards'), h('a.btn.sm.primary', { href: '#/must/quiz/' + g.id }, 'Quiz')])
    ]));
  });
  P.mount(pg, 'Must-knows');
});

/* ---------- must-knows: browse a group ---------- */
P.route(/^#\/must\/g\/([A-Z])(?:\/([A-Z0-9]+))?$/, function (gid, open) {
  var g = groupOf(gid); if (!g) return false;
  var items = groupItems(gid), s = stats(items);
  var pg = h('div.pg.pg-must', [
    h('div.crumb', [h('a', { href: '#/must' }, 'Must-knows')]),
    h('h1', g.id + ' · ' + g.title),
    h('div.muted.small', s.n + ' items · ' + s.known + ' known · ' + s.learning + ' learning · ' + s.weak + ' weak · ' + s.fresh + ' not seen'),
    bar(s.known / Math.max(1, s.n)),
    h('div.btnrow', [h('a.btn', { href: '#/must/cards/' + gid }, 'Cards'), h('a.btn.primary', { href: '#/must/quiz/' + gid }, 'Quiz'), h('button.btn.ghost', { type: 'button', on: { click: function () { var all = pg.querySelectorAll('.mk'), anyClosed = false, i; for (i = 0; i < all.length; i++) if (!all[i].classList.contains('open')) anyClosed = true; for (i = 0; i < all.length; i++) all[i].classList.toggle('open', anyClosed); } } }, 'Show / hide all')]),
    h('div.note', 'Tap an item to reveal the answer.')
  ]);
  var target = null;
  items.forEach(function (it) {
    var b = boxOf(it.id), r = mustRec(it.id);
    var card = h('div.mk' + (open === it.id ? '.open' : ''), { id: 'mk-' + it.id }, [
      h('div.front', it.q),
      h('div.back', [h('div', it.a), it.n ? h('div.note', { style: 'margin:6px 0 0' }, it.n) : null]),
      h('div.meta', [h('span.box' + (r && r.seen ? '.b' + b : '')), h('span', r && r.seen ? (b >= 3 ? 'known' : b === 2 ? 'learning' : 'weak') : 'not seen'), it.l ? h('a.learn', { href: it.l }, 'Learn →') : null])
    ]);
    card.addEventListener('click', function (ev) { if (ev.target.closest && ev.target.closest('a')) return; card.classList.toggle('open'); });
    pg.appendChild(card);
    if (open === it.id) target = card;
  });
  P.mount(pg, g.title);
  if (target) { setTimeout(function () { target.scrollIntoView({ block: 'center' }); }, 0); return 'noscroll'; }
});

/* ---------- must-knows: flashcards ---------- */
P.route(/^#\/must\/cards\/([A-Za-z]+)$/, function (scope) {
  var pool = scopeItems(scope); if (!pool.length) return false;
  var items = weakFirst(pool).slice(0, 20), idx = 0, got = 0, missed = [];
  var title = 'Cards · ' + scopeTitle(scope), root = h('div.pg.pg-must');
  P.mount(root, title);
  function show() {
    P.clear(root);
    var it = items[idx];
    var card = h('div.round', [
      h('div.rhead', [h('a', { href: '#/must' }, '← Must-knows'), h('span.spacer'), h('span', (idx + 1) + ' / ' + items.length), h('span', '✓ ' + got)]),
      h('div.prog', h('i', { style: 'width:' + Math.round(idx / items.length * 100) + '%' })),
      h('div.stem', it.q)
    ]);
    var back = h('div.feedback.hidden', [h('b.v', it.a), it.n ? h('div.exp', it.n) : null, it.l ? h('a.learn', { href: it.l }, 'Learn → ' + linkTitle(it.l)) : null]);
    var reveal = h('button.btn.primary.block', { type: 'button' }, 'Show answer');
    var revealed = false, sx = null;
    function miss() { markMust(it.id, false); bumpDaily(); missed.push(it); next(); }
    function hit() { markMust(it.id, true); bumpDaily(); got++; next(); }
    var grade = h('div.btnrow.hidden', [
      h('button.btn', { type: 'button', style: 'flex:1', on: { click: miss } }, '\u2717 Missed it'),
      h('button.btn.primary', { type: 'button', style: 'flex:1', on: { click: hit } }, '\u2713 Got it')
    ]);
    var hintSwipe = h('div.swipehint.hidden', 'Swipe right for got it, left for missed.');
    reveal.addEventListener('click', function () { revealed = true; back.classList.remove('hidden'); grade.classList.remove('hidden'); hintSwipe.classList.remove('hidden'); reveal.classList.add('hidden'); });
    card.classList.add('card-swipe');
    card.addEventListener('touchstart', function (ev) { sx = ev.touches[0].clientX; }, { passive: true });
    card.addEventListener('touchmove', function (ev) { if (sx === null || !revealed) return; var dx = ev.touches[0].clientX - sx; card.classList.toggle('right', dx > 40); card.classList.toggle('left', dx < -40); }, { passive: true });
    card.addEventListener('touchend', function (ev) { if (sx === null) return; var dx = ev.changedTouches[0].clientX - sx; sx = null; card.classList.remove('left', 'right'); if (!revealed) return; if (dx > 70) hit(); else if (dx < -70) miss(); });
    card.appendChild(reveal); card.appendChild(back); card.appendChild(grade); card.appendChild(hintSwipe);
    root.appendChild(card);
    window.scrollTo(0, 0);
  }
  function next() { idx++; if (idx < items.length) show(); else finish(); }
  function finish() {
    P.clear(root);
    var st = starsFor(got, items.length);
    var res = h('div.result', [starsBig(st), h('div.score', got + ' / ' + items.length), h('div.muted', 'Items you missed come back first next time.')]);
    res.appendChild(h('div.btnrow', { style: 'justify-content:center' }, [h('button.btn.primary', { type: 'button', on: { click: P.render } }, 'Again'), h('a.btn', { href: '#/must/quiz/' + scope }, 'Quiz these'), h('a.btn', { href: '#/must' }, 'Must-knows')]));
    if (missed.length) { var list = h('div', { style: 'margin-top:12px' }); missed.forEach(function (m) { list.appendChild(h('div.miss', [h('div.q', m.q), h('div.a', m.a), m.l ? h('a.learn.small', { href: m.l }, 'Learn →') : null])); }); res.appendChild(list); }
    root.appendChild(h('div.round', [h('div.rhead', [h('a', { href: '#/must' }, '← Must-knows'), h('span.spacer'), h('span', title)]), res]));
    window.scrollTo(0, 0);
  }
  show();
});

/* ---------- must-knows: quiz ---------- */
P.route(/^#\/must\/quiz\/([A-Za-z]+)$/, function (scope) {
  var pool = scopeItems(scope); if (!pool.length) return false;
  var mode = store.mustRound || 'q12', pm = parseMode(mode), items = [], more = null;
  if (!pm.limit) items = shuffle(weakFirst(pool).slice(0, pm.n).map(mustQuizItem));
  else { var queue = []; more = function () { if (!queue.length) queue = weakFirst(pool); return mustQuizItem(queue.shift()); }; }
  playRound({
    title: 'Quiz \u00b7 ' + scopeTitle(scope), back: '#/must', backLabel: 'Must-knows', items: items, more: more, limit: pm.limit, cls: 'pg-must', letters: true, auto: false,
    onItem: function (it, ok) { markMust(it.mk, ok); },
    onDone: function (c, n) { return recordRound('mustq', scope + (pm.limit ? '@' + mode : ''), c, n, !!pm.limit); },
    again: P.render, againLabel: 'Another round'
  });
});

/* ---------- practice: hub ---------- */
function totalStars() {
  var earned = 0, possible = 0;
  DR.concat(GR).forEach(function (d) { possible += 3; var r = roundRec('drills', d.id); if (r) earned += r.stars || 0; });
  SETS.forEach(function (s) { possible += 3; var r = roundRec('sets', s.id); if (r) earned += r.stars || 0; });
  return { earned: earned, possible: possible };
}
var AREA = { A: 'Numbers', B: 'Numbers', C: 'Numbers', D: 'Numbers', E: 'Numbers', F: 'Algebra & functions', G: 'Algebra & functions', L: 'Algebra & functions', M: 'Algebra & functions', H: 'Statistics, sets & counting', I: 'Statistics, sets & counting', J: 'Word problems & rates', K: 'Word problems & rates' };
var AREA_ORDER = ['Numbers', 'Algebra & functions', 'Statistics, sets & counting', 'Word problems & rates'];
function setLastPlay(href, title) { store.lastPlay = { href: href, title: title }; save(); }
function setOpts() { var o = store.setopts || {}; return { fb: o.fb === 'end' ? 'end' : 'each', timer: o.timer === 'pace' || o.timer === 'strict' ? o.timer : 'off' }; }
function saveSetOpt(k, v) { var o = store.setopts || {}; o[k] = v; store.setopts = o; save(); P.render(); }
function setPlayOpts() { var o = setOpts(); return { deferred: o.fb === 'end', pace: o.timer === 'off' ? 0 : (P.ext.paceSeconds || 120), strict: o.timer === 'strict' }; }
P.route(/^#\/practice$/, function () {
  var ts = totalStars(), missedIds = Object.keys(P.bucket('missed'));
  var pg = h('div.pg.pg-prac', [
    h('h1', 'Practice'),
    h('p.intro', 'Drills are generated fresh every round and you type the answers (or switch any drill to multiple choice in its settings). Grid games test a whole block at once. Question sets are GMAT-style problems with full explanations. Three stars is 90% or better.'),
    h('div.flex', [h('b', '\u2605 ' + ts.earned + ' of ' + ts.possible + ' stars')]),
    bar(ts.earned / Math.max(1, ts.possible)),
    dailyLine(),
    h('div.btnrow', [
      store.lastPlay && store.lastPlay.href ? h('a.btn.primary', { href: store.lastPlay.href }, '▶ Continue: ' + store.lastPlay.title) : null,
      h('a.btn' + (store.lastPlay ? '' : '.primary'), { href: '#/practice/mixed' }, 'Mixed set · 10 random'),
      h('a.btn' + (missedIds.length ? '' : '.ghost'), { href: '#/practice/missed' }, 'Retry missed (' + missedIds.length + ')')
    ])
  ]);
  AREA_ORDER.forEach(function (area) {
    var list = DR.filter(function (d) { return (AREA[d.sec] || 'Numbers') === area; });
    if (!list.length) return;
    pg.appendChild(h('div.fsec', 'Drills · ' + area));
    var grid = h('div.tiles');
    list.forEach(function (d) { grid.appendChild(h('a.tile', { href: '#/practice/drill/' + d.id }, [h('b', d.title), h('div.sub', d.sub), recLine(roundRec('drills', d.id), d.id)])); });
    pg.appendChild(grid);
  });
  pg.appendChild(h('div.fsec', 'Grid games'));
  var g2 = h('div.tiles');
  GR.forEach(function (d) { g2.appendChild(h('a.tile', { href: '#/practice/grid/' + d.id }, [h('b', d.title), h('div.sub', d.sub), recLine(roundRec('drills', d.id))])); });
  pg.appendChild(g2);
  var so = setOpts();
  pg.appendChild(h('div.fsec', 'Question sets'));
  pg.appendChild(h('div.optrow', [h('div.lab', 'Feedback'), h('div.chips', [
    h('button.chip' + (so.fb === 'each' ? '.on' : ''), { type: 'button', on: { click: function () { saveSetOpt('fb', 'each'); } } }, 'After each question'),
    h('button.chip' + (so.fb === 'end' ? '.on' : ''), { type: 'button', on: { click: function () { saveSetOpt('fb', 'end'); } } }, 'At the end (exam mode)')
  ])]));
  pg.appendChild(h('div.optrow', [h('div.lab', 'Timer \u00b7 2:00 per question'), h('div.chips', [
    h('button.chip' + (so.timer === 'off' ? '.on' : ''), { type: 'button', on: { click: function () { saveSetOpt('timer', 'off'); } } }, 'Off'),
    h('button.chip' + (so.timer === 'pace' ? '.on' : ''), { type: 'button', on: { click: function () { saveSetOpt('timer', 'pace'); } } }, 'Show the clock'),
    h('button.chip' + (so.timer === 'strict' ? '.on' : ''), { type: 'button', on: { click: function () { saveSetOpt('timer', 'strict'); } } }, 'Strict \u2014 moves on at 2:00')
  ])]));
  ['ps', 'ds', 'cr', 'rc'].forEach(function (kind) {
    var sets = SETS.filter(function (s) { return s.kind === kind; });
    if (!sets.length) return;
    pg.appendChild(h('div.fsec', KIND[kind]));
    var g3 = h('div.tiles');
    sets.forEach(function (s) { g3.appendChild(h('a.tile', { href: '#/practice/set/' + s.id }, [h('b', s.title), h('div.sub', s.questions.length + ' questions' + (s.blurb ? ' \u00b7 ' + s.blurb : '')), recLine(roundRec('sets', s.id))])); });
    pg.appendChild(g3);
  });
  P.mount(pg, 'Practice');
});

/* ---------- practice: drills ---------- */
P.route(/^#\/practice\/drill\/([a-z0-9-]+)$/, function (id) {
  var d = drillById(id); if (!d) return false;
  settingsPage(d, '#/practice/drill/' + d.id + '/play', 'Settings are remembered on this device.');
});
P.route(/^#\/practice\/drill\/([a-z0-9-]+)\/play$/, function (id) {
  var d = drillById(id); if (!d) return false;
  var s = settingsFor(d), mode = s.round || 'q10', pm = parseMode(mode);
  setLastPlay('#/practice/drill/' + d.id + '/play', d.title);
  playRound({
    title: d.title + (pm.limit ? ' \u00b7 ' + modeLabel(mode) : ''), back: '#/practice', backLabel: 'Practice', settings: '#/practice/drill/' + d.id,
    items: pm.limit ? [] : genRound(d, s, pm.n), more: pm.limit ? genStream(d, s) : null, limit: pm.limit, letters: false, auto: true,
    onDone: function (c, n) { return recordRound('drills', d.id + (pm.limit ? '@' + mode : ''), c, n, !!pm.limit); }, again: P.render
  });
});
P.route(/^#\/practice\/grid\/([a-z0-9-]+)$/, function (id) {
  var g = gridById(id); if (!g) return false;
  settingsPage(g, '#/practice/grid/' + g.id + '/play', null);
});
P.route(/^#\/practice\/grid\/([a-z0-9-]+)\/play$/, function (id) {
  var g = gridById(id); if (!g) return false;
  setLastPlay('#/practice/grid/' + g.id + '/play', g.title);
  playGrid(g);
});

/* ---------- practice: question sets ---------- */
function markMissed(it, ok) {
  if (!it.id || !it.set) return;
  var m = P.bucket('missed');
  if (ok) delete m[it.id]; else m[it.id] = it.set;
  save();
}
P.route(/^#\/practice\/set\/([a-z0-9-]+)$/, function (id) {
  var s = setById(id); if (!s) return false;
  var items = s.questions.map(function (q) { return toItem(s, q); });
  if (s.kind !== 'rc') items = shuffle(items);
  setLastPlay('#/practice/set/' + s.id, s.title);
  var po = setPlayOpts();
  playRound({ title: s.title, back: '#/practice', backLabel: 'Practice', items: items, letters: true, auto: false, deferred: po.deferred, pace: po.pace, strict: po.strict, onItem: markMissed, onDone: function (c, n) { return recordRound('sets', s.id, c, n); }, again: P.render });
});
P.route(/^#\/practice\/mixed$/, function () {
  var items = shuffle(allQuestions(function (s) { return s.kind !== 'rc'; })).slice(0, 10), po = setPlayOpts();
  playRound({ title: 'Mixed set', back: '#/practice', backLabel: 'Practice', items: items, letters: true, auto: false, deferred: po.deferred, pace: po.pace, strict: po.strict, onItem: markMissed, onDone: function (c, n) { return recordRound('sets', 'mixed', c, n); }, again: P.render, againLabel: 'New mixed set' });
});
P.route(/^#\/practice\/missed$/, function () {
  var ids = P.bucket('missed');
  var items = shuffle(allQuestions(function (s, q) { return !!ids[q.id]; }));
  if (!items.length) {
    P.mount(h('div.pg.pg-prac', [h('div.crumb', [h('a', { href: '#/practice' }, 'Practice')]), h('h1', 'Retry missed'), h('p', 'No missed questions saved. Questions you get wrong in any set land here until you answer them correctly.'), h('a.btn.primary', { href: '#/practice' }, 'Back to practice')]), 'Retry missed');
    return;
  }
  var po = setPlayOpts();
  playRound({ title: 'Retry missed', back: '#/practice', backLabel: 'Practice', items: items, letters: true, auto: false, deferred: po.deferred, pace: po.pace, strict: po.strict, onItem: markMissed, again: P.render });
});

/* ---------- hooks used by the core app ---------- */
var questionCount = 0; SETS.forEach(function (s) { questionCount += s.questions.length; });
P.ext.counts = function () { return { must: MK.items.length, questions: questionCount, drills: DR.length + GR.length }; };
P.ext.homeMust = function () { var s = stats(MK.items), w = MK.items.filter(isWeak).length; return s.known + ' of ' + s.n + ' known' + (w ? ' · ' + w + ' weak' : '') + ' · cards & quizzes'; };
P.ext.homePractice = function () { var t = totalStars(), d = dailyStats(); return '\u2605 ' + t.earned + '/' + t.possible + ' \u00b7 today ' + d.today + ' answered' + (d.streak > 1 ? ' \u00b7 ' + d.streak + '-day streak' : ''); };
P.ext.progressSummary = function () {
  var s = stats(MK.items), t = totalStars(), plays = 0, b, k;
  b = P.bucket('drills'); for (k in b) if (b.hasOwnProperty(k)) plays += b[k].plays || 0;
  b = P.bucket('sets'); for (k in b) if (b.hasOwnProperty(k)) plays += b[k].plays || 0;
  return 'Saved on this device only: ' + s.known + ' of ' + s.n + ' must-knows known, ' + t.earned + ' of ' + t.possible + ' practice stars, ' + plays + ' rounds played, ' + Object.keys(P.bucket('missed')).length + ' questions waiting in "retry missed".';
};
P.ext.related = function (realm, sec) {
  if (!sec) return null;
  var gid = realm === 'num' ? sec.id : REALM_GROUP[realm], g = groupOf(gid), links = [];
  if (g) { links.push(h('a.chip', { href: '#/must/g/' + g.id }, '✓ Must-knows: ' + g.title)); links.push(h('a.chip', { href: '#/must/quiz/' + g.id }, 'Quiz ' + g.id)); }
  if (realm === 'num') {
    DR.forEach(function (d) { if (d.sec === sec.id) links.push(h('a.chip', { href: '#/practice/drill/' + d.id }, '▶ Drill: ' + d.title)); });
    GR.forEach(function (d) { if (d.sec === sec.id) links.push(h('a.chip', { href: '#/practice/grid/' + d.id }, '▦ Grid: ' + d.title)); });
  }
  SETS.forEach(function (s) { if (s.realm === realm && (!s.sec || s.sec === sec.id || realm !== 'num')) links.push(h('a.chip', { href: '#/practice/set/' + s.id }, '▶ Set: ' + s.title)); });
  if (!links.length) return null;
  return h('div.related', [h('div.fsec', 'Practice this'), h('div.chips', links)]);
};
P.searchers.push(function (q) {
  var out = [];
  for (var i = 0; i < MK.items.length && out.length < 12; i++) {
    var it = MK.items[i];
    if ((it.q + ' ' + it.a).toLowerCase().indexOf(q) >= 0) out.push({ href: '#/must/g/' + it.g + '/' + it.id, title: it.q, sub: 'Must-know · ' + it.a });
  }
  for (var j = 0; j < DR.length && out.length < 16; j++) if ((DR[j].title + ' ' + DR[j].sub).toLowerCase().indexOf(q) >= 0) out.push({ href: '#/practice/drill/' + DR[j].id, title: DR[j].title, sub: 'Drill · ' + DR[j].sub });
  return out;
});
})();
