/* Philomath Reference — core app.
   Router, side navigation, home / section / page / formula views, search, theme and the shared
   progress store. The must-knows and practice areas live in practice.js and register their own
   routes through window.PM. Everything is plain ES5 so it runs in older phone browsers. */
(function () {
'use strict';

var INDEX = JSON.parse(document.getElementById('search-index').textContent);
var SECTIONS = JSON.parse(document.getElementById('sections-index').textContent);
var REALMS = {
  num: { label: 'Math', cls: 'pg-num' },
  lin: { label: 'Verbal · Reading', cls: 'pg-lin' },
  log: { label: 'Verbal · Reasoning', cls: 'pg-log' }
};
var view = document.getElementById('view');
var qbox = document.getElementById('q');

/* ---------- tiny DOM helper: h('a.card', {href:'#/x'}, ['text', node]) ---------- */
function h(sel, attrs, kids) {
  if (attrs != null && (Array.isArray(attrs) || typeof attrs === 'string' || typeof attrs === 'number' || attrs.nodeType)) { kids = attrs; attrs = null; }
  var parts = sel.split('.');
  var e = document.createElement(parts[0] || 'div');
  if (parts.length > 1) e.className = parts.slice(1).join(' ');
  if (attrs) {
    for (var k in attrs) {
      if (!attrs.hasOwnProperty(k) || attrs[k] == null) continue;
      if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else if (k === 'on') { for (var ev in attrs.on) if (attrs.on.hasOwnProperty(ev)) e.addEventListener(ev, attrs.on[ev]); }
      else if (k === 'style') e.style.cssText = attrs[k];
      else if (k === 'data') { for (var d in attrs.data) if (attrs.data.hasOwnProperty(d)) e.setAttribute('data-' + d, attrs.data[d]); }
      else e.setAttribute(k, attrs[k]);
    }
  }
  return append(e, kids);
}
function append(e, kids) {
  if (kids == null) return e;
  if (!Array.isArray(kids)) kids = [kids];
  for (var i = 0; i < kids.length; i++) {
    var c = kids[i];
    if (c == null || c === false) continue;
    e.appendChild((typeof c === 'string' || typeof c === 'number') ? document.createTextNode(String(c)) : c);
  }
  return e;
}
function clear(e) { while (e.firstChild) e.removeChild(e.firstChild); return e; }

/* ---------- progress store (one JSON blob in localStorage) ---------- */
var STORE_KEY = 'pmref.v1';
var store = (function () {
  try { var s = JSON.parse(localStorage.getItem(STORE_KEY)); if (s && typeof s === 'object') return s; } catch (e) {}
  return {};
})();
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {} }
function bucket(name) { if (!store[name] || typeof store[name] !== 'object') store[name] = {}; return store[name]; }

/* ---------- theme ---------- */
var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function applyTheme() {
  var t = store.theme || 'auto';
  var dark = t === 'dark' || (t === 'auto' && darkQuery && darkQuery.matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0E1726' : '#F4F6FA');
}
function setTheme(t) { store.theme = t; save(); applyTheme(); refreshThemeSeg(); }
if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', applyTheme);
else if (darkQuery && darkQuery.addListener) darkQuery.addListener(applyTheme);
function themeSeg() {
  var seg = h('div.seg', { data: { theme: '1' } });
  ['auto', 'light', 'dark'].forEach(function (t) {
    seg.appendChild(h('button', { type: 'button', data: { t: t }, on: { click: function () { setTheme(t); } } }, t.charAt(0).toUpperCase() + t.slice(1)));
  });
  return seg;
}
function refreshThemeSeg() {
  var cur = store.theme || 'auto';
  var btns = document.querySelectorAll('.seg[data-theme] button');
  for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('on', btns[i].getAttribute('data-t') === cur);
}

/* ---------- utilities ---------- */
function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function rint(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function setTitle(t) { document.title = t ? t + ' · Philomath Reference' : 'Philomath Reference'; }
var toastTimer = null;
function toast(msg) {
  var t = document.getElementById('toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 1800);
}
function stars(n, max) { // "★★☆"
  var s = h('span.stars-sm'); max = max || 3;
  for (var i = 0; i < max; i++) s.appendChild(h(i < n ? 'span' : 'span.off', '★'));
  return s;
}

/* ---------- lookups ---------- */
var pageSection = {};
var sectionById = {};
SECTIONS.forEach(function (s) {
  sectionById[s.realm + '/' + s.id] = s;
  s.pages.forEach(function (p) { pageSection[s.realm + '/' + p.id] = s; });
});
function sectionOf(realm, pageId) { return pageSection[realm + '/' + pageId] || null; }
function titleOf(realm, id) {
  for (var i = 0; i < INDEX.length; i++) { var e = INDEX[i]; if (e.t === 'p' && e.realm === realm && e.id === id) return e.title; }
  return 'Reference';
}
var formulaCount = 0;
for (var fi = 0; fi < INDEX.length; fi++) if (INDEX[fi].t !== 'p') formulaCount++;
var pageCount = INDEX.length - formulaCount;

/* ---------- router ---------- */
var routes = [];
function route(re, fn) { routes.push({ re: re, fn: fn }); }
function render() {
  var hash = location.hash || '#/';
  if (hash === '#') hash = '#/';
  document.body.classList.remove('nav-open');
  closeSearch();
  for (var i = 0; i < routes.length; i++) {
    var m = hash.match(routes[i].re);
    if (!m) continue;
    var r = routes[i].fn.apply(null, m.slice(1));
    if (r === false) break;
    markActive(hash);
    if (r !== 'noscroll') window.scrollTo(0, 0);
    return;
  }
  location.replace('#/');
}
function mount(node, title) { clear(view); view.appendChild(node); setTitle(title); }

/* ---------- side navigation (built from the sections index) ---------- */
function buildNav() {
  var nav = clear(document.getElementById('side'));
  nav.appendChild(h('div.side-top', [h('b', 'Philomath'), h('button.hbtn', { type: 'button', 'aria-label': 'Close menu', on: { click: closeNav } }, '✕')]));
  nav.appendChild(h('a.top', { href: '#/' }, 'Home'));
  nav.appendChild(h('a.top', { href: '#/must' }, '✓ Must-knows'));
  nav.appendChild(h('a.top', { href: '#/practice' }, '▶ Practice'));
  nav.appendChild(h('a.top', { href: '#/formulas' }, '★ Formula sheet'));
  var realm = '';
  SECTIONS.forEach(function (s) {
    if (s.realm !== realm) { realm = s.realm; nav.appendChild(h('div.realm-h', REALMS[realm].label)); }
    var d = h('details', [h('summary', s.id + ' · ' + s.title), h('a.sec-all', { href: '#/sec/' + s.realm + '/' + s.id }, 'Section overview →')]);
    s.pages.forEach(function (p) { d.appendChild(h('a', { href: '#/' + s.realm + '/' + p.id }, p.title)); });
    nav.appendChild(d);
  });
  nav.appendChild(h('div.side-foot', [h('div', 'Theme'), themeSeg(), h('div', { style: 'margin-top:8px' }, [h('a', { href: '#/about', style: 'padding:0;display:inline' }, 'About, install & progress')])]));
  refreshThemeSeg();
}
function closeNav() { document.body.classList.remove('nav-open'); }
function markActive(hash) {
  var links = document.querySelectorAll('nav#side a');
  var openDetails = null;
  for (var i = 0; i < links.length; i++) {
    var a = links[i], on = a.getAttribute('href') === hash;
    a.classList.toggle('active', on);
    if (on) openDetails = a.parentNode.tagName === 'DETAILS' ? a.parentNode : null;
  }
  var ds = document.querySelectorAll('nav#side details');
  for (var j = 0; j < ds.length; j++) ds[j].open = ds[j] === openDetails;
  var tab = hash.indexOf('#/must') === 0 ? 'must' : hash.indexOf('#/practice') === 0 ? 'prac' : 'ref';
  var tabs = document.querySelectorAll('#tabbar a');
  for (var k = 0; k < tabs.length; k++) tabs[k].classList.toggle('active', tabs[k].getAttribute('data-tab') === tab);
}

/* ---------- search ---------- */
var searchers = [];
function openSearch() { document.body.classList.add('search-open'); qbox.focus(); }
function closeSearch() { document.body.classList.remove('search-open'); qbox.value = ''; }
function hit(href, title, sub) { return h('a.rhit', { href: href }, [h('b', title), h('small', sub)]); }
function runSearch() {
  var q = qbox.value.trim().toLowerCase();
  if (!q) { render(); return; }
  clear(view);
  var pg = h('div.pg', [h('h1', 'Search')]);
  var n = 0, i, e;
  for (i = 0; i < INDEX.length && n < 40; i++) {
    e = INDEX[i];
    if (e.t === 'p') {
      if ((e.title + ' ' + e.kw + ' ' + e.section).toLowerCase().indexOf(q) >= 0) { pg.appendChild(hit('#/' + e.realm + '/' + e.id, e.title, e.rlabel + ' · ' + e.section)); n++; }
    } else if ((e.name + ' ' + e.formula + ' ' + e.use).toLowerCase().indexOf(q) >= 0) { pg.appendChild(hit('#/formulas/' + e.slug, e.name, e.formula)); n++; }
  }
  for (i = 0; i < searchers.length && n < 60; i++) {
    var extra = searchers[i](q) || [];
    for (var j = 0; j < extra.length && n < 60; j++) { pg.appendChild(hit(extra[j].href, extra[j].title, extra[j].sub)); n++; }
  }
  if (!n) pg.appendChild(h('div.empty', 'Nothing matches “' + qbox.value.trim() + '”.'));
  view.appendChild(pg);
  setTitle('Search');
}
qbox.addEventListener('input', runSearch);
qbox.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { closeSearch(); render(); } });
document.getElementById('sbtn').addEventListener('click', openSearch);
document.getElementById('qclear').addEventListener('click', function () { closeSearch(); render(); });
document.getElementById('burger').addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
document.getElementById('backdrop').addEventListener('click', closeNav);
// A click on a link to the page already showing (e.g. from search results) must still re-render.
document.addEventListener('click', function (ev) {
  var a = ev.target.closest ? ev.target.closest('a[href^="#/"]') : null;
  if (a && a.getAttribute('href') === (location.hash || '#/')) { ev.preventDefault(); render(); }
});

/* ---------- views: home ---------- */
var ext = {}; // hooks filled in by practice.js: homeMust(), homePractice(), related(realm, section, pageId), counts()
function featCard(href, icon, title, sub) {
  return h('a.card.feat', { href: href }, [h('span.big', icon), h('b', title), h('span', sub)]);
}
route(/^#\/$/, function () {
  var c = ext.counts ? ext.counts() : {};
  var pg = h('div.pg', [
    h('h1', 'Philomath Reference'),
    h('div.muted', pageCount + ' pages · ' + formulaCount + ' formulas' + (c.must ? ' · ' + c.must + ' must-knows' : '') + (c.questions ? ' · ' + c.questions + ' practice questions' : '')),
    h('button.hsearch', { type: 'button', on: { click: openSearch } }, ['🔍', h('span', 'Search pages, formulas & must-knows')])
  ]);
  var feats = h('div.cards');
  feats.appendChild(featCard('#/must', '✓', 'Must-knows', ext.homeMust ? ext.homeMust() : 'The facts and rules to have cold on test day'));
  feats.appendChild(featCard('#/practice', '▶', 'Practice', ext.homePractice ? ext.homePractice() : 'Speed drills and GMAT-style question sets'));
  feats.appendChild(featCard('#/formulas', '★', 'Formula sheet', 'Every formula, what it is for, and where it lives'));
  pg.appendChild(feats);
  var realm = '', cards = null;
  SECTIONS.forEach(function (s) {
    if (s.realm !== realm) { realm = s.realm; pg.appendChild(h('div.fsec', REALMS[realm].label)); cards = h('div.cards'); pg.appendChild(cards); }
    cards.appendChild(h('a.card', { href: '#/sec/' + s.realm + '/' + s.id }, [h('b', s.id + ' · ' + s.title), h('span', s.pages.length + ' pages')]));
  });
  mount(pg, '');
});

/* ---------- views: section overview ---------- */
route(/^#\/sec\/(num|lin|log)\/([^/]+)$/, function (realm, id) {
  var s = sectionById[realm + '/' + decodeURIComponent(id)];
  if (!s) return false;
  var pg = h('div.pg.' + REALMS[realm].cls, [h('div.crumb', s.rlabel), h('h1', s.id + ' · ' + s.title)]);
  if (s.intro) pg.appendChild(h('p.intro', s.intro));
  pg.appendChild(h('div.fsec', s.pages.length + ' page' + (s.pages.length === 1 ? '' : 's') + ' in this section'));
  var cards = h('div.cards');
  s.pages.forEach(function (p, j) {
    cards.appendChild(h('a.card', { href: '#/' + realm + '/' + p.id }, [h('b', (j + 1) + '. ' + p.title), p.kw ? h('small', p.kw) : null]));
  });
  pg.appendChild(cards);
  if (ext.related) { var r = ext.related(realm, s, null); if (r) pg.appendChild(r); }
  mount(pg, s.id + ' · ' + s.title);
});

