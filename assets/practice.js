/* Philomath Reference — must-knows and practice.
   Registers the #/must and #/practice routes, the shared round player used by drills, question
   sets and must-know quizzes, and the progress hooks the home page and content pages use. */
(function () {
'use strict';
var P = window.PM, h = P.h, store = P.store, save = P.save, shuffle = P.shuffle;
var MK = window.MUSTKNOWS || { groups: [], items: [] };
var DR = window.DRILLS || [];
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
function recordRound(bucket, id, correct, total) {
  var b = P.bucket(bucket), r = b[id] || { best: 0, total: total, stars: 0, plays: 0 };
  r.plays++; r.last = Date.now();
  if (correct / total >= (r.best || 0) / (r.total || total)) { r.best = correct; r.total = total; }
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
function weakFirst(items) {
  return shuffle(items.slice()).sort(function (a, b) { return boxOf(a.id) - boxOf(b.id); });
}
function scopeItems(scope) {
  if (scope === 'all') return MK.items.slice();
  if (scope === 'weak') { var w = MK.items.filter(isWeak); return w.length >= 4 ? w : w.concat(MK.items.filter(function (i) { return !isWeak(i) && !mustRec(i.id); })); }
  return groupItems(scope);
}
function scopeTitle(scope) { if (scope === 'all') return 'All must-knows'; if (scope === 'weak') return 'Weak spots'; var g = groupOf(scope); return g ? g.title : 'Must-knows'; }
function setById(id) { for (var i = 0; i < SETS.length; i++) if (SETS[i].id === id) return SETS[i]; return null; }
function drillById(id) { for (var i = 0; i < DR.length; i++) if (DR[i].id === id) return DR[i]; return null; }
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
function mustQuizItem(it) {
  var ds = [];
  if (it.alts && it.alts.length >= 3) ds = shuffle(it.alts.slice()).slice(0, 3);
  else {
    var pool = MK.items.filter(function (x) { return x.id !== it.id && x.g === it.g && (!it.k || x.k === it.k); }).map(function (x) { return x.a; });
    if (pool.length < 3) pool = pool.concat(MK.items.filter(function (x) { return x.id !== it.id && x.g === it.g; }).map(function (x) { return x.a; }));
    if (pool.length < 3) pool = pool.concat(MK.items.filter(function (x) { return x.g !== it.g; }).map(function (x) { return x.a; }));
    var seen = {}; seen[it.a] = true;
    shuffle(pool).forEach(function (a) { if (ds.length < 3 && !seen[a]) { seen[a] = true; ds.push(a); } });
  }
  var choices = shuffle([it.a].concat(ds));
  return { id: it.id, mk: it.id, q: it.q, c: choices, a: choices.indexOf(it.a), e: it.n || '', l: it.l, big: false };
}
function genRound(drill, n) {
  var items = [], seen = {}, tries = 0;
  while (items.length < n && tries++ < 80) {
    var q = drill.gen();
    if (!q || seen[q.q]) continue;
    seen[q.q] = true;
    items.push({ q: q.q, c: q.choices, a: q.ans, e: q.exp, big: q.big, l: null });
  }
  return items;
}

/* ---------- the round player ---------- */
function playRound(o) {
  var items = o.items, n = items.length, idx = 0, correct = 0, streak = 0, best = 0, misses = [], t0 = Date.now(), lastPassage = null;
  var root = h('div.pg.' + (o.cls || 'pg-prac'));
  P.mount(root, o.title);
  if (!n) { root.appendChild(h('p.empty', 'Nothing to practice here yet.')); root.appendChild(h('a.btn', { href: o.back }, o.backLabel || 'Back')); return; }
  function head() {
    return h('div.rhead', [
      h('a', { href: o.back }, '← ' + (o.backLabel || 'Back')), h('span.spacer'),
      h('span', (idx + 1) + ' / ' + n), h('span', '✓ ' + correct),
      streak >= 2 ? h('span.streak', '🔥 ' + streak) : null
    ]);
  }
  function show() {
    P.clear(root);
    var it = items[idx], cur = idx, advanced = false, done = false;
    var box = h('div.round', [head(), h('div.prog', h('i', { style: 'width:' + Math.round(idx / n * 100) + '%' }))]);
    if (it.p) {
      var pass = h('div.passage', it.p);
      if (it.kind === 'rc' && it.p === lastPassage) {
        pass.classList.add('hidden');
        var tog = h('a.ptoggle', { href: '#' }, 'Show passage');
        tog.addEventListener('click', function (ev) { ev.preventDefault(); pass.classList.toggle('hidden'); tog.textContent = pass.classList.contains('hidden') ? 'Show passage' : 'Hide passage'; });
        box.appendChild(tog);
      }
      box.appendChild(pass);
      lastPassage = it.p;
    }
    if (it.kind === 'ds') box.appendChild(h('div.ds-note', 'Data sufficiency: decide whether the statements give enough information to answer the question.'));
    box.appendChild(h('div.stem' + (it.big ? '.big' : ''), it.q));
    var choices = h('div.choices' + (it.big ? '.grid2' : '')), btns = [];
    it.c.forEach(function (c, i) {
      var b = h('button.choice', { type: 'button' }, [(o.letters && !it.big) ? h('span.lt', LETTERS[i]) : null, h('span', c)]);
      b.addEventListener('click', function () { answer(i); });
      btns.push(b); choices.appendChild(b);
    });
    box.appendChild(choices);
    var fb = h('div');
    box.appendChild(fb);
    root.appendChild(box);
    window.scrollTo(0, 0);
    function answer(i) {
      if (done) return; done = true;
      var ok = i === it.a;
      btns.forEach(function (b, j) { b.disabled = true; if (j === it.a) b.classList.add('correct'); if (j === i) b.classList.add(ok ? 'picked' : 'wrong'); });
      if (ok) { correct++; streak++; if (streak > best) best = streak; } else { streak = 0; misses.push(it); }
      if (o.onItem) o.onItem(it, ok);
      var f = h('div.feedback.' + (ok ? 'ok' : 'bad'));
      f.appendChild(h('b.v', ok ? ('Correct' + (streak >= 3 ? ' — ' + streak + ' in a row' : '')) : ('Not quite — the answer is ' + ((o.letters && !it.big) ? LETTERS[it.a] : it.c[it.a]))));
      if (it.e) f.appendChild(h('div.exp', it.e));
      if (it.l) f.appendChild(h('a.learn', { href: it.l }, 'Learn → ' + linkTitle(it.l)));
      var next = h('button.btn.primary.block', { type: 'button', style: 'margin-top:12px' }, idx + 1 < n ? 'Next' : 'See results');
      next.addEventListener('click', advance);
      f.appendChild(next);
      fb.appendChild(f);
      if (ok && o.auto) setTimeout(function () { if (idx === cur) advance(); }, 650);
      else setTimeout(function () { f.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 30);
    }
    function advance() { if (advanced || idx !== cur) return; advanced = true; idx++; if (idx < n) show(); else finish(); }
  }
  function finish() {
    var secs = Math.round((Date.now() - t0) / 1000), st = starsFor(correct, n);
    var rec = o.onDone ? o.onDone(correct, n, st) : null;
    P.clear(root);
    var res = h('div.result', [
      starsBig(st), h('div.score', correct + ' / ' + n),
      h('div.muted', st === 3 ? 'Excellent.' : st === 2 ? 'Solid — one more round for three stars.' : st === 1 ? 'Getting there.' : 'Keep at it — review the misses below.'),
      h('div.statrow', [h('div', [h('b', Math.round(correct / n * 100) + '%'), 'accuracy']), h('div', [h('b', String(best)), 'best streak']), h('div', [h('b', mmss(secs)), 'time'])])
    ]);
    if (rec && rec.best != null) res.appendChild(h('div.muted.small', 'Best so far: ' + rec.best + ' / ' + rec.total + ' · ' + rec.plays + ' play' + (rec.plays === 1 ? '' : 's')));
    var row = h('div.btnrow', { style: 'justify-content:center' });
    if (o.again) row.appendChild(h('button.btn.primary', { type: 'button', on: { click: o.again } }, o.againLabel || 'Play again'));
    var list = h('div.hidden');
    if (misses.length) {
      var mb = h('button.btn', { type: 'button' }, 'Review misses (' + misses.length + ')');
      mb.addEventListener('click', function () { list.classList.toggle('hidden'); });
      misses.forEach(function (m) {
        list.appendChild(h('div.miss', [h('div.q', m.q), h('div.a', 'Answer: ' + ((o.letters && !m.big) ? LETTERS[m.a] + ' — ' : '') + m.c[m.a]), m.e ? h('div.small.muted', m.e) : null, m.l ? h('a.learn.small', { href: m.l }, 'Learn → ' + linkTitle(m.l)) : null]));
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

/* ---------- must-knows: hub ---------- */
P.route(/^#\/must$/, function () {
  var all = stats(MK.items), weak = MK.items.filter(isWeak).length;
  var pg = h('div.pg.pg-must', [
    h('h1', 'Must-knows'),
    h('p.intro', MK.items.length + ' facts, rules and tables to have cold on test day — pulled from the reference pages. Tap a group to browse, or test yourself with cards (self-graded) or a quiz (multiple choice). Weak items come back first.'),
    h('div.flex', [h('b', all.known + ' known'), h('span.muted', '· ' + all.learning + ' learning · ' + weak + ' weak · ' + all.fresh + ' not seen')]),
    bar(all.known / Math.max(1, all.n)),
    h('div.btnrow', [
      h('a.btn.primary', { href: '#/must/quiz/weak' }, weak >= 4 ? 'Quiz my weak spots (' + weak + ')' : 'Quiz: weak spots & new'),
      h('a.btn', { href: '#/must/quiz/all' }, 'Random quiz'),
      h('a.btn', { href: '#/must/cards/all' }, 'Random cards')
    ])
  ]);
  var realm = '';
  MK.groups.forEach(function (g) {
    var label = g.realm === 'num' ? 'Math' : g.realm === 'lin' ? 'Verbal · Reading' : 'Verbal · Reasoning';
    if (label !== realm) { realm = label; pg.appendChild(h('div.fsec', label)); }
    var s = stats(groupItems(g.id));
    var t = h('div.tile', { style: 'margin-top:10px' }, [
      h('a', { href: '#/must/g/' + g.id, style: 'text-decoration:none;color:inherit;display:block' }, [h('b', g.id + ' · ' + g.title), h('div.sub', s.n + ' items · ' + s.known + ' known' + (s.weak ? ' · ' + s.weak + ' weak' : ''))]),
      bar(s.known / Math.max(1, s.n)),
      h('div.flex', [h('a.btn.sm', { href: '#/must/g/' + g.id }, 'Browse'), h('a.btn.sm', { href: '#/must/cards/' + g.id }, 'Cards'), h('a.btn.sm.primary', { href: '#/must/quiz/' + g.id }, 'Quiz')])
    ]);
    pg.appendChild(t);
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
    h('div.btnrow', [h('a.btn', { href: '#/must/cards/' + gid }, 'Cards'), h('a.btn.primary', { href: '#/must/quiz/' + gid }, 'Quiz'), h('button.btn.ghost', { type: 'button', on: { click: function () { var all = pg.querySelectorAll('.mk'); var anyClosed = false; for (var i = 0; i < all.length; i++) if (!all[i].classList.contains('open')) anyClosed = true; for (var j = 0; j < all.length; j++) all[j].classList.toggle('open', anyClosed); } } }, 'Show / hide all')]),
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
  var title = 'Cards · ' + scopeTitle(scope);
  var root = h('div.pg.pg-must');
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
    var grade = h('div.btnrow.hidden', [
      h('button.btn', { type: 'button', style: 'flex:1', on: { click: function () { markMust(it.id, false); missed.push(it); next(); } } }, '✗ Missed it'),
      h('button.btn.primary', { type: 'button', style: 'flex:1', on: { click: function () { markMust(it.id, true); got++; next(); } } }, '✓ Got it')
    ]);
    reveal.addEventListener('click', function () { back.classList.remove('hidden'); grade.classList.remove('hidden'); reveal.classList.add('hidden'); });
    card.appendChild(reveal); card.appendChild(back); card.appendChild(grade);
    root.appendChild(card);
    window.scrollTo(0, 0);
  }
  function next() { idx++; if (idx < items.length) show(); else finish(); }
  function finish() {
    P.clear(root);
    var st = starsFor(got, items.length);
    var res = h('div.result', [starsBig(st), h('div.score', got + ' / ' + items.length), h('div.muted', 'Items you missed come back first next time.')]);
    var row = h('div.btnrow', { style: 'justify-content:center' }, [h('button.btn.primary', { type: 'button', on: { click: P.render } }, 'Again'), h('a.btn', { href: '#/must/quiz/' + scope }, 'Quiz these'), h('a.btn', { href: '#/must' }, 'Must-knows')]);
    res.appendChild(row);
    if (missed.length) { var list = h('div', { style: 'margin-top:12px' }); missed.forEach(function (m) { list.appendChild(h('div.miss', [h('div.q', m.q), h('div.a', m.a), m.l ? h('a.learn.small', { href: m.l }, 'Learn →') : null])); }); res.appendChild(list); }
    root.appendChild(h('div.round', [h('div.rhead', [h('a', { href: '#/must' }, '← Must-knows'), h('span.spacer'), h('span', title)]), res]));
    window.scrollTo(0, 0);
  }
  show();
});

/* ---------- must-knows: quiz ---------- */
P.route(/^#\/must\/quiz\/([A-Za-z]+)$/, function (scope) {
  var pool = scopeItems(scope); if (!pool.length) return false;
  var items = weakFirst(pool).slice(0, 12).map(mustQuizItem);
  playRound({
    title: 'Quiz · ' + scopeTitle(scope), back: '#/must', backLabel: 'Must-knows', items: shuffle(items), cls: 'pg-must', letters: true, auto: false,
    onItem: function (it, ok) { markMust(it.mk, ok); },
    onDone: function (c, n) { return recordRound('mustq', scope, c, n); },
    again: P.render, againLabel: 'Another round'
  });
});

/* ---------- practice: hub ---------- */
function setRecLine(rec) { return rec ? h('div.sub', [P.stars(rec.stars), ' best ' + rec.best + '/' + rec.total + ' · ' + rec.plays + ' play' + (rec.plays === 1 ? '' : 's')]) : h('div.sub', 'Not played yet'); }
function totalStars() {
  var earned = 0, possible = 0;
  DR.forEach(function (d) { possible += 3; var r = roundRec('drills', d.id); if (r) earned += r.stars || 0; });
  SETS.forEach(function (s) { possible += 3; var r = roundRec('sets', s.id); if (r) earned += r.stars || 0; });
  return { earned: earned, possible: possible };
}
P.route(/^#\/practice$/, function () {
  var ts = totalStars(), missedIds = Object.keys(P.bucket('missed'));
  var pg = h('div.pg.pg-prac', [
    h('h1', 'Practice'),
    h('p.intro', 'Speed drills are generated fresh every round. Question sets are GMAT-style problems with full explanations and a link back to the page that teaches each one. Three stars is 90% or better.'),
    h('div.flex', [h('b', '★ ' + ts.earned + ' of ' + ts.possible + ' stars')]),
    bar(ts.earned / Math.max(1, ts.possible)),
    h('div.btnrow', [h('a.btn.primary', { href: '#/practice/mixed' }, 'Mixed set · 10 random'), h('a.btn', { href: '#/practice/missed' }, 'Retry missed (' + missedIds.length + ')')])
  ]);
  pg.appendChild(h('div.fsec', 'Speed drills · 10 questions a round'));
  var grid = h('div.tiles');
  DR.forEach(function (d) {
    var r = roundRec('drills', d.id);
    grid.appendChild(h('a.tile', { href: '#/practice/drill/' + d.id }, [h('b', d.title), h('div.sub', d.sub), setRecLine(r)]));
  });
  pg.appendChild(grid);
  ['ps', 'ds', 'cr', 'rc'].forEach(function (kind) {
    var sets = SETS.filter(function (s) { return s.kind === kind; });
    if (!sets.length) return;
    pg.appendChild(h('div.fsec', KIND[kind]));
    var g2 = h('div.tiles');
    sets.forEach(function (s) {
      var r = roundRec('sets', s.id);
      g2.appendChild(h('a.tile', { href: '#/practice/set/' + s.id }, [h('b', s.title), h('div.sub', s.questions.length + ' questions' + (s.blurb ? ' · ' + s.blurb : '')), setRecLine(r)]));
    });
    pg.appendChild(g2);
  });
  P.mount(pg, 'Practice');
});

/* ---------- practice: drill ---------- */
P.route(/^#\/practice\/drill\/([a-z0-9-]+)$/, function (id) {
  var d = drillById(id); if (!d) return false;
  playRound({
    title: d.title, back: '#/practice', backLabel: 'Practice', items: genRound(d, 10), letters: false, auto: true,
    onDone: function (c, n) { return recordRound('drills', d.id, c, n); }, again: P.render
  });
});

/* ---------- practice: question set ---------- */
function markMissed(it, ok) {
  if (!it.id) return;
  var m = P.bucket('missed');
  if (ok) delete m[it.id]; else m[it.id] = it.set || 1;
  save();
}
P.route(/^#\/practice\/set\/([a-z0-9-]+)$/, function (id) {
  var s = setById(id); if (!s) return false;
  var items = s.questions.map(function (q) { return toItem(s, q); });
  if (s.kind !== 'rc') items = shuffle(items);
  playRound({
    title: s.title, back: '#/practice', backLabel: 'Practice', items: items, letters: true, auto: false,
    onItem: markMissed, onDone: function (c, n) { return recordRound('sets', s.id, c, n); }, again: P.render
  });
});
P.route(/^#\/practice\/mixed$/, function () {
  var items = shuffle(allQuestions(function (s) { return s.kind !== 'rc'; })).slice(0, 10);
  playRound({ title: 'Mixed set', back: '#/practice', backLabel: 'Practice', items: items, letters: true, auto: false, onItem: markMissed, onDone: function (c, n) { return recordRound('sets', 'mixed', c, n); }, again: P.render, againLabel: 'New mixed set' });
});
P.route(/^#\/practice\/missed$/, function () {
  var ids = P.bucket('missed');
  var items = shuffle(allQuestions(function (s, q) { return !!ids[q.id]; }));
  if (!items.length) {
    P.mount(h('div.pg.pg-prac', [h('div.crumb', [h('a', { href: '#/practice' }, 'Practice')]), h('h1', 'Retry missed'), h('p', 'No missed questions saved. Questions you get wrong in any set land here until you answer them correctly.'), h('a.btn.primary', { href: '#/practice' }, 'Back to practice')]), 'Retry missed');
    return;
  }
  playRound({ title: 'Retry missed', back: '#/practice', backLabel: 'Practice', items: items, letters: true, auto: false, onItem: markMissed, again: P.render });
});

/* ---------- hooks used by the core app ---------- */
var questionCount = 0; SETS.forEach(function (s) { questionCount += s.questions.length; });
P.ext.counts = function () { return { must: MK.items.length, questions: questionCount, drills: DR.length }; };
P.ext.homeMust = function () { var s = stats(MK.items), w = MK.items.filter(isWeak).length; return s.known + ' of ' + s.n + ' known' + (w ? ' · ' + w + ' weak' : '') + ' · cards & quizzes'; };
P.ext.homePractice = function () { var t = totalStars(); return DR.length + ' drills · ' + questionCount + ' questions · ★ ' + t.earned + '/' + t.possible; };
P.ext.progressSummary = function () {
  var s = stats(MK.items), t = totalStars(), plays = 0, b;
  b = P.bucket('drills'); for (var k in b) if (b.hasOwnProperty(k)) plays += b[k].plays || 0;
  b = P.bucket('sets'); for (var k2 in b) if (b.hasOwnProperty(k2)) plays += b[k2].plays || 0;
  return 'Saved on this device only: ' + s.known + ' of ' + s.n + ' must-knows known, ' + t.earned + ' of ' + t.possible + ' practice stars, ' + plays + ' rounds played, ' + Object.keys(P.bucket('missed')).length + ' questions waiting in "retry missed".';
};
P.ext.related = function (realm, sec, pageId) {
  if (!sec) return null;
  var gid = realm === 'num' ? sec.id : REALM_GROUP[realm];
  var g = groupOf(gid), links = [];
  if (g) links.push(h('a.chip', { href: '#/must/g/' + g.id }, '✓ Must-knows: ' + g.title));
  if (g) links.push(h('a.chip', { href: '#/must/quiz/' + g.id }, 'Quiz ' + g.id));
  if (realm === 'num') DR.forEach(function (d) { if (d.sec === sec.id) links.push(h('a.chip', { href: '#/practice/drill/' + d.id }, '▶ Drill: ' + d.title)); });
  SETS.forEach(function (s) { if (s.realm === realm && (!s.sec || s.sec === sec.id || realm !== 'num')) links.push(h('a.chip', { href: '#/practice/set/' + s.id }, '▶ ' + s.title)); });
  if (!links.length) return null;
  return h('div.related', [h('div.fsec', 'Practice this'), h('div.chips', links)]);
};
P.searchers.push(function (q) {
  var out = [];
  for (var i = 0; i < MK.items.length && out.length < 12; i++) {
    var it = MK.items[i];
    if ((it.q + ' ' + it.a).toLowerCase().indexOf(q) >= 0) out.push({ href: '#/must/g/' + it.g + '/' + it.id, title: it.q, sub: 'Must-know · ' + it.a });
  }
  return out;
});
})();
