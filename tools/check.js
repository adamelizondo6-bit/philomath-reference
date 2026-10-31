#!/usr/bin/env node
/* Validates the data files against index.html. Run: node tools/check.js
   Checks: unique ids, choice counts, answer indexes, explanations, links that resolve to real pages
   or formula rows, must-know groups and distractor pools, drill generators. Exits non-zero on error. */
var fs = require('fs'), path = require('path');
var root = path.join(__dirname, '..');
var html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
var tpl = {}; (html.match(/<template id="tpl-[^"]+"/g) || []).forEach(function (m) { tpl[m.slice(14, -1).replace(/^tpl-/, '')] = true; });
var frow = {}; (html.match(/class="frow" id="f-[^"]+"/g) || []).forEach(function (m) { frow[m.slice(17, -1).replace(/^f-/, '')] = true; });
function load(file) { var w = { QBANK: null }; new Function('window', fs.readFileSync(path.join(root, 'assets', file), 'utf8'))(w); return w; }
var errors = [];
function err(s) { errors.push(s); }
function linkOk(l) {
  if (!l) return true;
  var m = l.match(/^#\/(num|lin|log)\/([a-z0-9-]+)$/); if (m) return !!tpl[m[1] + '-' + m[2]];
  m = l.match(/^#\/formulas\/([a-z0-9-]+)$/); if (m) return !!frow[m[1]];
  return /^#\/(formulas|must|practice)/.test(l);
}
/* must-knows */
var mk = load('mustknows.js').MUSTKNOWS, gids = {}, ids = {};
mk.groups.forEach(function (g) { gids[g.id] = true; });
mk.items.forEach(function (i) {
  if (ids[i.id]) err('must-know duplicate id ' + i.id); ids[i.id] = true;
  if (!gids[i.g]) err(i.id + ': unknown group ' + i.g);
  if (!i.q || !i.a) err(i.id + ': missing q or a');
  if (!linkOk(i.l)) err(i.id + ': bad link ' + i.l);
  if (i.alts) { if (i.alts.length < 3) err(i.id + ': fewer than 3 alts'); if (i.alts.indexOf(i.a) >= 0) err(i.id + ': alts contain the answer'); }
  else { var pool = mk.items.filter(function (x) { return x.id !== i.id && x.g === i.g && (!i.k || x.k === i.k) && x.a !== i.a; }); if (pool.length < 3) err(i.id + ': only ' + pool.length + ' same-kind distractors available'); }
});
/* questions */
var w = load('questions.js'); var w2 = load('questions-verbal.js');
var sets = w.QBANK.sets.concat(w2.QBANK.sets), qids = {}, sids = {}, total = 0;
sets.forEach(function (s) {
  if (sids[s.id]) err('duplicate set id ' + s.id); sids[s.id] = true;
  if (!/^(ps|ds|cr|rc)$/.test(s.kind)) err(s.id + ': bad kind');
  if (!s.title || !s.realm) err(s.id + ': missing title/realm');
  s.questions.forEach(function (q) {
    total++;
    if (qids[q.id]) err('duplicate question id ' + q.id); qids[q.id] = true;
    if (!q.q) err(q.id + ': missing stem');
    if (s.kind === 'ds') { if (q.c) err(q.id + ': DS questions must not carry choices'); if (!/\(1\)[\s\S]*\(2\)/.test(q.q)) err(q.id + ': DS stem lacks (1)/(2)'); if (!(q.a >= 0 && q.a <= 4)) err(q.id + ': bad answer index'); }
    else { if (!q.c || q.c.length !== 5) err(q.id + ': needs exactly 5 choices'); else { if (new Set(q.c).size !== 5) err(q.id + ': duplicate choices'); if (!(q.a >= 0 && q.a < 5)) err(q.id + ': bad answer index'); } }
    if ((s.kind === 'cr' || s.kind === 'rc') && !q.p) err(q.id + ': verbal question lacks a passage');
    if (!q.e || q.e.length < 20) err(q.id + ': explanation missing or too short');
    if (!linkOk(q.l)) err(q.id + ': bad link ' + q.l);
  });
});
/* drills */
var D = load('drills.js').DRILLS, dids = {};
D.forEach(function (d) {
  if (dids[d.id]) err('duplicate drill id ' + d.id); dids[d.id] = true;
  for (var i = 0; i < 300; i++) {
    var q = d.gen();
    var ok = q && typeof q.q === 'string' && q.choices && q.choices.length === 4 && new Set(q.choices).size === 4 && q.ans >= 0 && q.ans < 4 && typeof q.exp === 'string' && !/NaN|undefined|Infinity/.test(q.q + q.choices.join() + q.exp);
    if (!ok) { err('drill ' + d.id + ' produced a bad question: ' + JSON.stringify(q)); break; }
  }
});
console.log('must-knows: ' + mk.items.length + ' items in ' + mk.groups.length + ' groups');
console.log('questions: ' + total + ' in ' + sets.length + ' sets');
console.log('drills: ' + D.length);
if (errors.length) { console.log('\nERRORS (' + errors.length + '):'); errors.forEach(function (e) { console.log(' - ' + e); }); process.exit(1); }
console.log('All checks passed.');