/* ---------- views: content page (templates exported from the app) ---------- */
route(/^#\/(num|lin|log)\/([a-z0-9-]+)$/, function (realm, id) {
  var t = document.getElementById('tpl-' + realm + '-' + id);
  if (!t) return false;
  clear(view);
  view.appendChild(t.content.cloneNode(true));
  var pg = view.firstElementChild;
  var s = sectionOf(realm, id);
  if (ext.related && pg) { var r = ext.related(realm, s, id); if (r) pg.appendChild(r); }
  setTitle(titleOf(realm, id));
});

/* ---------- views: formula sheet ---------- */
route(/^#\/formulas(?:\/([a-z0-9-]+))?$/, function (slug) {
  var t = document.getElementById('tpl-formulas');
  clear(view);
  view.appendChild(t.content.cloneNode(true));
  var pg = view.firstElementChild;
  var secs = pg.querySelectorAll('.fsec');
  var chips = h('div.chips');
  for (var i = 0; i < secs.length; i++) {
    (function (sec) {
      var letter = sec.textContent.trim().charAt(0);
      sec.id = 'fs-' + letter;
      chips.appendChild(h('button.chip', { type: 'button', title: sec.textContent, on: { click: function () { sec.scrollIntoView({ block: 'start', behavior: 'smooth' }); } } }, letter));
    })(secs[i]);
  }
  var intro = pg.querySelector('h1').nextElementSibling;
  if (intro && intro.nextSibling) pg.insertBefore(chips, intro.nextSibling); else pg.appendChild(chips);
  setTitle('Formula sheet');
  if (slug) {
    var row = document.getElementById('f-' + slug);
    if (row) {
      setTimeout(function () { row.scrollIntoView({ block: 'center' }); }, 0);
      row.classList.add('flash');
      setTimeout(function () { row.classList.remove('flash'); }, 1700);
      markActive('#/formulas');
      return 'noscroll';
    }
  }
});

