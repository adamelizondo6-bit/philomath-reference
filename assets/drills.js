/* Philomath Reference — practice drills and grid games.
   A drill is { id, title, sub, sec, opts, gen(settings) }. Its generator returns one question:
     num(): { kind:'num', q, ans (number), cands (distractors for multiple-choice mode), exp, unit, neg, tol, big }
     mc():  { kind:'mc',  q, choices (4 strings), ans (index), exp, big }
   Every answer is computed, so keys are correct by construction. `opts` describe the settings
   the player can change (round length, typed vs multiple choice, ranges, question kinds).
   A grid game is { id, title, sub, sec, opts, gen(settings) } returning { q, cols, mode, cells, exp }. */
(function () {
'use strict';

function rint(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function range(a, b) { var out = []; for (var i = a; i <= b; i++) out.push(i); return out; }
function fmt(n) {
  if (typeof n !== 'number') return String(n);
  var neg = n < 0, s = String(Math.round(Math.abs(n) * 1e6) / 1e6), parts = s.split('.'), ip = parts[0], out = '';
  while (ip.length > 3) { out = ',' + ip.slice(-3) + out; ip = ip.slice(0, -3); }
  return (neg ? '−' : '') + ip + out + (parts[1] ? '.' + parts[1] : '');
}
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }
function lcm(a, b) { return a / gcd(a, b) * b; }
function isPrime(n) { if (n < 2) return false; for (var i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; }
function smallestFactor(n) { for (var i = 2; i * i <= n; i++) if (n % i === 0) return i; return n; }
function numFactors(n) { var c = 0; for (var i = 1; i * i <= n; i++) if (n % i === 0) c += (i * i === n) ? 1 : 2; return c; }
function factorize(n) { var out = [], p = 2; while (n > 1 && p * p <= n) { var e = 0; while (n % p === 0) { n /= p; e++; } if (e) out.push([p, e]); p++; } if (n > 1) out.push([n, 1]); return out; }
var SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
function sup(n) { return String(n).split('').map(function (c) { return SUP[c] || c; }).join(''); }
function factStr(n) { return factorize(n).map(function (pe) { return pe[1] === 1 ? String(pe[0]) : pe[0] + sup(pe[1]); }).join(' · '); }
function frac(n, d) { var g = gcd(n, d); n /= g; d /= g; return d === 1 ? String(n) : n + '/' + d; }
function nCk(n, k) { if (k < 0 || k > n) return 0; var r = 1; for (var i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); }
function nPk(n, k) { var r = 1; for (var i = 0; i < k; i++) r *= (n - i); return r; }
function fact(n) { var r = 1; for (var i = 2; i <= n; i++) r *= i; return r; }
function modpow(b, e, m) { var r = 1 % m; b %= m; for (var i = 0; i < e; i++) r = (r * b) % m; return r; }
function sgn(n) { return n < 0 ? '− ' + fmt(-n) : '+ ' + fmt(n); }
var PRIMES = range(2, 100).filter(isPrime);
var MUL = ' × ', ARR = ' → ';

/* ---------- item builders ---------- */
function num(q, ans, cands, exp, o) {
  o = o || {};
  return { kind: 'num', q: q, ans: ans, cands: cands || [], exp: exp, unit: o.unit || '', neg: !!o.neg || ans < 0, tol: o.tol || 0, big: o.big !== false, fmt: o.fmt || null };
}
function mc(q, correct, cands, exp, opts) {
  opts = opts || {};
  var f = opts.fmt || function (x) { return typeof x === 'number' ? fmt(x) : String(x); };
  var key = f(correct), seen = {}; seen[key] = true;
  var ds = [];
  cands = shuffle(cands.slice());
  for (var i = 0; i < cands.length && ds.length < 3; i++) {
    var c = cands[i];
    if (c == null || (typeof c === 'number' && (!isFinite(c) || (opts.nonneg !== false && c < 0)))) continue;
    var s = f(c); if (seen[s]) continue; seen[s] = true; ds.push(c);
  }
  var k = 1;
  while (ds.length < 3 && typeof correct === 'number' && k < 60) {
    var alt = correct + (k % 2 ? k : -k); k++;
    if (alt < 0 && opts.nonneg !== false) continue;
    var s2 = f(alt); if (seen[s2]) continue; seen[s2] = true; ds.push(alt);
  }
  var all = shuffle([correct].concat(ds));
  return { kind: 'mc', q: q, choices: all.map(f), ans: all.indexOf(correct), exp: exp, big: !!opts.big };
}
/* Yes / No question: two big buttons. */
function yn(q, yes, exp) { return { kind: 'mc', q: q, choices: ['Yes', 'No'], ans: yes ? 0 : 1, exp: exp, big: true, yn: true }; }
/* Display a numeric answer with its unit (used for feedback and for multiple-choice conversion). */
function display(item, v) {
  var s = item.fmt ? item.fmt(v) : fmt(v);
  if (item.unit === '$') return '$' + s;
  return s + (item.unit || '');
}
function toChoice(item) { return mc(item.q, item.ans, item.cands, item.exp, { fmt: function (v) { return display(item, v); }, big: item.big, nonneg: !item.neg }); }

/* ---------- option descriptors ---------- */
var N_OPT = { key: 'round', label: 'Round', values: ['q10', 'q20', 'q30', 't60', 't120', 't180', 'lives3'], labels: ['10 questions', '20 questions', '30 questions', '60-second sprint', '2-minute sprint', '3-minute sprint', '3 lives'], def: 'q10' };
var MODE_OPT = { key: 'mode', label: 'Answers', values: ['type', 'choice'], labels: ['Type them in', 'Multiple choice'], def: 'type' };
function pickOpt(key, label, values, def, labels) { return { key: key, label: label, values: values, labels: labels || null, def: def }; }
function multiOpt(key, label, values, def, labels, any) { return { key: key, label: label, type: 'multi', values: values, labels: labels || null, def: def, any: !!any }; }
function kindsOpt(list) { return multiOpt('kinds', 'Question types', list.map(function (x) { return x[0]; }), list.map(function (x) { return x[0]; }), list.map(function (x) { return x[1]; })); }
function kind(s) { return pick(s.kinds); }

var DRILLS = [];
function drill(id, title, sub, sec, opts, gen) { DRILLS.push({ id: id, title: title, sub: sub, sec: sec, opts: opts, gen: gen }); }

/* ---------- times tables ---------- */
drill('mult', 'Times tables', 'Products up to 20 × 20, any table you choose', 'A',
  [N_OPT, MODE_OPT, pickOpt('max', 'Up to', [12, 15, 20], 20, ['12 × 12', '15 × 15', '20 × 20']), multiOpt('focus', 'Focus on these tables (optional)', range(2, 20), [], null, true)],
  function (s) {
    var a = s.focus.length ? pick(s.focus) : rint(2, s.max), b = rint(2, s.max);
    if (!s.focus.length && a < 6 && b < 6) b = rint(6, s.max);
    if (Math.random() < 0.5) { var t = a; a = b; b = t; }
    var p = a * b;
    return num(a + MUL + b, p, [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, p + a, p - b, p + 10, p - 10], a + MUL + b + ' = ' + fmt(p));
  });

/* ---------- squares & cubes ---------- */
drill('squares', 'Squares', 'n² and √, up to 20² or 25²', 'B',
  [N_OPT, MODE_OPT, pickOpt('from', 'Start at', [2, 11], 11), pickOpt('max', 'Up to', [12, 15, 20, 25], 20), pickOpt('dir', 'Direction', ['sq', 'rt', 'both'], 'both', ['n²', '√', 'both'])],
  function (s) {
    var lo = s.from, hi = Math.max(s.max, lo + 1), n = rint(lo, hi);
    var dir = s.dir === 'both' ? (Math.random() < 0.6 ? 'sq' : 'rt') : s.dir;
    if (dir === 'sq') return num(n + '²', n * n, [(n + 1) * (n + 1), (n - 1) * (n - 1), n * n + 2 * n, n * n - 2 * n, n * n + 10, n * n - 10, n * n + n], n + MUL + n + ' = ' + fmt(n * n));
    return num('√' + fmt(n * n), n, [n + 1, n - 1, n + 2, n - 2, n + 10, n - 10], n + '² = ' + fmt(n * n) + ', so √' + fmt(n * n) + ' = ' + n);
  });
drill('cubes', 'Cubes', 'n³ and ∛', 'B',
  [N_OPT, MODE_OPT, pickOpt('max', 'Up to', [10, 12, 15], 12), pickOpt('dir', 'Direction', ['cu', 'rt', 'both'], 'both', ['n³', '∛', 'both'])],
  function (s) {
    var n = rint(2, s.max), c = n * n * n;
    var dir = s.dir === 'both' ? (Math.random() < 0.65 ? 'cu' : 'rt') : s.dir;
    if (dir === 'cu') return num(n + '³', c, [(n + 1) * (n + 1) * (n + 1), (n - 1) * (n - 1) * (n - 1), c + n, c - n, 3 * n, n * n, c + 10 * n, c - 10], n + MUL + n + MUL + n + ' = ' + fmt(c));
    return num('∛' + fmt(c), n, [n + 1, n - 1, n + 2, n - 2], n + '³ = ' + fmt(c) + ', so ∛' + fmt(c) + ' = ' + n);
  });

/* ---------- powers ---------- */
var EXP_RANGE = { 2: [2, 10], 3: [2, 6], 4: [2, 5], 5: [2, 4], 6: [2, 3], 7: [2, 3], 8: [2, 3], 9: [2, 3] };
drill('powers', 'Powers', '2ⁿ to 9ⁿ, value or exponent', 'C',
  [N_OPT, MODE_OPT, multiOpt('bases', 'Bases', [2, 3, 4, 5, 6, 7, 8, 9], [2, 3, 4, 5, 6, 7, 8, 9]), pickOpt('dir', 'Ask for', ['val', 'exp', 'both'], 'both', ['the value', 'the exponent', 'both'])],
  function (s) {
    var b = pick(s.bases), r = EXP_RANGE[b], e = rint(r[0], r[1]), v = Math.pow(b, e);
    var dir = s.dir === 'both' ? (Math.random() < 0.7 ? 'val' : 'exp') : s.dir;
    if (dir === 'val') return num(b + sup(e), v, [Math.pow(b, e + 1), Math.pow(b, e - 1), b * e, v + b, v - b, Math.pow(b + 1, e), v * 2, v / 2], b + sup(e) + ' = ' + fmt(v));
    return num(fmt(v) + ' = ' + b + '^?  (find the exponent)', e, [e + 1, e - 1, e + 2, e - 2, b], b + sup(e) + ' = ' + fmt(v) + ', so the exponent is ' + e);
  });

/* ---------- roots ---------- */
var ROOT_TABLE = [[2, 1.41], [3, 1.73], [5, 2.24], [6, 2.45], [7, 2.65], [8, 2.83], [10, 3.16]];
drill('roots', 'Roots & estimates', 'Perfect squares, brackets, and √2 √3 √5 to two decimals', 'D',
  [N_OPT, MODE_OPT, kindsOpt([['perfect', '√ of a perfect square'], ['bracket', 'which integers √k lies between'], ['approx', '√2, √3, √5 … to two decimals']])],
  function (s) {
    var k = kind(s);
    if (k === 'perfect') { var n = rint(11, 30); return num('√' + fmt(n * n), n, [n + 1, n - 1, n + 2, n - 2, n + 5], n + '² = ' + fmt(n * n)); }
    if (k === 'bracket') {
      var m; do { m = rint(10, 400); } while (Math.round(Math.sqrt(m)) * Math.round(Math.sqrt(m)) === m);
      var a = Math.floor(Math.sqrt(m)), f = function (x) { return x + ' and ' + (x + 1); };
      return mc('√' + m + ' lies between which two integers?', a, [a - 1, a + 1, a + 2, a - 2], a + '² = ' + (a * a) + ' < ' + m + ' < ' + ((a + 1) * (a + 1)) + ' = ' + (a + 1) + '², so √' + m + ' is between ' + a + ' and ' + (a + 1) + '.', { fmt: f });
    }
    var row = pick(ROOT_TABLE);
    return num('√' + row[0] + ' ≈ ?  (two decimals)', row[1], ROOT_TABLE.map(function (x) { return x[1]; }), '√' + row[0] + ' ≈ ' + row[1] + ' — worth memorizing.', { tol: 0.006 });
  });

/* ---------- fractions / percents / decimals ---------- */
var FP = [[1, 2, 50, 0.5, '50%', '0.5'], [1, 3, 33.33, 0.3333, '33.3%', '0.333…'], [2, 3, 66.67, 0.6667, '66.7%', '0.667…'], [1, 4, 25, 0.25, '25%', '0.25'], [3, 4, 75, 0.75, '75%', '0.75'], [1, 5, 20, 0.2, '20%', '0.2'], [2, 5, 40, 0.4, '40%', '0.4'], [3, 5, 60, 0.6, '60%', '0.6'], [4, 5, 80, 0.8, '80%', '0.8'], [1, 6, 16.67, 0.1667, '16.7%', '0.167…'], [5, 6, 83.33, 0.8333, '83.3%', '0.833…'], [1, 7, 14.29, 0.1429, '14.3%', '0.143…'], [1, 8, 12.5, 0.125, '12.5%', '0.125'], [3, 8, 37.5, 0.375, '37.5%', '0.375'], [5, 8, 62.5, 0.625, '62.5%', '0.625'], [7, 8, 87.5, 0.875, '87.5%', '0.875'], [1, 9, 11.11, 0.1111, '11.1%', '0.111…'], [1, 10, 10, 0.1, '10%', '0.1'], [1, 12, 8.33, 0.0833, '8.3%', '0.083…'], [1, 16, 6.25, 0.0625, '6.25%', '0.0625'], [1, 20, 5, 0.05, '5%', '0.05'], [1, 25, 4, 0.04, '4%', '0.04'], [3, 20, 15, 0.15, '15%', '0.15'], [7, 20, 35, 0.35, '35%', '0.35'], [9, 20, 45, 0.45, '45%', '0.45'], [1, 40, 2.5, 0.025, '2.5%', '0.025']];
drill('fracpct', 'Fractions ↔ percents ↔ decimals', 'The equivalents table, every direction', 'E',
  [N_OPT, MODE_OPT, kindsOpt([['f2p', 'fraction → percent'], ['p2f', 'percent → fraction'], ['f2d', 'fraction → decimal'], ['d2f', 'decimal → fraction']])],
  function (s) {
    var k = kind(s), row = pick(FP), fr = row[0] + '/' + row[1], exp = fr + ' = ' + row[5] + ' = ' + row[4];
    if (k === 'f2p') return num(fr + ' as a percent', row[2], FP.map(function (x) { return x[2]; }), exp, { unit: '%', tol: 0.05 });
    if (k === 'f2d') return num(fr + ' as a decimal', row[3], FP.map(function (x) { return x[3]; }), exp, { tol: 0.0006 });
    var pool = FP.map(function (x) { return x[0] + '/' + x[1]; });
    if (k === 'p2f') return mc(row[4] + ' as a fraction', fr, pool, exp, { fmt: String, big: true });
    return mc(row[5] + ' as a fraction', fr, pool, exp, { fmt: String, big: true });
  });

/* ---------- primes 1–100 ---------- */
var ODD_COMPOSITES = [9, 21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91, 93, 99];
drill('primes', 'Primes 1–100', 'Spot the prime, count primes in a range, next prime up or down', 'B',
  [N_OPT, MODE_OPT, kindsOpt([['which', 'which one is prime'], ['isprime', 'is it prime? (yes / no)'], ['count', 'how many primes in a range'], ['next', 'next or previous prime']])],
  function (s) {
    var k = kind(s);
    if (k === 'isprime') {
      var cand = Math.random() < 0.5 ? pick(PRIMES.filter(function (x) { return x >= 11; })) : pick(ODD_COMPOSITES);
      var pr = isPrime(cand), f0 = smallestFactor(cand);
      return yn('Is ' + cand + ' prime?', pr, pr ? cand + ' is prime — no prime up to √' + cand + ' divides it.' : cand + ' = ' + f0 + MUL + (cand / f0) + ', so it is not prime.');
    }
    if (k === 'which') {
      var p = pick(PRIMES.filter(function (x) { return x >= 11; }));
      var comps = shuffle(ODD_COMPOSITES.slice()).slice(0, 3);
      var exp = p + ' is prime. ' + comps.map(function (c) { var f = smallestFactor(c); return c + ' = ' + f + MUL + (c / f); }).join('; ') + '.';
      return mc('Which one is prime?', p, comps, exp, { big: true });
    }
    if (k === 'count') {
      var a = 10 * rint(0, 8), w = pick([10, 20, 30]), b = Math.min(100, a + w);
      var list = PRIMES.filter(function (x) { return x >= a && x <= b; });
      return num('How many primes are there between ' + a + ' and ' + b + '?', list.length, [list.length + 1, list.length - 1, list.length + 2, list.length - 2], (list.length ? list.join(', ') : 'none') + ' → ' + list.length + ' prime' + (list.length === 1 ? '' : 's') + '.');
    }
    var x = rint(10, 96), up = Math.random() < 0.5, ans, i;
    if (up) { for (i = x + 1; ; i++) if (isPrime(i)) { ans = i; break; } }
    else { for (i = x - 1; ; i--) if (isPrime(i)) { ans = i; break; } }
    return num((up ? 'Smallest prime greater than ' : 'Largest prime less than ') + x, ans, [ans + 2, ans - 2, ans + 1, ans - 1, x], (up ? 'Counting up from ' : 'Counting down from ') + x + ', the first prime is ' + ans + '.');
  });

/* ---------- divisibility ---------- */
var RULES = { 3: 'digit sum is a multiple of 3', 4: 'last two digits form a multiple of 4', 6: 'even and digit sum is a multiple of 3', 8: 'last three digits form a multiple of 8', 9: 'digit sum is a multiple of 9', 11: 'alternating digit sum is a multiple of 11' };
function digitSum(n) { return String(n).split('').reduce(function (a, c) { return a + Number(c); }, 0); }
drill('divis', 'Divisibility', 'Rules for 3, 4, 6, 8, 9 and 11', 'A',
  [N_OPT, MODE_OPT, multiOpt('divs', 'Divisors', [3, 4, 6, 8, 9, 11], [3, 4, 6, 8, 9, 11]), kindsOpt([['which', 'which number is divisible by d'], ['yesno', 'is it divisible? (yes / no)'], ['rem', 'remainder by 3 or 9 from the digit sum'], ['digit', 'the missing last digit']])],
  function (s) {
    var k = kind(s), d, n;
    if (k === 'yesno') {
      d = pick(s.divs); n = rint(100, 99999); if (Math.random() < 0.5) n = n - (n % d);
      var div = n % d === 0;
      return yn('Is ' + fmt(n) + ' divisible by ' + d + '?', div, 'Rule: ' + RULES[d] + '. ' + fmt(n) + (div ? ' = ' + d + MUL + fmt(n / d) + '.' : ' leaves remainder ' + (n % d) + '.'));
    }
    if (k === 'which') {
      d = pick(s.divs);
      var yes; do { yes = rint(100, 9999); } while (yes % d !== 0);
      var nos = [], tries = 0;
      while (nos.length < 3 && tries++ < 100) { n = rint(100, 9999); if (n % d === 0 || nos.indexOf(n) >= 0) continue; nos.push(n); }
      var detail = (d === 3 || d === 9 || d === 6) ? ' Digit sum of ' + fmt(yes) + ' is ' + digitSum(yes) + '.' : '';
      return mc('Which is divisible by ' + d + '?', yes, nos, fmt(yes) + ' = ' + d + MUL + fmt(yes / d) + '. Rule: ' + RULES[d] + '.' + detail, { big: true });
    }
    if (k === 'rem') {
      d = pick(s.divs.filter(function (x) { return x === 3 || x === 9; }).concat([9]));
      n = rint(1000, 99999);
      var ds = digitSum(n), r = n % d;
      return num('Remainder when ' + fmt(n) + ' is divided by ' + d, r, range(0, d - 1), 'Digit sum ' + ds + '; ' + ds + ' mod ' + d + ' = ' + r + ', and a number and its digit sum leave the same remainder by 3 and by 9.');
    }
    d = pick(s.divs.filter(function (x) { return x !== 11; }).concat([3]));
    var base = rint(100, 9999) * 10, x;
    for (x = 0; x <= 9; x++) if ((base + x) % d === 0) break;
    var shown = fmt(base).slice(0, -1) + '_';
    return num('What is the smallest digit that makes ' + shown + ' divisible by ' + d + '?', x, range(0, 9), fmt(base + x) + ' = ' + d + MUL + fmt((base + x) / d) + '. Rule: ' + RULES[d] + '.');
  });

/* ---------- units digit ---------- */
drill('units', 'Units digit', 'Last digit of bⁿ from the cycle', 'C',
  [N_OPT, MODE_OPT, multiOpt('bases', 'Bases', [2, 3, 4, 7, 8, 9, 12, 13, 17, 18, 22, 23, 27], [2, 3, 4, 7, 8, 9, 12, 13, 17, 18, 22, 23, 27])],
  function (s) {
    var b = pick(s.bases), n = rint(5, 60), last = b % 10;
    var cyc = [], x = last; do { cyc.push(x); x = (x * last) % 10; } while (x !== cyc[0]);
    var L = cyc.length, pos = n % L, digit = cyc[(pos === 0 ? L : pos) - 1];
    var exp = 'Only the last digit of the base matters (' + last + '). Cycle: ' + cyc.join(ARR) + ' (period ' + L + '). ' + n + ' mod ' + L + ' = ' + pos + (pos === 0 ? ARR + 'last term' : ARR + 'term ' + pos) + ARR + digit + '.';
    return num('Units digit of ' + b + sup(n), digit, cyc.concat(range(0, 9)), exp);
  });

/* ---------- remainders ---------- */
drill('remainders', 'Remainders', 'N ÷ d, and remainders of big powers', 'B',
  [N_OPT, MODE_OPT, kindsOpt([['basic', 'N ÷ d'], ['power', 'bⁿ ÷ d']]), pickOpt('maxd', 'Largest divisor', [9, 12, 25], 12)],
  function (s) {
    if (kind(s) === 'basic') {
      var d = rint(3, s.maxd), N = rint(20, 400), r = N % d;
      return num('Remainder when ' + N + ' is divided by ' + d, r, range(0, d - 1), N + ' = ' + d + MUL + Math.floor(N / d) + ' + ' + r);
    }
    var b = rint(2, 9), e = rint(5, 40), m = rint(3, 9), cyc = [], cur = b % m, seen = {};
    while (!seen[cur]) { seen[cur] = true; cyc.push(cur); cur = (cur * b) % m; }
    var ans = modpow(b, e, m);
    return num('Remainder when ' + b + sup(e) + ' is divided by ' + m, ans, range(0, m - 1), 'Remainders of ' + b + '¹, ' + b + '², ' + b + '³, … mod ' + m + ' go ' + cyc.join(', ') + (cyc.length > 1 ? ', then repeat (period ' + cyc.length + '). ' + e + ' mod ' + cyc.length + ' = ' + (e % cyc.length) : ' forever') + ARR + ans + '.');
  });

/* ---------- factors & factorials ---------- */
function legendre(n, p) { var t = 0, q = p; while (q <= n) { t += Math.floor(n / q); q *= p; } return t; }
drill('factors', 'Factors & factorials', 'Factor counts, trailing zeros of n!, prime powers in n!', 'B',
  [N_OPT, MODE_OPT, kindsOpt([['count', 'number of positive factors'], ['zeros', 'trailing zeros of n!'], ['ppow', 'highest power of a prime in n!']])],
  function (s) {
    var k = kind(s);
    if (k === 'zeros') { var n = rint(10, 60), z = legendre(n, 5); return num('How many zeros are at the end of ' + n + '! ?', z, [z + 1, z - 1, z + 2, Math.floor(n / 5) + 1], '⌊' + n + '/5⌋ + ⌊' + n + '/25⌋' + (n >= 125 ? ' + …' : '') + ' = ' + Math.floor(n / 5) + ' + ' + Math.floor(n / 25) + ' = ' + z + ' (there are always more 2s than 5s).'); }
    if (k === 'ppow') { var p = pick([2, 3, 5, 7]), m = rint(10, 40), t = legendre(m, p); var terms = []; for (var q = p; q <= m; q *= p) terms.push('⌊' + m + '/' + q + '⌋ = ' + Math.floor(m / q)); return num('What is the largest k such that ' + p + 'ᵏ divides ' + m + '! ?', t, [t + 1, t - 1, t + 2, Math.floor(m / p)], terms.join(', ') + '; total ' + t + '.'); }
    var primes = [2, 3, 5, 7], N, tries = 0;
    do {
      var shape = rint(0, 2); N = 1;
      if (shape === 0) N = Math.pow(pick(primes), rint(2, 6));
      else if (shape === 1) { var ps = shuffle(primes.slice()); N = Math.pow(ps[0], rint(1, 3)) * Math.pow(ps[1], rint(1, 3)); }
      else { var ps2 = shuffle(primes.slice()); N = ps2[0] * ps2[1] * ps2[2] * (Math.random() < 0.4 ? ps2[0] : 1); }
    } while ((N > 1000 || N < 12) && tries++ < 50);
    var c = numFactors(N), fz = factorize(N);
    return num('How many positive factors does ' + N + ' have?', c, [c + 1, c - 1, c + 2, c - 2, fz.reduce(function (a, pe) { return a * pe[1]; }, 1), c * 2], N + ' = ' + factStr(N) + ARR + fz.map(function (pe) { return '(' + pe[1] + ' + 1)'; }).join('') + ' = ' + c + ' factors.');
  });

/* ---------- GCF & LCM ---------- */
drill('gcflcm', 'GCF & LCM', 'Greatest common factor, least common multiple', 'B',
  [N_OPT, MODE_OPT, pickOpt('ask', 'Ask for', ['gcf', 'lcm', 'both'], 'both', ['GCF', 'LCM', 'both'])],
  function (s) {
    var g = rint(2, 12), a, b;
    do { a = g * rint(2, 9); b = g * rint(2, 9); } while (a === b || gcd(a / g, b / g) !== 1 || a > 120 || b > 120);
    var L = lcm(a, b), askG = s.ask === 'both' ? Math.random() < 0.5 : s.ask === 'gcf';
    var exp = a + ' = ' + factStr(a) + ', ' + b + ' = ' + factStr(b) + '. GCF = ' + g + ' (shared primes, lowest powers); LCM = ' + fmt(L) + ' (all primes, highest powers). Check: ' + g + MUL + fmt(L) + ' = ' + a + MUL + b + '.';
    if (askG) return num('GCF of ' + a + ' and ' + b, g, [L, g * 2, Math.min(a, b), g + 1, g - 1, g * 3], exp);
    return num('LCM of ' + a + ' and ' + b, L, [a * b, g, L * 2, L / 2, Math.max(a, b), L + g], exp);
  });

/* ---------- percents ---------- */
drill('percent', 'Percents', 'x% of N, percent change, what percent, discounts, interest', 'E',
  [N_OPT, MODE_OPT, kindsOpt([['of', 'x% of N'], ['change', 'percent change'], ['moreless', 'x% more or less than N'], ['orig', 'price before a discount'], ['whatpct', 'a is what percent of b'], ['succ', 'two changes in a row'], ['interest', 'simple interest']])],
  function (s) {
    var k = kind(s), pct = function (v) { return (v > 0 ? '+' : '') + fmt(v) + '%'; };
    if (k === 'of') {
      var x = pick([5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90]);
      var step = x === 12.5 ? 8 : (x === 5 || x === 15) ? 20 : (x === 25 || x === 75) ? 4 : x === 50 ? 2 : 10;
      var N = step * rint(2, 40), v = x * N / 100;
      return num(x + '% of ' + fmt(N), v, [x * N / 10, N / x, v * 2, v / 2, v + N / 10, N - v], x + '% of ' + fmt(N) + ' = ' + fmt(v) + (x === 12.5 ? ' (12.5% = 1/8)' : x === 25 ? ' (25% = 1/4)' : x === 75 ? ' (75% = 3/4)' : x === 15 ? ' (10% + 5%)' : ''));
    }
    if (k === 'change') {
      var old = pick([20, 25, 40, 50, 60, 80, 100, 120, 150, 200, 250, 400, 500]), p = pick([10, 20, 25, 40, 50, 75, 100, 150, 200, -10, -20, -25, -50, -75]), nw = old * (100 + p) / 100;
      return num('Percent change from ' + fmt(old) + ' to ' + fmt(nw) + '  (use − for a decrease)', p, [Math.round((old - nw) / nw * 100), p / 2, p * 2, p + 10, p - 10, -p], '(new − old)/old = ' + fmt(nw - old) + '/' + fmt(old) + ' = ' + pct(p), { unit: '%', neg: true, fmt: function (v) { return (v > 0 ? '+' : '') + fmt(v); } });
    }
    if (k === 'moreless') {
      var base = pick([40, 50, 60, 80, 100, 120, 150, 200, 240, 300]), p2 = pick([5, 10, 15, 20, 25, 30, 40, 50]), more = Math.random() < 0.5, val = more ? base * (100 + p2) / 100 : base * (100 - p2) / 100;
      return num(p2 + '% ' + (more ? 'more' : 'less') + ' than ' + fmt(base), val, [base * p2 / 100, more ? base * (100 - p2) / 100 : base * (100 + p2) / 100, base + p2, base - p2], (more ? '(1 + ' : '(1 − ') + p2 + '/100)' + MUL + fmt(base) + ' = ' + fmt(val));
    }
    if (k === 'orig') {
      var orig = pick([40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 400]), disc = pick([10, 20, 25, 40, 50]), sale = orig * (100 - disc) / 100;
      return num('After a ' + disc + '% discount the price is $' + fmt(sale) + '. What was the original price?', orig, [sale * (100 + disc) / 100, sale + disc, orig + 10, orig - 10, sale * 2], '$' + fmt(sale) + ' is ' + (100 - disc) + '% of the original, so original = ' + fmt(sale) + ' ÷ ' + ((100 - disc) / 100) + ' = $' + fmt(orig), { unit: '$' });
    }
    if (k === 'whatpct') {
      var bb = pick([20, 25, 40, 50, 60, 80, 120, 150, 200, 250, 300, 400]), pp = pick([5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90, 120, 150, 200]), aa = bb * pp / 100;
      if (aa !== Math.floor(aa)) { bb = 200; aa = bb * pp / 100; }
      return num(fmt(aa) + ' is what percent of ' + fmt(bb) + '?', pp, [100 * bb / aa, pp * 2, pp / 2, pp + 10, pp - 5], fmt(aa) + '/' + fmt(bb) + MUL + '100 = ' + fmt(pp) + '%', { unit: '%', tol: 0.01 });
    }
    if (k === 'succ') {
      var p1 = pick([10, 20, 25, 50, -10, -20, -25, -50]), q1 = pick([10, 20, 25, 50, -10, -20, -25, -50]), net = Math.round(((1 + p1 / 100) * (1 + q1 / 100) - 1) * 10000) / 100;
      var word = function (v) { return (v > 0 ? 'up ' : 'down ') + Math.abs(v) + '%'; };
      return num('A price goes ' + word(p1) + ', then ' + word(q1) + '. Net percent change?  (use − for a decrease)', net, [p1 + q1, -net, net + 5, net - 5, p1 * q1 / 100], '(1 ' + sgn(p1 / 100).replace(' ', ' ') + ')' + MUL + '(1 ' + sgn(q1 / 100) + ') = ' + fmt((1 + p1 / 100) * (1 + q1 / 100)) + ARR + pct(net) + '. Factors multiply; they never add.', { unit: '%', neg: true, tol: 0.01, fmt: function (v) { return (v > 0 ? '+' : '') + fmt(v); } });
    }
    var P = pick([500, 1000, 1200, 1500, 2000, 2400, 3000, 5000]), r = pick([3, 4, 5, 6, 8, 10]), t = pick([0.5, 1, 1.5, 2, 3]), I = P * r / 100 * t;
    return num('Simple interest on $' + fmt(P) + ' at ' + r + '% per year for ' + (t === 0.5 ? '6 months' : t === 1.5 ? '18 months' : t + ' year' + (t > 1 ? 's' : '')) + '?', I, [P * r / 100, I * 2, I / 2, P * (1 + r / 100) * t - P, I + 10], 'interest = principal × rate × time = ' + fmt(P) + MUL + (r / 100) + MUL + t + ' = $' + fmt(I), { unit: '$', tol: 0.01 });
  });

/* ---------- parity & signs (multiple choice) ---------- */
var PAR = [['a + b', function (a, b) { return (a + b) % 2; }], ['ab', function (a, b) { return (a * b) % 2; }], ['a² + b', function (a, b) { return (a * a + b) % 2; }], ['2a + b', function (a, b) { return (2 * a + b) % 2; }], ['a + 2b', function (a, b) { return (a + 2 * b) % 2; }], ['ab + a', function (a, b) { return (a * b + a) % 2; }], ['ab + b', function (a, b) { return (a * b + b) % 2; }], ['a − b', function (a, b) { return Math.abs(a - b) % 2; }], ['3a + b', function (a, b) { return (3 * a + b) % 2; }], ['a² + b²', function (a, b) { return (a * a + b * b) % 2; }], ['(a + b)²', function (a, b) { return ((a + b) * (a + b)) % 2; }], ['ab + 1', function (a, b) { return (a * b + 1) % 2; }], ['a + b + 1', function (a, b) { return (a + b + 1) % 2; }], ['b² − a', function (a, b) { return Math.abs(b * b - a) % 2; }], ['a(b + 1)', function (a, b) { return (a * (b + 1)) % 2; }]];
var SGN = [['xy', -1], ['x²y', 1], ['x − y', -1], ['y − x', 1], ['x³', -1], ['x/y', -1], ['x²', 1], ['−xy', 1], ['y/x', -1], ['(x − y)²', 1], ['xy²', -1], ['y³', 1], ['−x', 1], ['x³y', -1], ['−y', -1], ['x⁴', 1], ['(xy)³', -1], ['x² + y', 1]];
drill('parity', 'Even/odd & signs', 'Which expression must be odd, even, positive or negative?', 'A',
  [N_OPT, kindsOpt([['parity', 'even / odd'], ['sign', 'positive / negative']])],
  function (s) {
    if (kind(s) === 'parity') {
      var a = pick([0, 1]), b = pick([0, 1]), wantOdd = Math.random() < 0.5, odd = [], even = [];
      PAR.forEach(function (p) { (p[1](a, b) === 1 ? odd : even).push(p[0]); });
      var one = wantOdd ? odd : even, rest = wantOdd ? even : odd;
      if (one.length < 1 || rest.length < 3) { wantOdd = !wantOdd; one = wantOdd ? odd : even; rest = wantOdd ? even : odd; }
      var correct = pick(one), others = shuffle(rest.slice()).slice(0, 3);
      return mc('a is ' + (a ? 'odd' : 'even') + ', b is ' + (b ? 'odd' : 'even') + '. Which must be ' + (wantOdd ? 'odd' : 'even') + '?', correct, others, 'Plug in a = ' + a + ', b = ' + b + ': ' + correct + ' is ' + (wantOdd ? 'odd' : 'even') + '; the others come out ' + (wantOdd ? 'even' : 'odd') + '.', { fmt: String });
    }
    var pos = SGN.filter(function (x) { return x[1] === 1; }), neg = SGN.filter(function (x) { return x[1] === -1; });
    var wantPos = Math.random() < 0.5, c2 = pick(wantPos ? pos : neg), o2 = shuffle((wantPos ? neg : pos).slice()).slice(0, 3).map(function (x) { return x[0]; });
    return mc('x < 0 < y. Which must be ' + (wantPos ? 'positive' : 'negative') + '?', c2[0], o2, 'Test x = −1, y = 2: ' + c2[0] + ' is ' + (wantPos ? 'positive' : 'negative') + '. Even powers hide the sign; odd powers keep it.', { fmt: String });
  });

/* ---------- compare fractions (multiple choice) ---------- */
drill('compare', 'Compare fractions', 'Pick the largest or smallest', 'E',
  [N_OPT, pickOpt('which', 'Ask for', ['largest', 'smallest', 'both'], 'both')],
  function (s) {
    var fr = [], vals = {}, tries = 0;
    while (fr.length < 4 && tries++ < 300) {
      var n = rint(1, 11), d = rint(2, 12); if (n >= d) continue;
      var key = frac(n, d), v = n / d; if (vals[key] !== undefined) continue;
      var clash = false; for (var k in vals) if (Math.abs(vals[k] - v) < 0.02) clash = true;
      if (clash) continue; vals[key] = v; fr.push(key);
    }
    var largest = s.which === 'both' ? Math.random() < 0.5 : s.which === 'largest';
    var best = fr.slice().sort(function (x, y) { return largest ? vals[y] - vals[x] : vals[x] - vals[y]; })[0];
    return mc('Which fraction is ' + (largest ? 'largest' : 'smallest') + '?', best, fr.filter(function (f) { return f !== best; }), fr.map(function (f) { return f + ' ≈ ' + vals[f].toFixed(3); }).join(', ') + '. Bow-tie any pair: a/b vs c/d → compare ad with bc.', { fmt: String, big: true });
  });

/* ---------- exponent rules ---------- */
drill('exprules', 'Exponent rules', 'Combine, divide and stack powers — answer with the exponent', 'C',
  [N_OPT, MODE_OPT],
  function () {
    var a = rint(2, 9), b = rint(2, 9), base = pick(['x', 'x', '2', '3', 'y']), mode = rint(0, 4), q, ans, cands, exp;
    if (mode === 0) { q = base + sup(a) + ' · ' + base + sup(b) + ' = ' + base + '^?'; ans = a + b; cands = [a * b, Math.abs(a - b), a + b + 1]; exp = 'Same base, multiply → add exponents: ' + a + ' + ' + b + ' = ' + (a + b); }
    else if (mode === 1) { if (a <= b) a = b + rint(1, 3); q = base + sup(a) + ' ÷ ' + base + sup(b) + ' = ' + base + '^?'; ans = a - b; cands = [a + b, a * b, a - b + 1]; exp = 'Same base, divide → subtract exponents: ' + a + ' − ' + b + ' = ' + (a - b); }
    else if (mode === 2) { q = '(' + base + sup(a) + ')' + sup(b) + ' = ' + base + '^?'; ans = a * b; cands = [a + b, Math.pow(a, b), a * b + 1]; exp = 'Power of a power → multiply exponents: ' + a + MUL + b + ' = ' + (a * b); }
    else if (mode === 3) { var e = 2 * rint(2, 8); q = '√(' + base + sup(e) + ') = ' + base + '^?'; ans = e / 2; cands = [e, e * 2, e - 2]; exp = 'A square root halves the exponent: ' + e + '/2 = ' + (e / 2); }
    else { q = base + sup(a) + ' · ' + base + sup(a) + ' · ' + base + sup(a) + '  (three copies multiplied) = ' + base + '^?'; ans = 3 * a; cands = [a + 3, Math.pow(a, 3), a]; exp = 'Multiplying three copies adds the exponents: 3' + MUL + a + ' = ' + (3 * a) + '. (Adding three copies would give 3·' + base + sup(a) + ' instead.)'; }
    return num(q, ans, cands, exp);
  });

/* ---------- counting ---------- */
var WORDS = [['LEVEL', 30, '5!/(2!·2!)'], ['BANANA', 60, '6!/(3!·2!)'], ['APPLE', 60, '5!/2!'], ['BOOK', 12, '4!/2!'], ['TOOTH', 30, '5!/(2!·2!)'], ['GOOD', 12, '4!/2!'], ['SEES', 6, '4!/(2!·2!)'], ['LITTLE', 180, '6!/(2!·2!)'], ['PEPPER', 60, '6!/(3!·2!)'], ['NOON', 6, '4!/(2!·2!)']];
drill('counting', 'Counting', 'nCk, nPk, factorials, letters, handshakes, committees, codes', 'I',
  [N_OPT, MODE_OPT, kindsOpt([['ncr', 'nCk (choose)'], ['npr', 'nPk (arrange)'], ['fact', 'n!'], ['word', 'letters with repeats'], ['hand', 'handshakes & pairs'], ['comm', 'committees from two groups'], ['codes', 'codes & PINs']])],
  function (s) {
    var k = kind(s), n, r;
    if (k === 'ncr') { n = rint(5, 10); r = rint(2, 4); var c = nCk(n, r); return num('How many ways to choose ' + r + ' people from ' + n + '?  (' + n + 'C' + r + ')', c, [nPk(n, r), nCk(n, r - 1), nCk(n, r + 1), n * r], n + 'C' + r + ' = ' + n + '!/(' + r + '!·' + (n - r) + '!) = ' + fmt(c)); }
    if (k === 'npr') { n = rint(4, 8); r = rint(2, 3); var p = nPk(n, r); return num('How many ways to arrange ' + r + ' of ' + n + ' distinct items in order?  (' + n + 'P' + r + ')', p, [nCk(n, r), Math.pow(n, r), n * r, fact(n)], n + 'P' + r + ' = ' + n + '!/' + (n - r) + '! = ' + fmt(p)); }
    if (k === 'fact') { n = rint(3, 8); return num(n + '! = ?', fact(n), [fact(n - 1), fact(n + 1), n * n, fact(n) * 2], n + '! = ' + fmt(fact(n))); }
    if (k === 'word') { var w = pick(WORDS); return num('Distinct arrangements of the letters in ' + w[0], w[1], [fact(w[0].length), w[1] * 2, w[1] / 2], w[2] + ' = ' + fmt(w[1]) + ' — divide by the factorial of each repeat count.'); }
    if (k === 'hand') { n = rint(5, 14); return num(Math.random() < 0.5 ? 'If each of ' + n + ' people shakes hands once with every other person, how many handshakes?' : 'How many games are played in a round robin of ' + n + ' teams (each pair plays once)?', nCk(n, 2), [n * (n - 1), n * n, n * (n + 1) / 2, n], n + 'C2 = ' + n + MUL + (n - 1) + '/2 = ' + nCk(n, 2)); }
    if (k === 'comm') { var m = rint(4, 7), w2 = rint(3, 6), mk = rint(1, 3), wk = rint(1, 2); return num('From ' + m + ' men and ' + w2 + ' women, how many committees of ' + mk + ' ' + (mk === 1 ? 'man' : 'men') + ' and ' + wk + ' ' + (wk === 1 ? 'woman' : 'women') + '?', nCk(m, mk) * nCk(w2, wk), [nCk(m, mk) + nCk(w2, wk), nCk(m + w2, mk + wk), nCk(m, mk) * nCk(w2, wk) * 2], m + 'C' + mk + MUL + w2 + 'C' + wk + ' = ' + nCk(m, mk) + MUL + nCk(w2, wk) + ' = ' + fmt(nCk(m, mk) * nCk(w2, wk))); }
    var L = rint(3, 4), pool = pick([5, 6, 7, 8, 10, 26]), rep = Math.random() < 0.5;
    var ans = rep ? Math.pow(pool, L) : nPk(pool, L);
    var what = pool === 26 ? 'letters' : pool === 10 ? 'digits' : 'symbols';
    return num('How many ' + L + '-character codes can be made from ' + pool + ' ' + what + (rep ? ', repeats allowed?' : ', no repeats?'), ans, [rep ? nPk(pool, L) : Math.pow(pool, L), pool * L, nCk(pool, L)], rep ? pool + sup(L) + ' = ' + fmt(ans) + ' (each slot has all ' + pool + ' options)' : range(0, L - 1).map(function (i) { return pool - i; }).join(MUL) + ' = ' + fmt(ans) + ' (each slot loses one option)');
  });

/* ---------- probability (multiple choice fractions) ---------- */
var DICE = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
drill('prob', 'Probability', 'Coins, dice and draws without replacement', 'I',
  [N_OPT, kindsOpt([['coins', 'coin flips'], ['dice', 'two dice'], ['draws', 'draws without replacement']])],
  function (s) {
    var k = kind(s), S = String, pad = ['1/3', '2/3', '1/8', '3/8', '5/8', '7/8', '1/16', '3/16', '5/36', '1/12'];
    if (k === 'coins') {
      var n = rint(2, 4), kk = rint(0, 2), tot = Math.pow(2, n), ans, q, exp;
      if (kk === 0) { q = 'P(all heads) in ' + n + ' fair coin flips'; ans = frac(1, tot); exp = '(1/2)' + sup(n) + ' = 1/' + tot; }
      else if (kk === 1) { q = 'P(at least one head) in ' + n + ' fair coin flips'; ans = frac(tot - 1, tot); exp = '1 − P(no heads) = 1 − 1/' + tot + ' = ' + frac(tot - 1, tot); }
      else { var h = rint(1, n - 1); q = 'P(exactly ' + h + ' head' + (h > 1 ? 's' : '') + ') in ' + n + ' flips'; ans = frac(nCk(n, h), tot); exp = n + 'C' + h + ' orderings × (1/2)' + sup(n) + ' = ' + nCk(n, h) + '/' + tot + ' = ' + ans; }
      return mc(q, ans, [frac(1, tot), frac(tot - 1, tot), frac(1, n), frac(n, tot), frac(1, 2), frac(nCk(n, 1), tot), frac(nCk(n, 2), tot)].concat(pad), exp, { fmt: S, big: true });
    }
    if (k === 'dice') {
      if (Math.random() < 0.5) { var sm = rint(2, 12), c = DICE[sm]; return mc('P(sum = ' + sm + ') with two fair dice', frac(c, 36), [frac(c + 1, 36), frac(c - 1, 36), frac(c, 12), frac(1, 6), frac(sm, 36)].concat(pad), c + ' of the 36 equally likely pairs add to ' + sm + ARR + frac(c, 36), { fmt: S, big: true }); }
      var qs = [['P(both dice show the same number)', '1/6', '6 of 36 pairs match → 6/36 = 1/6'], ['P(at least one 6) with two dice', '11/36', '1 − (5/6)² = 1 − 25/36 = 11/36'], ['P(both dice even)', '1/4', '(1/2)(1/2) = 1/4'], ['P(no 6) with two dice', '25/36', '(5/6)² = 25/36'], ['P(sum is odd) with two dice', '1/2', '18 of 36 sums are odd'], ['P(product is odd) with two dice', '1/4', 'both must be odd: (1/2)(1/2)']];
      var row = pick(qs); return mc(row[0], row[1], qs.map(function (x) { return x[1]; }).concat(pad), row[2], { fmt: S, big: true });
    }
    var r = rint(2, 6), b = rint(2, 6), N = r + b, both = Math.random() < 0.6;
    if (both) return mc('A bag has ' + r + ' red and ' + b + ' blue marbles. Two are drawn without replacement. P(both red)?', frac(r * (r - 1), N * (N - 1)), [frac(r * r, N * N), frac(r, N), frac(r - 1, N - 1), frac(2 * r, N), frac(r * b, N * (N - 1))].concat(pad), r + '/' + N + MUL + (r - 1) + '/' + (N - 1) + ' = ' + frac(r * (r - 1), N * (N - 1)) + ' — both parts shrink on the second draw.', { fmt: S });
    return mc('A bag has ' + r + ' red and ' + b + ' blue marbles. Two are drawn without replacement. P(one of each color)?', frac(2 * r * b, N * (N - 1)), [frac(r * b, N * (N - 1)), frac(r * b, N * N), frac(r + b, N * N), frac(r, N)].concat(pad), 'Red then blue or blue then red: 2' + MUL + r + '/' + N + MUL + b + '/' + (N - 1) + ' = ' + frac(2 * r * b, N * (N - 1)), { fmt: S });
  });

/* ---------- rates & work ---------- */
var AVG = [[30, 60, 40], [40, 60, 48], [20, 30, 24], [60, 90, 72], [10, 40, 16], [12, 24, 16], [15, 60, 24], [30, 70, 42], [20, 60, 30], [45, 90, 60], [36, 45, 40], [24, 40, 30]];
var WORK = [[3, 6, 2], [4, 12, 3], [6, 12, 4], [10, 15, 6], [12, 24, 8], [5, 20, 4], [6, 30, 5], [8, 24, 6], [9, 18, 6], [2, 2, 1], [4, 4, 2], [6, 6, 3], [12, 36, 9], [20, 30, 12], [15, 30, 10]];
drill('ratework', 'Rates & work', 'D = RT, average speed, combined work, catch-up', 'K',
  [N_OPT, MODE_OPT, kindsOpt([['dist', 'distance = rate × time'], ['time', 'time = distance ÷ rate'], ['avg', 'average speed over two legs'], ['together', 'two workers together'], ['catch', 'catch-up']])],
  function (s) {
    var k = kind(s);
    if (k === 'dist') { var r = pick([30, 40, 45, 50, 60, 70, 80]), t = pick([1.5, 2, 2.5, 3, 4, 0.5]); return num('At ' + r + ' mph for ' + t + ' hours, how far?', r * t, [r + t, r / t, r * t + r, r * (t + 1)], 'D = R × T = ' + r + MUL + t + ' = ' + fmt(r * t) + ' miles', { unit: ' mi' }); }
    if (k === 'time') { var r2 = pick([30, 40, 50, 60, 80]), t2 = pick([1.5, 2, 2.5, 3, 4, 0.5]); return num(fmt(r2 * t2) + ' miles at ' + r2 + ' mph takes how many hours?', t2, [t2 + 1, t2 - 0.5, r2 * t2 / 10, t2 * 2], 'T = D ÷ R = ' + fmt(r2 * t2) + '/' + r2 + ' = ' + fmt(t2) + ' h', { unit: ' h' }); }
    if (k === 'avg') { var row = pick(AVG); return num('Same distance out at ' + row[0] + ' mph and back at ' + row[1] + ' mph. Average speed for the round trip?', row[2], [(row[0] + row[1]) / 2, row[0] + row[1], row[1] - row[0], row[2] + 5], 'Pick a distance divisible by both, add distances, add times: 2·' + row[0] + '·' + row[1] + '/(' + row[0] + ' + ' + row[1] + ') = ' + row[2] + ' mph — never the plain average ' + ((row[0] + row[1]) / 2) + '.', { unit: ' mph' }); }
    if (k === 'together') { var w = pick(WORK); return num('A alone takes ' + w[0] + ' h, B alone ' + w[1] + ' h. Together?', w[2], [(w[0] + w[1]) / 2, w[0] + w[1], w[1] - w[0], w[2] + 1, w[0] * w[1]], '1/' + w[0] + ' + 1/' + w[1] + ' = 1/' + w[2] + ' per hour → ' + w[2] + ' h. Rates add; times never do.', { unit: ' h' }); }
    var r1 = pick([20, 30, 40, 50]), diff = pick([10, 20, 30]), r3 = r1 + diff, hh = pick([1, 2, 3]), gap = r1 * hh;
    return num('A car leaves at ' + r1 + ' mph. ' + hh + ' h later a second car follows at ' + r3 + ' mph. How long until it catches up?', gap / diff, [gap / r3, gap / r1, hh, gap / diff + 1], 'Gap when the chaser starts: ' + r1 + MUL + hh + ' = ' + gap + ' mi. Closing speed ' + r3 + ' − ' + r1 + ' = ' + diff + ' mph → ' + gap + '/' + diff + ' = ' + fmt(gap / diff) + ' h.', { unit: ' h', tol: 0.01 });
  });

/* ---------- statistics ---------- */
function sortedCopy(a) { return a.slice().sort(function (x, y) { return x - y; }); }
function medianOf(a) { var s = sortedCopy(a), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }
drill('stats', 'Mean, median & more', 'Means, medians, ranges, missing values, weighted averages', 'H',
  [N_OPT, MODE_OPT, kindsOpt([['mean', 'mean'], ['median', 'median'], ['range', 'range'], ['missing', 'missing value from the mean'], ['sum', 'sum from the mean'], ['weighted', 'weighted average'], ['consec', 'mean of consecutive integers']]), pickOpt('size', 'List length', ['short', 'long'], 'short', ['5–6 numbers', '7–9 numbers'])],
  function (s) {
    var k = kind(s), n, i;
    if (k === 'missing') {
      n = rint(4, 6); var mean = rint(10, 30), total = mean * n, known = [], sum = 0;
      for (i = 0; i < n - 1; i++) { var v = rint(mean - 8, mean + 8); known.push(v); sum += v; }
      var missing = total - sum; if (missing < 0) { missing += 20 * (n - 1); known = known.map(function (x) { return x - 20; }); sum -= 20 * (n - 1); }
      return num(n + ' numbers have mean ' + mean + '. ' + (n - 1) + ' of them are ' + known.join(', ') + '. What is the other one?', missing, [mean, missing + mean, Math.abs(missing - mean), missing + n], 'Total = ' + mean + MUL + n + ' = ' + total + '; known sum ' + sum + '; missing = ' + total + ' − ' + sum + ' = ' + missing);
    }
    if (k === 'sum') { n = rint(4, 12); var m2 = pick([12, 15, 18, 20, 24, 25, 30, 36, 40, 45]); return num('The average of ' + n + ' numbers is ' + m2 + '. What is their sum?', n * m2, [n + m2, m2, n * m2 + n, n * m2 - m2], 'sum = mean × count = ' + m2 + MUL + n + ' = ' + fmt(n * m2)); }
    if (k === 'weighted') { var n1 = pick([10, 20, 30, 40]), n2 = pick([10, 20, 30, 60]), m1 = pick([60, 70, 80, 90]), mm = pick([50, 60, 70, 80, 100]); if (m1 === mm) mm += 10; var wa = (n1 * m1 + n2 * mm) / (n1 + n2); return num(n1 + ' students average ' + m1 + ' and ' + n2 + ' others average ' + mm + '. Average of the whole group?', wa, [(m1 + mm) / 2, wa + 2, wa - 2, m1, mm], '(' + n1 + '·' + m1 + ' + ' + n2 + '·' + mm + ')/' + (n1 + n2) + ' = ' + fmt(n1 * m1 + n2 * mm) + '/' + (n1 + n2) + ' = ' + fmt(wa), { tol: 0.01 }); }
    if (k === 'consec') { var a = rint(1, 60), b = a + rint(5, 60); return num('What is the average of all the integers from ' + a + ' to ' + b + ', inclusive?', (a + b) / 2, [(a + b) / 2 + 1, (a + b) / 2 - 0.5, b - a + 1, (b - a) / 2], 'Evenly spaced: mean = (first + last)/2 = (' + a + ' + ' + b + ')/2 = ' + fmt((a + b) / 2)); }
    var cnt = s.size === 'long' ? rint(7, 9) : rint(5, 6), set = [], sm = 0, m0 = rint(8, 25);
    for (i = 0; i < cnt - 1; i++) { var x = rint(Math.max(1, m0 - 7), m0 + 7); set.push(x); sm += x; }
    var last = m0 * cnt - sm; if (last < 1) last = 1; if (last > 50) last = 50; set.push(last); sm += last;
    var sorted = sortedCopy(set), med = medianOf(set), rng = sorted[cnt - 1] - sorted[0], list = shuffle(set.slice()).join(', ');
    if (k === 'mean') { var mean2 = sm / cnt; return num('Mean of ' + list, mean2, [med, rng, mean2 + 1, mean2 - 1], 'Sum = ' + sm + ', count = ' + cnt + ARR + sm + '/' + cnt + ' = ' + fmt(mean2), { tol: 0.01 }); }
    if (k === 'median') return num('Median of ' + list, med, [sm / cnt, rng, med + 1, med - 1, sorted[Math.floor(cnt / 2) + 1]], 'Sorted: ' + sorted.join(', ') + ARR + (cnt % 2 ? 'middle value ' + fmt(med) : 'average of the two middle values ' + sorted[cnt / 2 - 1] + ' and ' + sorted[cnt / 2] + ' = ' + fmt(med)));
    return num('Range of ' + list, rng, [sm / cnt, med, rng + 1, rng - 1, sorted[cnt - 1]], 'max − min = ' + sorted[cnt - 1] + ' − ' + sorted[0] + ' = ' + rng);
  });

/* ---------- algebra ---------- */
drill('algebra', 'Quick algebra', 'Linear solves, Vieta, special products, absolute value, systems', 'F',
  [N_OPT, MODE_OPT, kindsOpt([['linear', 'ax + b = c'], ['vieta', 'sum or product of the roots'], ['sq', 'x² + y² from x + y and xy'], ['diff', 'difference of squares'], ['abs', 'absolute-value equations'], ['count', 'integers satisfying |x − a| ≤ k'], ['system', 'two equations']])],
  function (s) {
    var k = kind(s);
    if (k === 'linear') { var a = rint(2, 9), x = rint(-6, 12), b = rint(-15, 15), c = a * x + b; return num(a + 'x ' + sgn(b) + ' = ' + fmt(c) + '.  x = ?', x, [x + 1, x - 1, -x, c - b, x + 2], a + 'x = ' + fmt(c - b) + ARR + 'x = ' + fmt(x), { neg: true }); }
    if (k === 'vieta') {
      var p = rint(-7, 7), r = rint(-7, 7); if (p === r) r = p + 1;
      var sm = p + r, pr = p * r, askSum = Math.random() < 0.5;
      var eq = 'x² ' + (sm === 0 ? '' : sgn(-sm) + 'x ') + sgn(pr) + ' = 0';
      return num(eq + '.  ' + (askSum ? 'Sum' : 'Product') + ' of the roots?', askSum ? sm : pr, askSum ? [pr, -sm, sm + 1, sm - 1] : [sm, -pr, pr + 1, pr - 1], 'Roots ' + p + ' and ' + r + '. Vieta: sum = −b/a = ' + fmt(sm) + ', product = c/a = ' + fmt(pr) + '.', { neg: true });
    }
    if (k === 'sq') { var s2 = rint(3, 12), pr2 = rint(1, 20), ans = s2 * s2 - 2 * pr2; return num('x + y = ' + s2 + ' and xy = ' + pr2 + '.  x² + y² = ?', ans, [s2 * s2, s2 * s2 - pr2, s2 * s2 + 2 * pr2, ans + pr2], '(x + y)² = x² + 2xy + y², so x² + y² = ' + s2 + '² − 2(' + pr2 + ') = ' + fmt(ans), { neg: true }); }
    if (k === 'diff') { var m = rint(11, 60), d2 = rint(1, 9), big = m + d2, small = m - d2, v = big * big - small * small; return num(big + '² − ' + small + '² = ?', v, [(big - small) * (big - small), v + 10, v - 10, big * big - small], '(a + b)(a − b) = ' + (big + small) + MUL + (big - small) + ' = ' + fmt(v)); }
    if (k === 'abs') {
      var aa = pick([1, 1, 2]), bb = aa * rint(1, 8), cc = rint(1, 9) + (aa === 2 && Math.random() < 0.5 ? 1 : 0);
      var x1 = (bb + cc) / aa, x2 = (bb - cc) / aa;
      if (Math.random() < 0.6) return num('|' + (aa === 1 ? '' : aa) + 'x − ' + bb + '| = ' + cc + '.  What is the sum of all solutions?', x1 + x2, [x1, x2, x1 - x2, (x1 + x2) * 2], (aa === 1 ? '' : aa) + 'x − ' + bb + ' = ' + cc + ' or ' + (aa === 1 ? '' : aa) + 'x − ' + bb + ' = −' + cc + ARR + 'x = ' + fmt(x1) + ' or ' + fmt(x2) + '; sum ' + fmt(x1 + x2) + '.', { neg: true, tol: 0.001 });
      return num('|' + (aa === 1 ? '' : aa) + 'x − ' + bb + '| = ' + cc + '.  What is the larger solution?', x1, [x2, x1 + x2, x1 - 1, x1 + 1], 'Solutions x = (' + bb + ' ± ' + cc + ')/' + aa + ' = ' + fmt(x1) + ' or ' + fmt(x2) + '.', { neg: true, tol: 0.001 });
    }
    if (k === 'count') { var ctr = rint(-5, 10), kk = rint(1, 6), strict = Math.random() < 0.4, cnt = strict ? 2 * kk - 1 : 2 * kk + 1; return num('How many integers x satisfy |x − ' + (ctr < 0 ? '(' + fmt(ctr) + ')' : ctr) + '| ' + (strict ? '<' : '≤') + ' ' + kk + '?', cnt, [cnt + 1, cnt - 1, kk, 2 * kk], 'x is within ' + kk + ' of ' + fmt(ctr) + ': from ' + fmt(ctr - kk) + ' to ' + fmt(ctr + kk) + (strict ? ', endpoints excluded' : ', endpoints included') + ARR + cnt + ' integers.'); }
    var xx = rint(-5, 8), yy = rint(-5, 8), a1 = rint(1, 4), b1 = rint(1, 4), a2 = rint(1, 4), b2 = -rint(1, 4);
    if (a1 * b2 === a2 * b1) a2 += 1;
    var p1 = a1 * xx + b1 * yy, p2 = a2 * xx + b2 * yy, askX = Math.random() < 0.5;
    var line = function (ca, cb, rhs) { return (ca === 1 ? '' : ca) + 'x ' + (cb < 0 ? '− ' + (cb === -1 ? '' : -cb) : '+ ' + (cb === 1 ? '' : cb)) + 'y = ' + fmt(rhs); };
    return num(line(a1, b1, p1) + ' and ' + line(a2, b2, p2) + '.  ' + (askX ? 'x' : 'y') + ' = ?', askX ? xx : yy, [askX ? yy : xx, (askX ? xx : yy) + 1, (askX ? xx : yy) - 1, -(askX ? xx : yy)], 'Solve by combination: the solution is x = ' + fmt(xx) + ', y = ' + fmt(yy) + '.', { neg: true });
  });

/* ---------- sequences ---------- */
var SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
function sub(n) { return String(n).split('').map(function (c) { return SUB[c] || c; }).join(''); }
function seqList(a1, step, n, geo) { var out = [], v = a1; for (var i = 0; i < n; i++) { out.push(fmt(v)); v = geo ? v * step : v + step; } return out.join(', ') + ', …'; }
drill('sequences', 'Sequences', 'Arithmetic & geometric: nth term, sums, ratios, missing terms', 'M',
  [N_OPT, MODE_OPT, kindsOpt([['anth', 'arithmetic: nth term'], ['asum', 'arithmetic: sum of n terms'], ['gnth', 'geometric: nth term'], ['gsum', 'geometric: sum of n terms'], ['diff', 'common difference or ratio'], ['missing', 'missing term'], ['which', 'which term is it'], ['recur', 'recursive rule'], ['consec', 'consecutive integers from a sum']])],
  function (s) {
    var k = kind(s), a1, d, n, r, i;
    if (k === 'anth') { a1 = rint(-10, 20); d = pick([2, 3, 4, 5, 6, 7, 8, 9, -2, -3, -5]); n = rint(8, 40); var an = a1 + (n - 1) * d; return num('Arithmetic sequence: ' + seqList(a1, d, 3) + '  What is the ' + n + 'th term?', an, [a1 + n * d, an + d, an - d, a1 + (n - 1) * (d + 1)], 'a' + sub(n) + ' = a₁ + (n − 1)d = ' + fmt(a1) + ' + ' + (n - 1) + '(' + fmt(d) + ') = ' + fmt(an), { neg: true }); }
    if (k === 'asum') { a1 = rint(1, 15); d = rint(2, 9); n = rint(5, 20); var last = a1 + (n - 1) * d, S = n * (a1 + last) / 2; return num('Sum of the first ' + n + ' terms of ' + seqList(a1, d, 3), S, [S + n, S - n, n * last, n * a1], 'Last term a' + sub(n) + ' = ' + last + '. S = n(a₁ + a' + sub(n) + ')/2 = ' + n + '(' + a1 + ' + ' + last + ')/2 = ' + fmt(S)); }
    if (k === 'gnth') {
      if (Math.random() < 0.25) { a1 = pick([256, 512, 1024]); n = rint(4, 8); var ah = a1 / Math.pow(2, n - 1); return num('Geometric sequence: ' + seqList(a1, 0.5, 3, true) + '  What is the ' + n + 'th term?', ah, [ah * 2, ah / 2, a1 / n], 'a' + sub(n) + ' = a₁ · rⁿ⁻¹ = ' + a1 + ' · (1/2)' + sup(n - 1) + ' = ' + fmt(ah)); }
      a1 = rint(1, 5); r = pick([2, 2, 3, 3, 4, 5, -2]); var maxN = { 2: 10, 3: 8, 4: 7, 5: 6, '-2': 9 }[String(r)]; n = rint(4, maxN); var ag = a1 * Math.pow(r, n - 1);
      return num('Geometric sequence: ' + seqList(a1, r, 3, true) + '  What is the ' + n + 'th term?', ag, [a1 * Math.pow(r, n), ag / r, ag * 2, a1 + (n - 1) * r], 'a' + sub(n) + ' = a₁ · rⁿ⁻¹ = ' + a1 + ' · (' + fmt(r) + ')' + sup(n - 1) + ' = ' + fmt(ag), { neg: true });
    }
    if (k === 'gsum') { a1 = rint(1, 3); r = pick([2, 3]); n = rint(4, 8); var Sg = a1 * (Math.pow(r, n) - 1) / (r - 1); return num('Sum of the first ' + n + ' terms of ' + seqList(a1, r, 3, true), Sg, [Sg + a1, a1 * Math.pow(r, n), Sg - a1 * Math.pow(r, n - 1)], 'S = a₁(rⁿ − 1)/(r − 1) = ' + a1 + '(' + r + sup(n) + ' − 1)/' + (r - 1) + ' = ' + fmt(Sg)); }
    if (k === 'diff') {
      if (Math.random() < 0.5) { a1 = rint(-20, 30); d = pick([2, 3, 4, 5, 6, 7, 8, 9, 11, 12, -2, -3, -4, -6, -7]); return num('Common difference of ' + seqList(a1, d, 4) + '?', d, [-d, d + 1, d - 1, a1], 'd = (following term) − (current term) = ' + fmt(a1 + d) + ' − ' + fmt(a1) + ' = ' + fmt(d), { neg: true }); }
      a1 = rint(1, 6); r = pick([2, 3, 4, 5]); return num('Common ratio of ' + seqList(a1, r, 4, true) + '?', r, [r + 1, r - 1, a1, r * a1], 'r = (following term) ÷ (current term) = ' + fmt(a1 * r) + '/' + a1 + ' = ' + r);
    }
    if (k === 'missing') {
      if (Math.random() < 0.6) { a1 = rint(-10, 30); d = pick([3, 4, 5, 6, 7, 8, 9, 11, -3, -4, -5]); var pos = rint(1, 2), terms = [0, 1, 2, 3].map(function (j) { return j === pos ? '__' : fmt(a1 + j * d); }); return num('Arithmetic sequence: ' + terms.join(', ') + '.  What is the missing term?', a1 + pos * d, [a1 + pos * d + 1, a1 + pos * d - 1, a1 + (pos + 1) * d, a1 + (pos - 1) * d], 'The common difference is ' + fmt(d) + ', so the missing term is ' + fmt(a1 + (pos - 1) * d) + ' ' + sgn(d) + ' = ' + fmt(a1 + pos * d), { neg: true }); }
      a1 = rint(1, 5); r = pick([2, 3, 4, 5]); var pg = rint(1, 2), tg = [0, 1, 2, 3].map(function (j) { return j === pg ? '__' : fmt(a1 * Math.pow(r, j)); });
      return num('Geometric sequence: ' + tg.join(', ') + '.  What is the missing term?', a1 * Math.pow(r, pg), [a1 * Math.pow(r, pg) * 2, a1 * Math.pow(r, pg) + r, a1 * Math.pow(r, pg + 1)], 'The common ratio is ' + r + ', so the missing term is ' + fmt(a1 * Math.pow(r, pg - 1)) + MUL + r + ' = ' + fmt(a1 * Math.pow(r, pg)));
    }
    if (k === 'which') { a1 = rint(1, 15); d = rint(2, 9); n = rint(10, 60); var T = a1 + (n - 1) * d; return num('In the arithmetic sequence ' + seqList(a1, d, 3) + ' which term is ' + T + '?', n, [n + 1, n - 1, (T - a1) / d, n + d], 'n = (T − a₁)/d + 1 = (' + T + ' − ' + a1 + ')/' + d + ' + 1 = ' + n); }
    if (k === 'recur') {
      if (Math.random() < 0.5) { a1 = rint(1, 5); var kk = pick([2, 3]), cc = rint(-3, 3), want = rint(4, 5), v = a1, trail = [fmt(a1)]; for (i = 2; i <= want; i++) { v = kk * v + cc; trail.push(fmt(v)); } return num('a₁ = ' + a1 + ' and aₙ = ' + kk + 'aₙ₋₁ ' + sgn(cc) + ' for n ≥ 2.  What is a' + sub(want) + '?', v, [v + kk, v - kk, kk * v + cc, v + cc], 'March forward: ' + trail.join(ARR), { neg: true }); }
      var f1 = rint(1, 4), f2 = rint(1, 6), want2 = rint(5, 7), seq = [f1, f2]; for (i = 2; i < want2; i++) seq.push(seq[i - 1] + seq[i - 2]);
      return num('a₁ = ' + f1 + ', a₂ = ' + f2 + ', and aₙ = aₙ₋₁ + aₙ₋₂ for n ≥ 3.  What is a' + sub(want2) + '?', seq[want2 - 1], [seq[want2 - 1] + 1, seq[want2 - 2], seq[want2 - 1] + seq[want2 - 2]], 'Each term is the sum of the two before it: ' + seq.map(fmt).join(', '));
    }
    var cnt = pick([3, 4, 5, 6, 7]), even = Math.random() < 0.4, step = even ? 2 : 1, x0 = even ? 2 * rint(2, 25) : rint(3, 50), sumv = 0; for (i = 0; i < cnt; i++) sumv += x0 + i * step;
    var largest = x0 + (cnt - 1) * step, askLargest = Math.random() < 0.6;
    return num('The sum of ' + cnt + ' consecutive ' + (even ? 'even ' : '') + 'integers is ' + fmt(sumv) + '. What is the ' + (askLargest ? 'largest' : 'smallest') + ' of them?', askLargest ? largest : x0, [sumv / cnt, (askLargest ? largest : x0) + step, (askLargest ? largest : x0) - step, askLargest ? x0 : largest], 'The mean is ' + fmt(sumv / cnt) + ' (the middle of the run). The integers are ' + range(0, cnt - 1).map(function (j) { return fmt(x0 + j * step); }).join(', ') + '.');
  });

/* ---------- counting numbers in a range ---------- */
function countMult(k, a, b) { return Math.floor(b / k) - Math.floor((a - 1) / k); }
drill('rangecount', 'Counting in a range', 'How many integers, evens, multiples of k, … between two numbers', 'H',
  [N_OPT, MODE_OPT, kindsOpt([['ints', 'integers in a range'], ['evenodd', 'even or odd integers'], ['mult', 'multiples of k'], ['both', 'multiples of two numbers'], ['either', 'multiples of either of two'], ['sum', 'sum of the multiples']])],
  function (s) {
    var k = kind(s), a = rint(1, 300), b = a + rint(20, 400), inc = Math.random() < 0.7, lo = inc ? a : a + 1, hi = inc ? b : b - 1;
    var word = inc ? ' from ' + a + ' to ' + b + ', inclusive' : ' strictly between ' + a + ' and ' + b;
    if (k === 'ints') { var c0 = hi - lo + 1; return num('How many integers are there' + word + '?', c0, [c0 + 1, c0 - 1, c0 + 2, c0 - 2], (inc ? 'last − first + 1 = ' + b + ' − ' + a + ' + 1' : 'last − first − 1 = ' + b + ' − ' + a + ' − 1') + ' = ' + c0); }
    if (k === 'evenodd') { var ev = Math.random() < 0.5, first = lo + ((lo % 2 === (ev ? 0 : 1)) ? 0 : 1), lastv = hi - ((hi % 2 === (ev ? 0 : 1)) ? 0 : 1), c1 = (lastv - first) / 2 + 1; return num('How many ' + (ev ? 'even' : 'odd') + ' integers are there' + word + '?', c1, [c1 + 1, c1 - 1, hi - lo + 1, Math.floor((hi - lo + 1) / 2)], 'First ' + (ev ? 'even' : 'odd') + ' ' + first + ', last ' + lastv + ': (' + lastv + ' − ' + first + ')/2 + 1 = ' + c1); }
    if (k === 'mult') { var m = pick([3, 4, 5, 6, 7, 8, 9, 11, 12, 15]), c2 = countMult(m, lo, hi), f2 = Math.ceil(lo / m) * m, l2 = Math.floor(hi / m) * m; return num('How many multiples of ' + m + ' are there' + word + '?', c2, [c2 + 1, c2 - 1, Math.floor(hi / m), c2 + 2], c2 ? 'First multiple ' + f2 + ', last ' + l2 + ': (' + l2 + ' − ' + f2 + ')/' + m + ' + 1 = ' + c2 : 'No multiple of ' + m + ' lies in that range.'); }
    if (k === 'both' || k === 'either') {
      var pair = pick([[2, 3], [3, 4], [3, 5], [4, 6], [2, 5], [3, 7], [4, 10], [6, 9], [5, 8], [6, 8]]), j = pair[0], q = pair[1], L = lcm(j, q), cj = countMult(j, lo, hi), cq = countMult(q, lo, hi), cl = countMult(L, lo, hi);
      if (k === 'both') return num('How many integers' + word + ' are divisible by both ' + j + ' and ' + q + '?', cl, [cj + cq, cj, cq, cl + 1], 'Divisible by both means divisible by LCM(' + j + ', ' + q + ') = ' + L + ': ' + cl + ' multiples.');
      return num('How many integers' + word + ' are divisible by ' + j + ' or ' + q + ' (or both)?', cj + cq - cl, [cj + cq, cj + cq - 2 * cl, cl, cj], 'Multiples of ' + j + ': ' + cj + '; of ' + q + ': ' + cq + '; of both (LCM ' + L + '): ' + cl + '. ' + cj + ' + ' + cq + ' − ' + cl + ' = ' + (cj + cq - cl) + '.');
    }
    var mk = pick([3, 4, 5, 6, 7, 8, 9]), a2 = rint(1, 100), b2 = a2 + rint(20, 90), fm = Math.ceil(a2 / mk) * mk, lm = Math.floor(b2 / mk) * mk, cm = (lm - fm) / mk + 1, sm = cm * (fm + lm) / 2;
    return num('What is the sum of all the multiples of ' + mk + ' from ' + a2 + ' to ' + b2 + ', inclusive?', sm, [sm + mk, sm - mk, cm * lm, (fm + lm) / 2], cm + ' multiples from ' + fm + ' to ' + lm + '. Sum = count × (first + last)/2 = ' + cm + MUL + '(' + fm + ' + ' + lm + ')/2 = ' + fmt(sm));
  });

/* ---------- mental arithmetic ---------- */
drill('arith', 'Mental arithmetic', 'Add, subtract, multiply, divide, order of operations, decimals', 'A',
  [N_OPT, MODE_OPT, kindsOpt([['add', 'addition'], ['sub', 'subtraction'], ['mul', 'multiplication shortcuts'], ['div', 'division'], ['ops', 'order of operations'], ['dec', 'decimals']])],
  function (s) {
    var k = kind(s), a, b, c;
    if (k === 'add') { a = rint(15, 99); b = rint(15, 99); if (Math.random() < 0.4) a = rint(100, 999); return num(a + ' + ' + b, a + b, [a + b + 10, a + b - 10, a + b + 1, a + b - 1], 'Make tens: ' + a + ' + ' + b + ' = ' + fmt(a + b)); }
    if (k === 'sub') { a = rint(40, 999); b = rint(11, a - 5); return num(a + ' − ' + b, a - b, [a - b + 10, a - b - 10, a - b + 1, a - b - 1], 'Count up from ' + b + ' to ' + a + ': ' + fmt(a - b)); }
    if (k === 'mul') {
      var form = rint(0, 5);
      if (form === 0) { a = rint(12, 49); b = rint(3, 9); return num(a + MUL + b, a * b, [a * b + b, a * b - b, a * b + 10, (a + 1) * b], 'Split: ' + a + MUL + b + ' = ' + (Math.floor(a / 10) * 10) + MUL + b + ' + ' + (a % 10) + MUL + b + ' = ' + fmt(a * b)); }
      if (form === 1) { a = rint(12, 89); return num(a + MUL + '11', a * 11, [a * 11 + 11, a * 11 - 11, a * 10 + 1, a * 11 + 10], '× 11: add the digits of ' + a + ' into the middle (carry if needed): ' + fmt(a * 11)); }
      if (form === 2) { a = rint(12, 96); return num(a + MUL + '25', a * 25, [a * 25 + 25, a * 25 - 25, a * 100 / 4 + 10, a * 5 * 5 - 5], '× 25 = × 100 ÷ 4: ' + (a * 100) + '/4 = ' + fmt(a * 25)); }
      if (form === 3) { a = rint(3, 9); b = pick([98, 99, 97, 101, 102, 103]); return num(a + MUL + b, a * b, [a * b + a, a * b - a, a * 100, a * b + 1], a + '(' + (b < 100 ? '100 − ' + (100 - b) : '100 + ' + (b - 100)) + ') = ' + (a * 100) + (b < 100 ? ' − ' : ' + ') + (a * Math.abs(100 - b)) + ' = ' + fmt(a * b)); }
      if (form === 4) { a = rint(12, 96); return num(a + MUL + '5', a * 5, [a * 5 + 5, a * 5 - 5, a * 10, a * 5 + 10], '× 5 = × 10 ÷ 2: ' + (a * 10) + '/2 = ' + fmt(a * 5)); }
      a = 10 * rint(1, 9) + 5; return num(a + '²', a * a, [a * a + 10, a * a - 10, (a - 5) * (a + 5) + 25 + 10, a * a + 100], 'A number ending in 5: ' + Math.floor(a / 10) + MUL + (Math.floor(a / 10) + 1) + ' = ' + (Math.floor(a / 10) * (Math.floor(a / 10) + 1)) + ', then append 25 → ' + fmt(a * a));
    }
    if (k === 'div') { b = rint(3, 25); var q = rint(3, 30); return num(fmt(b * q) + ' ÷ ' + b, q, [q + 1, q - 1, q + 2, b], b + MUL + q + ' = ' + fmt(b * q) + ', so the quotient is ' + q); }
    if (k === 'ops') {
      var t = rint(0, 5), qq, ans, exp;
      if (t === 0) { a = rint(2, 12); b = rint(2, 9); c = rint(2, 9); qq = a + ' + ' + b + MUL + c; ans = a + b * c; exp = 'Multiply first: ' + a + ' + ' + (b * c) + ' = ' + ans; }
      else if (t === 1) { b = rint(2, 9); c = rint(2, 9); a = b * c + rint(1, 30); qq = a + ' − ' + b + MUL + c; ans = a - b * c; exp = 'Multiply first: ' + a + ' − ' + (b * c) + ' = ' + ans; }
      else if (t === 2) { a = rint(2, 12); b = rint(2, 12); c = rint(2, 9); qq = '(' + a + ' + ' + b + ')' + MUL + c; ans = (a + b) * c; exp = 'Brackets first: ' + (a + b) + MUL + c + ' = ' + ans; }
      else if (t === 3) { b = rint(2, 9); c = rint(2, 9); a = b * rint(2, 9); qq = a + ' ÷ ' + b + MUL + c; ans = a / b * c; exp = '÷ and × go left to right: ' + (a / b) + MUL + c + ' = ' + ans + ' (not ' + a + '/' + (b * c) + ')'; }
      else if (t === 4) { a = rint(2, 12); b = rint(2, 9); qq = a + ' + ' + b + '²'; ans = a + b * b; exp = 'Exponent first: ' + a + ' + ' + (b * b) + ' = ' + ans; }
      else { a = rint(2, 9); b = rint(2, 5); c = rint(2, 4); qq = a + MUL + b + '² − ' + c; ans = a * b * b - c; exp = 'Exponent, then multiply, then subtract: ' + a + MUL + (b * b) + ' − ' + c + ' = ' + ans; }
      return num(qq, ans, [ans + 1, ans - 1, ans * 2, ans + 10], exp);
    }
    var f = rint(0, 2);
    if (f === 0) { a = rint(2, 9); b = rint(2, 9); var pa = rint(1, 2), pb = rint(1, 2), v = a * b / Math.pow(10, pa + pb); return num((a / Math.pow(10, pa)) + MUL + (b / Math.pow(10, pb)), v, [a * b / Math.pow(10, pa + pb - 1), a * b / Math.pow(10, pa + pb + 1), v * 2], a + MUL + b + ' = ' + (a * b) + ', and the decimal places add (' + pa + ' + ' + pb + ' = ' + (pa + pb) + ') → ' + fmt(v), { tol: 1e-9 }); }
    if (f === 1) { a = rint(2, 9) / 10; b = pick([4, 5, 8, 12, 16, 20, 25, 40]); return num(a + MUL + b, Math.round(a * b * 100) / 100, [a * b * 10, a * b / 10, a * b + 1], fmt(a * 10) + MUL + b + ' = ' + fmt(a * 10 * b) + ', then shift one place: ' + fmt(a * b), { tol: 1e-9 }); }
    b = rint(2, 9) / 10; var qd = rint(3, 30), dv = Math.round(b * qd * 100) / 100; return num(fmt(dv) + ' ÷ ' + b, qd, [qd * 10, qd / 10, qd + 1], 'Move both decimal points: ' + fmt(dv * 10) + ' ÷ ' + fmt(b * 10) + ' = ' + qd, { tol: 1e-9 });
  });

/* ---------- overlapping sets ---------- */
drill('sets', 'Overlapping sets', 'Two groups: both, neither, only one, at least one', 'H',
  [N_OPT, MODE_OPT, kindsOpt([['both', 'find "both"'], ['neither', 'find "neither"'], ['only', 'find "A only"'], ['either', 'find "at least one"'], ['total', 'find the total']])],
  function (s) {
    var k = kind(s), ctx = pick([['students', 'play soccer', 'play tennis'], ['employees', 'speak Spanish', 'speak French'], ['cars', 'have a sunroof', 'have leather seats'], ['people', 'own a car', 'own a bike'], ['readers', 'read fiction', 'read history']]);
    var both = rint(3, 25), aOnly = rint(4, 30), bOnly = rint(4, 30), neither = rint(0, 20), total = both + aOnly + bOnly + neither, A = aOnly + both, B = bOnly + both, either = A + B - both;
    var base = 'Of ' + total + ' ' + ctx[0] + ', ' + A + ' ' + ctx[1] + ' and ' + B + ' ' + ctx[2] + '. ';
    if (k === 'both') return num(base + neither + ' do neither. How many do both?', both, [A + B - total, both + neither, aOnly, either - total], 'At least one = ' + total + ' − ' + neither + ' = ' + either + '. A + B − both = either → ' + A + ' + ' + B + ' − both = ' + either + ' → both = ' + both);
    if (k === 'neither') return num(base + both + ' do both. How many do neither?', neither, [total - A - B, neither + both, total - either + both, both], 'At least one = ' + A + ' + ' + B + ' − ' + both + ' = ' + either + '; neither = ' + total + ' − ' + either + ' = ' + neither);
    if (k === 'only') return num(base + both + ' do both. How many ' + ctx[1] + ' but do not ' + ctx[2] + '?', aOnly, [A, A + both, B - both, A - B], 'A only = A − both = ' + A + ' − ' + both + ' = ' + aOnly);
    if (k === 'either') return num(base + both + ' do both. How many do at least one of the two?', either, [A + B, A + B + both, total, either - neither], 'A + B − both = ' + A + ' + ' + B + ' − ' + both + ' = ' + either + ' (the overlap was counted twice)');
    return num('In a survey, ' + A + ' ' + ctx[0] + ' ' + ctx[1] + ', ' + B + ' ' + ctx[2] + ', ' + both + ' do both and ' + neither + ' do neither. How many ' + ctx[0] + ' were surveyed?', total, [A + B + neither, A + B - both, A + B + both + neither, total - neither], 'total = A + B − both + neither = ' + A + ' + ' + B + ' − ' + both + ' + ' + neither + ' = ' + total);
  });

/* ---------- functions ---------- */
function poly(a, b, c) { var t = []; if (a) t.push((a === 1 ? '' : a === -1 ? '−' : fmt(a)) + 'x²'); if (b) t.push((t.length ? (b < 0 ? ' − ' : ' + ') : (b < 0 ? '−' : '')) + (Math.abs(b) === 1 ? '' : Math.abs(b)) + 'x'); if (c || !t.length) t.push((t.length ? (c < 0 ? ' − ' : ' + ') : (c < 0 ? '−' : '')) + Math.abs(c)); return t.join(''); }
drill('functions', 'Functions & symbols', 'f(k), f(g(k)), custom symbols, solve f(x) = c', 'M',
  [N_OPT, MODE_OPT, kindsOpt([['eval', 'evaluate f(k)'], ['comp', 'compound f(g(k))'], ['symbol', 'custom symbol'], ['solve', 'solve f(x) = c']])],
  function (s) {
    var k = kind(s), a, b, c, x;
    if (k === 'eval') { a = pick([0, 0, 1, 2, 3, -1]); b = rint(-6, 8); c = rint(-9, 9); x = rint(-4, 6); var v = a * x * x + b * x + c; return num('f(x) = ' + poly(a, b, c) + '.  f(' + fmt(x) + ') = ?', v, [v + 1, v - 1, -v, a * x + b + c], 'Replace x with ' + fmt(x) + ': ' + (a ? fmt(a) + '(' + fmt(x) + ')² + ' : '') + fmt(b) + '(' + fmt(x) + ') ' + sgn(c) + ' = ' + fmt(v), { neg: true }); }
    if (k === 'comp') { a = rint(2, 4); b = rint(-5, 5); c = rint(-5, 5); x = rint(-3, 4); var fg = Math.random() < 0.5, inner = fg ? x * x + c : a * x + b, outer = fg ? a * inner + b : inner * inner + c; return num('f(x) = ' + poly(0, a, b) + ' and g(x) = ' + poly(1, 0, c) + '.  ' + (fg ? 'f(g(' : 'g(f(') + fmt(x) + ')) = ?', outer, [fg ? (a * x + b) * (a * x + b) + c : a * (x * x + c) + b, outer + 1, outer - 1], 'Inside first: ' + (fg ? 'g(' : 'f(') + fmt(x) + ') = ' + fmt(inner) + ', then ' + (fg ? 'f(' : 'g(') + fmt(inner) + ') = ' + fmt(outer), { neg: true }); }
    if (k === 'symbol') { var sym = pick(['★', '□', '◇', '⊕']), p = rint(2, 3), q = rint(1, 4), m = rint(1, 9), n = rint(1, 9), v2 = Math.pow(m, p) - q * n; return num('For all numbers a and b, a ' + sym + ' b = a' + sup(p) + ' − ' + q + 'b.  What is ' + m + ' ' + sym + ' ' + n + '?', v2, [Math.pow(n, p) - q * m, v2 + q, v2 - q, Math.pow(m, p) + q * n], 'The left value fills a, the right fills b: ' + m + sup(p) + ' − ' + q + '(' + n + ') = ' + Math.pow(m, p) + ' − ' + (q * n) + ' = ' + fmt(v2), { neg: true }); }
    a = rint(2, 7); b = rint(-9, 9); x = rint(-5, 9); c = a * x + b; return num('f(x) = ' + poly(0, a, b) + '.  If f(x) = ' + fmt(c) + ', what is x?', x, [x + 1, x - 1, -x, c], a + 'x ' + sgn(b) + ' = ' + fmt(c) + ARR + 'x = ' + fmt(x), { neg: true });
  });

/* ---------- coordinate geometry ---------- */
var TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25], [12, 16, 20], [15, 20, 25], [9, 40, 41], [20, 21, 29]];
function pt(x, y) { return '(' + fmt(x) + ', ' + fmt(y) + ')'; }
drill('coord', 'Coordinate geometry', 'Slope, distance, midpoint, intercepts', 'L',
  [N_OPT, MODE_OPT, kindsOpt([['slope', 'slope between two points'], ['dist', 'distance between two points'], ['mid', 'midpoint'], ['int', 'y-intercept from slope and point'], ['onl', 'y for a given x']])],
  function (s) {
    var k = kind(s), x1 = rint(-8, 8), y1 = rint(-8, 8);
    if (k === 'slope') { var dx = pick([1, 2, 2, 3, 4, 4, 5]), m = pick([-4, -3, -2, -1, 1, 2, 3, 4, 0.5, -0.5, 1.5, -1.5, 2.5]); if (m % 1 !== 0 && dx % 2) dx = 2; var x2 = x1 + dx, y2 = y1 + m * dx; return num('Slope of the line through ' + pt(x1, y1) + ' and ' + pt(x2, y2) + '?', m, [-m, 1 / m, m + 1, (x2 - x1) / (y2 - y1)], 'rise/run = (' + fmt(y2) + ' − ' + fmt(y1) + ')/(' + fmt(x2) + ' − ' + fmt(x1) + ') = ' + fmt(y2 - y1) + '/' + fmt(dx) + ' = ' + fmt(m), { neg: true, tol: 0.001 }); }
    if (k === 'dist') { var tr = pick(TRIPLES), sx = pick([1, -1]), sy = pick([1, -1]), x3 = x1 + sx * tr[0], y3 = y1 + sy * tr[1]; if (Math.random() < 0.5) { var t = x3; x3 = x1 + sx * tr[1]; y3 = y1 + sy * tr[0]; } return num('Distance between ' + pt(x1, y1) + ' and ' + pt(x3, y3) + '?', tr[2], [tr[0] + tr[1], tr[2] + 1, tr[2] - 1, Math.abs(x3 - x1) * Math.abs(y3 - y1)], 'Legs ' + Math.abs(x3 - x1) + ' and ' + Math.abs(y3 - y1) + ': √(' + (Math.abs(x3 - x1) * Math.abs(x3 - x1)) + ' + ' + (Math.abs(y3 - y1) * Math.abs(y3 - y1)) + ') = √' + (tr[2] * tr[2]) + ' = ' + tr[2] + ' — a ' + tr[0] + '-' + tr[1] + '-' + tr[2] + ' triangle.'); }
    if (k === 'mid') { var x4 = rint(-9, 9), y4 = rint(-9, 9), askX = Math.random() < 0.5, mv = askX ? (x1 + x4) / 2 : (y1 + y4) / 2; return num('The ' + (askX ? 'x' : 'y') + '-coordinate of the midpoint of ' + pt(x1, y1) + ' and ' + pt(x4, y4) + '?', mv, [askX ? (y1 + y4) / 2 : (x1 + x4) / 2, mv + 1, mv - 1, askX ? (x4 - x1) / 2 : (y4 - y1) / 2], 'Average the ' + (askX ? 'x' : 'y') + '-coordinates: (' + fmt(askX ? x1 : y1) + ' + ' + fmt(askX ? x4 : y4) + ')/2 = ' + fmt(mv), { neg: true, tol: 0.001 }); }
    var m2 = pick([-3, -2, -1, 1, 2, 3, 4, 0.5, -0.5]), bb = y1 - m2 * x1;
    if (k === 'int') return num('A line with slope ' + fmt(m2) + ' passes through ' + pt(x1, y1) + '. What is its y-intercept?', bb, [-bb, y1 + m2 * x1, bb + 1, bb - 1], 'y = mx + b → ' + fmt(y1) + ' = ' + fmt(m2) + '(' + fmt(x1) + ') + b → b = ' + fmt(bb), { neg: true, tol: 0.001 });
    var xq = rint(-6, 10), yq = m2 * xq + bb;
    return num('On the line y = ' + fmt(m2) + 'x ' + sgn(bb) + ', what is y when x = ' + fmt(xq) + '?', yq, [yq + 1, yq - 1, -yq, m2 * xq - bb], 'y = ' + fmt(m2) + '(' + fmt(xq) + ') ' + sgn(bb) + ' = ' + fmt(yq), { neg: true, tol: 0.001 });
  });

/* ---------- grid games ---------- */
var GRIDS = [];
function grid(id, title, sub, sec, opts, gen) { GRIDS.push({ id: id, title: title, sub: sub, sec: sec, opts: opts, gen: gen }); }
function selectGrid(lo, hi, test) { var cells = [], t = 0; for (var v = lo; v <= hi; v++) { var on = test(v); cells.push({ v: v, show: String(v), target: on }); if (on) t++; } return { cells: cells, targets: t }; }
grid('grid-primes', 'Prime grid', 'Tap every prime in a block of 50 numbers', 'B',
  [pickOpt('block', 'Numbers', ['1-50', '51-100', 'both'], 'both', ['1–50', '51–100', 'either'])],
  function (s) {
    var lo = s.block === '1-50' ? 1 : s.block === '51-100' ? 51 : pick([1, 51]), hi = lo + 49, g = selectGrid(lo, hi, isPrime);
    return { q: 'Tap every prime from ' + lo + ' to ' + hi + '.', cols: 10, mode: 'select', cells: g.cells, targets: g.targets, exp: 'Primes: ' + PRIMES.filter(function (p) { return p >= lo && p <= hi; }).join(', ') + '.' };
  });
grid('grid-mult', 'Multiples grid', 'Tap every multiple of k — use the divisibility rules', 'A',
  [pickOpt('k', 'Multiples of', ['any', 3, 4, 6, 7, 8, 9, 11, 12, 13], 'any'), pickOpt('block', 'Numbers', ['1-50', '51-100', 'high'], '1-50', ['1–50', '51–100', 'a random block above 100'])],
  function (s) {
    var k = s.k === 'any' ? pick([3, 4, 6, 7, 8, 9, 11, 12, 13]) : Number(s.k);
    var lo = s.block === '1-50' ? 1 : s.block === '51-100' ? 51 : 50 * rint(2, 19) + 1, hi = lo + 49, g = selectGrid(lo, hi, function (v) { return v % k === 0; });
    return { q: 'Tap every multiple of ' + k + ' from ' + lo + ' to ' + hi + '.', cols: 10, mode: 'select', cells: g.cells, targets: g.targets, exp: (RULES[k] ? 'Rule: ' + RULES[k] + '. ' : '') + 'Multiples: ' + g.cells.filter(function (c) { return c.target; }).map(function (c) { return c.v; }).join(', ') + '.' };
  });
grid('grid-times', 'Times-table grid', 'Fill in a block of the multiplication table', 'A',
  [pickOpt('size', 'Block size', [3, 4, 5], 4, ['3 × 3', '4 × 4', '5 × 5']), pickOpt('max', 'Tables up to', [12, 15, 20], 20)],
  function (s) {
    var size = s.size, r0 = rint(2, s.max - size + 1), c0 = rint(2, s.max - size + 1), cells = [{ show: '×', head: true }], i, j;
    for (j = 0; j < size; j++) cells.push({ show: String(c0 + j), head: true });
    for (i = 0; i < size; i++) { cells.push({ show: String(r0 + i), head: true }); for (j = 0; j < size; j++) cells.push({ ans: (r0 + i) * (c0 + j), show: '' }); }
    return { q: 'Fill in every product.', cols: size + 1, mode: 'fill', cells: cells, targets: size * size, exp: 'Row × column.' };
  });

window.DRILLS = DRILLS;
window.GRIDS = GRIDS;
window.DRILL_UTIL = { num: num, mc: mc, toChoice: toChoice, display: display, fmt: fmt };
})();