/* ---------- views: about / progress ---------- */
route(/^#\/about$/, function () {
  var pg = h('div.pg', [h('h1', 'About')]);
  pg.appendChild(h('p', 'Philomath Reference is a single-page study site for the GMAT: ' + pageCount + ' reference pages exported from the Philomath app, a formula sheet, a must-know list you can test yourself on, and practice drills and question sets.'));
  pg.appendChild(h('div.fsec', 'Install on your phone'));
  pg.appendChild(h('p', 'iPhone: open this site in Safari, tap Share, then “Add to Home Screen”. Android: open in Chrome, tap the menu, then “Add to Home screen” or “Install app”. Once it has loaded one time it keeps working without a connection.'));
  pg.appendChild(h('div.fsec', 'Theme'));
  pg.appendChild(themeSeg());
  pg.appendChild(h('div.fsec', 'Progress'));
  var info = ext.progressSummary ? ext.progressSummary() : 'Progress is saved on this device only.';
  pg.appendChild(h('p', info));
  pg.appendChild(h('button.btn', { type: 'button', on: { click: function () {
    if (!window.confirm('Reset all practice and must-know progress on this device?')) return;
    var theme = store.theme; for (var k in store) if (store.hasOwnProperty(k)) delete store[k];
    if (theme) store.theme = theme; save(); toast('Progress reset'); render();
  } } }, 'Reset progress'));
  mount(pg, 'About');
  refreshThemeSeg();
});

/* ---------- boot ---------- */
window.PM = {
  h: h, append: append, clear: clear, route: route, render: render, view: view, mount: mount,
  store: store, save: save, bucket: bucket, SECTIONS: SECTIONS, INDEX: INDEX, REALMS: REALMS,
  sectionOf: sectionOf, sectionById: sectionById, titleOf: titleOf, setTitle: setTitle, toast: toast,
  shuffle: shuffle, rint: rint, pick: pick, stars: stars, searchers: searchers, ext: ext, counts: { pages: pageCount, formulas: formulaCount }
};
applyTheme();
buildNav();
window.addEventListener('hashchange', render);
document.addEventListener('DOMContentLoaded', render);
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
}
})();
