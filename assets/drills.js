/* Philomath Reference — practice drills.
   Each drill has a gen() that returns one question: { q, choices (4 strings), ans (index), exp, big }.
   `big` renders the stem large with a 2×2 answer grid (short numeric answers). Everything is
   computed, so every answer key is correct by construction. */
(function () {
'use strict';

function rint(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function fmt(n) { var neg = n < 0; var s = String(Math.abs(n)); var parts = s.split('.'); var ip = parts[0], out = ''; while (ip.length > 3) { out = ',' + ip.slice(-3) + out; ip = ip.slice(0, -3); } return (neg ? '−' : '') + ip + out + (parts[1] ? '.' + parts[1] : ''); }
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

/* Build a 4-choice question. `cands` are distractor candidates (any order); numeric correct values get
   automatic fallbacks if too few distinct candidates survive. */
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
  while (ds.length < 3 && typeof correct === 'number' && k < 50) {
    var alt = correct + (k % 2 ? k : -k); k++;
    if (alt < 0 && opts.nonneg !== false) continue;
    var s2 = f(alt); if (seen[s2]) continue; seen[s2] = true; ds.push(alt);
  }
  var all = shuffle([correct].concat(ds));
  return { q: q, choices: all.map(f), ans: all.indexOf(correct), exp: exp, big: !!opts.big };
}

var DRILLS = [];
function drill(id, title, sub, sec, gen) { DRILLS.push({ id: id, title: title, sub: sub, sec: sec, gen: gen }); }

/* ---------- times tables ---------- */
drill('mult', 'Times tables', 'Products up to 15 × 15', 'A', function () {
  var a = rint(3, 15), b = rint(3, 15);
  if (a < 6 && b < 6) b = rint(6, 15);
  var p = a * b;
  return mc(a + ' × ' + b, p, [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, p + a, p - b, p + 10, p - 10], a + ' × ' + b + ' = ' + fmt(p), { big: true });
});

/* ---------- squares & cubes ---------- */
drill('squares', 'Squares', '11² to 25², both directions', 'B', function () {
  var n = Math.random() < 0.2 ? rint(4, 10) : rint(11, 25);
  if (Math.random() < 0.6) {
    return mc(n + '²', n * n, [(n + 1) * (n + 1), (n - 1) * (n - 1), n * n + 2 * n, n * n - 2 * n, n * n + 10, n * n - 10, n * n + n], n + ' × ' + n + ' = ' + fmt(n * n), { big: true });
  }
  return mc('√' + fmt(n * n), n, [n + 1, n - 1, n + 2, n - 2, n + 10, n - 10], n + '² = ' + fmt(n * n) + ', so √' + fmt(n * n) + ' = ' + n, { big: true });
});
drill('cubes', 'Cubes', '2³ to 12³, both directions', 'B', function () {
  var n = rint(2, 12), c = n * n * n;
  if (Math.random() < 0.65) {
    return mc(n + '³', c, [(n + 1) * (n + 1) * (n + 1), (n - 1) * (n - 1) * (n - 1), c + n, c - n, 3 * n, n * n, c + 10 * n, c - 10], n + ' × ' + n + ' × ' + n + ' = ' + fmt(c), { big: true });
  }
  return mc('∛' + fmt(c), n, [n + 1, n - 1, n + 2, n - 2, c / 3], n + '³ = ' + fmt(c) + ', so ∛' + fmt(c) + ' = ' + n, { big: true });
});

/* ---------- powers ---------- */
drill('powers', 'Powers', '2ⁿ, 3ⁿ, 4ⁿ, 5ⁿ and friends', 'C', function () {
  var sets = [[2, 4, 10], [2, 4, 10], [2, 5, 10], [3, 3, 6], [4, 3, 5], [5, 3, 4], [6, 2, 3], [7, 2, 3], [8, 2, 3], [9, 2, 3]];
  var s = pick(sets), b = s[0], e = rint(s[1], s[2]), v = Math.pow(b, e);
  if (Math.random() < 0.7) {
    return mc(b + sup(e), v, [Math.pow(b, e + 1), Math.pow(b, e - 1), b * e, v + b, v - b, Math.pow(b + 1, e), v * 2, v / 2], b + sup(e) + ' = ' + fmt(v), { big: true });
  }
  return mc(fmt(v) + ' = ' + b + '^?', e, [e + 1, e - 1, e + 2, e - 2, b], b + sup(e) + ' = ' + fmt(v) + ', so the exponent is ' + e, { big: true });
});

/* ---------- roots ---------- */
var ROOT_TABLE = [[2, '1.41'], [3, '1.73'], [5, '2.24'], [6, '2.45'], [7, '2.65'], [8, '2.83'], [10, '3.16']];
drill('roots', 'Roots & estimates', 'Perfect squares, brackets and √2, √3, √5', 'D', function () {
  var r = Math.random();
  if (r < 0.45) {
    var n = rint(11, 30);
    return mc('√' + fmt(n * n), n, [n + 1, n - 1, n + 2, n - 2, n + 5], n + '² = ' + fmt(n * n), { big: true });
  }
  if (r < 0.75) {
    var k; do { k = rint(10, 400); } while (Math.round(Math.sqrt(k)) * Math.round(Math.sqrt(k)) === k);
    var a = Math.floor(Math.sqrt(k));
    var f = function (x) { return x + ' and ' + (x + 1); };
    return mc('√' + k + ' lies between', a, [a - 1, a + 1, a + 2, a - 2], a + '² = ' + (a * a) + ' < ' + k + ' < ' + ((a + 1) * (a + 1)) + ' = ' + (a + 1) + '², so √' + k + ' is between ' + a + ' and ' + (a + 1) + '.', { fmt: f });
  }
  var row = pick(ROOT_TABLE);
  return mc('√' + row[0] + ' ≈ ?', row[1], ROOT_TABLE.map(function (x) { return x[1]; }), '√' + row[0] + ' ≈ ' + row[1] + ' (worth memorizing).', { fmt: String, big: true });
});

/* ---------- fractions / percents / decimals ---------- */
var FP = [[1, 2, '50%', '0.5'], [1, 3, '33.3%', '0.333…'], [2, 3, '66.7%', '0.667…'], [1, 4, '25%', '0.25'], [3, 4, '75%', '0.75'], [1, 5, '20%', '0.2'], [2, 5, '40%', '0.4'], [3, 5, '60%', '0.6'], [4, 5, '80%', '0.8'], [1, 6, '16.7%', '0.167…'], [5, 6, '83.3%', '0.833…'], [1, 7, '14.3%', '0.143…'], [1, 8, '12.5%', '0.125'], [3, 8, '37.5%', '0.375'], [5, 8, '62.5%', '0.625'], [7, 8, '87.5%', '0.875'], [1, 9, '11.1%', '0.111…'], [1, 10, '10%', '0.1'], [1, 12, '8.3%', '0.083…'], [1, 16, '6.25%', '0.0625'], [1, 20, '5%', '0.05'], [1, 25, '4%', '0.04'], [3, 20, '15%', '0.15'], [7, 20, '35%', '0.35'], [9, 20, '45%', '0.45'], [1, 40, '2.5%', '0.025']];
drill('fracpct', 'Fractions ↔ percents ↔ decimals', 'The equivalents table, every direction', 'E', function () {
  var row = pick(FP), fr = row[0] + '/' + row[1], mode = rint(0, 3), q, correct, pool;
  if (mode === 0) { q = fr + ' as a percent'; correct = row[2]; pool = FP.map(function (x) { return x[2]; }); }
  else if (mode === 1) { q = row[2] + ' as a fraction'; correct = fr; pool = FP.map(function (x) { return x[0] + '/' + x[1]; }); }
  else if (mode === 2) { q = fr + ' as a decimal'; correct = row[3]; pool = FP.map(function (x) { return x[3]; }); }
  else { q = row[3] + ' as a fraction'; correct = fr; pool = FP.map(function (x) { return x[0] + '/' + x[1]; }); }
  return mc(q, correct, pool, fr + ' = ' + row[3] + ' = ' + row[2], { fmt: String, big: true });
});

/* ---------- primes ---------- */
var TRICKY = [51, 57, 87, 91, 119, 121, 133, 143, 161, 169, 187, 203, 209, 217, 221, 247, 253, 289, 299, 301, 319, 323, 341];
drill('primes', 'Prime or not', 'Spot the one prime among the impostors', 'B', function () {
  var p; do { p = rint(11, 330); } while (!isPrime(p));
  var comps = [], tries = 0;
  while (comps.length < 3 && tries++ < 100) {
    var c = Math.random() < 0.6 ? pick(TRICKY) : rint(11, 330);
    if (c === p || isPrime(c) || c % 2 === 0 || c % 5 === 0 || comps.indexOf(c) >= 0) continue;
    comps.push(c);
  }
  var exp = p + ' is prime. ' + comps.map(function (c) { var f = smallestFactor(c); return c + ' = ' + f + ' × ' + (c / f); }).join('; ') + '.';
  return mc('Which one is prime?', p, comps, exp, { big: true });
});

/* ---------- divisibility ---------- */
var RULES = { 3: 'digit sum is a multiple of 3', 4: 'last two digits form a multiple of 4', 6: 'even and digit sum is a multiple of 3', 8: 'last three digits form a multiple of 8', 9: 'digit sum is a multiple of 9', 11: 'alternating digit sum is a multiple of 11' };
drill('divis', 'Divisibility', 'Rules for 3, 4, 6, 8, 9 and 11', 'A', function () {
  var d = pick([3, 4, 6, 8, 9, 11]);
  var yes; do { yes = rint(100, 9999); } while (yes % d !== 0);
  var nos = [], tries = 0;
  while (nos.length < 3 && tries++ < 100) { var n = rint(100, 9999); if (n % d === 0 || nos.indexOf(n) >= 0) continue; nos.push(n); }
  var digits = String(yes).split('').map(Number), sum = digits.reduce(function (a, b) { return a + b; }, 0);
  var detail = d === 3 || d === 9 || d === 6 ? ' Digit sum of ' + fmt(yes) + ' is ' + sum + '.' : d === 11 ? '' : ' Check the tail of ' + fmt(yes) + '.';
  return mc('Which is divisible by ' + d + '?', yes, nos, fmt(yes) + ' = ' + d + ' × ' + fmt(yes / d) + '. Rule: ' + RULES[d] + '.' + detail, { big: true });
});

/* ---------- units digit ---------- */
drill('units', 'Units digit', 'Last digit of bⁿ from the cycle', 'C', function () {
  var b = pick([2, 3, 4, 7, 8, 9, 12, 13, 17, 18, 22, 23, 27]), n = rint(5, 60), last = b % 10;
  var cyc = [], x = last; do { cyc.push(x); x = (x * last) % 10; } while (x !== cyc[0]);
  var L = cyc.length, pos = n % L, digit = cyc[(pos === 0 ? L : pos) - 1];
  var cands = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(function (v) { return v !== digit; });
  var exp = 'Only the last digit of the base matters (' + last + '). Cycle: ' + cyc.join(' → ') + ' (period ' + L + '). ' + n + ' mod ' + L + ' = ' + pos + (pos === 0 ? ' → last term' : ' → term ' + pos) + ' → ' + digit + '.';
  return mc('Units digit of ' + b + sup(n), digit, shuffle(cyc.filter(function (v) { return v !== digit; })).concat(shuffle(cands)), exp, { big: true });
});

/* ---------- remainders ---------- */
drill('remainders', 'Remainders', 'N divided by d', 'B', function () {
  var d = rint(3, 12), N = rint(20, 300), r = N % d, q = Math.floor(N / d);
  var cands = []; for (var i = 0; i < d; i++) if (i !== r) cands.push(i);
  return mc('Remainder when ' + N + ' is divided by ' + d, r, cands, N + ' = ' + d + ' × ' + q + ' + ' + r, { big: true });
});

/* ---------- number of factors ---------- */
drill('factors', 'Factor counts', 'How many positive divisors?', 'B', function () {
  var primes = [2, 3, 5, 7], N, tries = 0;
  do {
    var shape = rint(0, 2); N = 1;
    if (shape === 0) { N = Math.pow(pick(primes), rint(2, 6)); }
    else if (shape === 1) { var ps = shuffle(primes.slice()); N = Math.pow(ps[0], rint(1, 3)) * Math.pow(ps[1], rint(1, 3)); }
    else { var ps2 = shuffle(primes.slice()); N = ps2[0] * ps2[1] * ps2[2] * (Math.random() < 0.4 ? ps2[0] : 1); }
  } while ((N > 1000 || N < 12) && tries++ < 50);
  var c = numFactors(N), fz = factorize(N);
  var exp = N + ' = ' + factStr(N) + ' → ' + fz.map(function (pe) { return '(' + pe[1] + ' + 1)'; }).join('') + ' = ' + c + ' factors.';
  var prodExp = fz.reduce(function (a, pe) { return a * pe[1]; }, 1), sumExp = fz.reduce(function (a, pe) { return a + pe[1]; }, 0) + 1;
  return mc('How many positive factors does ' + N + ' have?', c, [c + 1, c - 1, c + 2, c - 2, prodExp, sumExp, c * 2], exp, { big: true });
});

/* ---------- GCF & LCM ---------- */
drill('gcflcm', 'GCF & LCM', 'Greatest common factor, least common multiple', 'B', function () {
  var g = rint(2, 12), a, b;
  do { a = g * rint(2, 9); b = g * rint(2, 9); } while (a === b || gcd(a / g, b / g) !== 1 || a > 120 || b > 120);
  var L = lcm(a, b), askG = Math.random() < 0.5;
  var exp = a + ' = ' + factStr(a) + ', ' + b + ' = ' + factStr(b) + '. GCF = ' + g + ' (shared primes, lowest powers); LCM = ' + fmt(L) + ' (all primes, highest powers). Check: ' + g + ' × ' + fmt(L) + ' = ' + a + ' × ' + b + '.';
  if (askG) return mc('GCF of ' + a + ' and ' + b, g, [L, g * 2, Math.min(a, b), g + 1, g - 1, g * 3], exp, { big: true });
  return mc('LCM of ' + a + ' and ' + b, L, [a * b, g, L * 2, L / 2, Math.max(a, b), L + g], exp, { big: true });
});

/* ---------- mental percents ---------- */
drill('percent', 'Mental percents', 'x% of N, percent change, before the discount', 'E', function () {
  var mode = rint(0, 3);
  if (mode === 0) {
    var x = pick([5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90]);
    var step = x === 12.5 ? 8 : (x === 5 || x === 15) ? 20 : (x === 25 || x === 75) ? 4 : x === 50 ? 2 : 10;
    var N = step * rint(2, 40), v = x * N / 100;
    return mc(x + '% of ' + fmt(N), v, [x * N / 10, N / x, v * 2, v / 2, v + N / 10, N - v], x + '% of ' + fmt(N) + ' = ' + fmt(v) + (x === 12.5 ? ' (12.5% = 1/8)' : x === 25 ? ' (25% = 1/4)' : x === 75 ? ' (75% = 3/4)' : x === 15 ? ' (10% + 5%)' : ''), { big: true });
  }
  if (mode === 1) {
    var old = pick([20, 25, 40, 50, 60, 80, 100, 120, 150, 200, 250, 400, 500]), pct = pick([10, 20, 25, 40, 50, 75, 100, 150, 200, -10, -20, -25, -50, -75]);
    var nw = old * (100 + pct) / 100;
    var f = function (p) { return (p > 0 ? '+' : '') + fmt(p) + '%'; };
    return mc('Percent change from ' + fmt(old) + ' to ' + fmt(nw), pct, [Math.round((old - nw) / nw * 100), pct / 2, pct * 2, pct + 10, pct - 10, -pct], '(new − old)/old = ' + fmt(nw - old) + '/' + fmt(old) + ' = ' + f(pct), { fmt: f, nonneg: false, big: true });
  }
  if (mode === 2) {
    var base = pick([40, 50, 60, 80, 100, 120, 150, 200, 240, 300]), p2 = pick([5, 10, 15, 20, 25, 30, 40, 50]), more = Math.random() < 0.5;
    var val = more ? base * (100 + p2) / 100 : base * (100 - p2) / 100;
    return mc(p2 + '% ' + (more ? 'more' : 'less') + ' than ' + fmt(base), val, [base * p2 / 100, more ? base * (100 - p2) / 100 : base * (100 + p2) / 100, base + p2, base - p2, val + base / 10], (more ? '(1 + ' : '(1 − ') + p2 + '/100) × ' + fmt(base) + ' = ' + fmt(val), { big: true });
  }
  var orig = pick([40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 400]), disc = pick([10, 20, 25, 40, 50]), sale = orig * (100 - disc) / 100;
  return mc('After a ' + disc + '% discount the price is $' + fmt(sale) + '. Original price?', orig, [sale * (100 + disc) / 100, sale + disc, orig + 10, orig - 10, sale * 2], '$' + fmt(sale) + ' is ' + (100 - disc) + '% of the original, so original = ' + fmt(sale) + ' ÷ ' + ((100 - disc) / 100) + ' = $' + fmt(orig), { fmt: function (v) { return '$' + fmt(v); }, big: true });
});

/* ---------- parity & signs ---------- */
var PAR = [
  ['a + b', function (a, b) { return (a + b) % 2; }], ['ab', function (a, b) { return (a * b) % 2; }], ['a² + b', function (a, b) { return (a * a + b) % 2; }],
  ['2a + b', function (a, b) { return (2 * a + b) % 2; }], ['a + 2b', function (a, b) { return (a + 2 * b) % 2; }], ['ab + a', function (a, b) { return (a * b + a) % 2; }],
  ['ab + b', function (a, b) { return (a * b + b) % 2; }], ['a − b', function (a, b) { return Math.abs(a - b) % 2; }], ['3a + b', function (a, b) { return (3 * a + b) % 2; }],
  ['a² + b²', function (a, b) { return (a * a + b * b) % 2; }], ['(a + b)²', function (a, b) { return ((a + b) * (a + b)) % 2; }], ['ab + 1', function (a, b) { return (a * b + 1) % 2; }],
  ['a + b + 1', function (a, b) { return (a + b + 1) % 2; }], ['b² − a', function (a, b) { return Math.abs(b * b - a) % 2; }], ['a(b + 1)', function (a, b) { return (a * (b + 1)) % 2; }]
];
var SGN = [
  ['xy', -1], ['x²y', 1], ['x − y', -1], ['y − x', 1], ['x³', -1], ['x/y', -1], ['x²', 1], ['−xy', 1], ['y/x', -1],
  ['(x − y)²', 1], ['xy²', -1], ['y³', 1], ['−x', 1], ['x³y', -1], ['−y', -1], ['x⁴', 1], ['(xy)³', -1], ['x² + y', 1]
];
drill('parity', 'Even/odd & signs', 'Which expression must be odd, even, or positive?', 'A', function () {
  if (Math.random() < 0.6) {
    var a = pick([0, 1]), b = pick([0, 1]), wantOdd = Math.random() < 0.5;
    var odd = [], even = [];
    PAR.forEach(function (p) { (p[1](a, b) === 1 ? odd : even).push(p[0]); });
    var one = wantOdd ? odd : even, rest = wantOdd ? even : odd;
    if (one.length < 1 || rest.length < 3) return DRILLS.filter(function (d) { return d.id === 'parity'; })[0].gen();
    var correct = pick(one), others = shuffle(rest.slice()).slice(0, 3);
    var q = 'a is ' + (a ? 'odd' : 'even') + ', b is ' + (b ? 'odd' : 'even') + '. Which must be ' + (wantOdd ? 'odd' : 'even') + '?';
    return mc(q, correct, others, 'Plug in a = ' + a + ', b = ' + b + ': ' + correct + ' is ' + (wantOdd ? 'odd' : 'even') + '; the others come out ' + (wantOdd ? 'even' : 'odd') + '.', { fmt: String });
  }
  var pos = SGN.filter(function (s) { return s[1] === 1; }), neg = SGN.filter(function (s) { return s[1] === -1; });
  var wantPos = Math.random() < 0.5, c2 = pick(wantPos ? pos : neg), o2 = shuffle((wantPos ? neg : pos).slice()).slice(0, 3).map(function (s) { return s[0]; });
  return mc('x < 0 < y. Which must be ' + (wantPos ? 'positive' : 'negative') + '?', c2[0], o2, 'Test x = −1, y = 2: ' + c2[0] + ' is ' + (wantPos ? 'positive' : 'negative') + '. Even powers hide the sign; odd powers keep it.', { fmt: String });
});

/* ---------- compare fractions ---------- */
drill('compare', 'Compare fractions', 'Pick the largest or smallest', 'E', function () {
  var fr = [], vals = {}, tries = 0;
  while (fr.length < 4 && tries++ < 200) {
    var n = rint(1, 11), d = rint(2, 12); if (n >= d) continue;
    var key = frac(n, d), v = n / d;
    if (vals[key] !== undefined) continue;
    var clash = false; for (var k in vals) if (Math.abs(vals[k] - v) < 0.02) clash = true;
    if (clash) continue; vals[key] = v; fr.push(key);
  }
  var largest = Math.random() < 0.5;
  var best = fr.slice().sort(function (x, y) { return largest ? vals[y] - vals[x] : vals[x] - vals[y]; })[0];
  var exp = fr.map(function (f) { return f + ' ≈ ' + vals[f].toFixed(3); }).join(', ') + '. Bow-tie any pair: a/b vs c/d → compare ad with bc.';
  return mc('Which fraction is ' + (largest ? 'largest' : 'smallest') + '?', best, fr.filter(function (f) { return f !== best; }), exp, { fmt: String, big: true });
});

/* ---------- exponent rules ---------- */
drill('exprules', 'Exponent rules', 'Combine, divide and stack powers', 'C', function () {
  var a = rint(2, 9), b = rint(2, 9), base = pick(['x', 'x', '2', '3', 'y']), mode = rint(0, 4), q, ans, cands, exp;
  if (mode === 0) { q = base + sup(a) + ' · ' + base + sup(b) + ' = ' + base + '^?'; ans = a + b; cands = [a * b, Math.abs(a - b), a + b + 1, Math.pow(a, b)]; exp = 'Same base, multiply → add exponents: ' + a + ' + ' + b + ' = ' + (a + b); }
  else if (mode === 1) { if (a < b) { var t = a; a = b; b = t; } if (a === b) a++; q = base + sup(a) + ' ÷ ' + base + sup(b) + ' = ' + base + '^?'; ans = a - b; cands = [a + b, a * b, a / b, a - b + 1]; exp = 'Same base, divide → subtract exponents: ' + a + ' − ' + b + ' = ' + (a - b); }
  else if (mode === 2) { q = '(' + base + sup(a) + ')' + sup(b) + ' = ' + base + '^?'; ans = a * b; cands = [a + b, Math.pow(a, b), a - b, a * b + 1]; exp = 'Power of a power → multiply exponents: ' + a + ' × ' + b + ' = ' + (a * b); }
  else if (mode === 3) { var e = 2 * rint(2, 8); q = '√(' + base + sup(e) + ') = ' + base + '^?'; ans = e / 2; cands = [e, e * 2, e - 2, e / 2 + 1]; exp = 'A square root halves the exponent: ' + e + '/2 = ' + (e / 2); }
  else { var m = rint(2, 5); q = base + sup(a) + ' · ' + base + sup(a) + ' · ' + base + sup(a) + ' (' + 3 + ' copies, multiplied) = ' + base + '^?'; ans = 3 * a; cands = [a + 3, Math.pow(a, 3), a, 3 * a + 1]; exp = 'Multiplying three copies adds the exponents: 3 × ' + a + ' = ' + (3 * a) + '. (Adding three copies would give 3·' + base + sup(a) + ' instead.)'; }
  return mc(q, ans, cands, exp, { big: true });
});

/* ---------- counting ---------- */
var WORDS = [['LEVEL', 30, '5!/(2!·2!)'], ['BANANA', 60, '6!/(3!·2!)'], ['APPLE', 60, '5!/2!'], ['BOOK', 12, '4!/2!'], ['TOOTH', 30, '5!/(2!·2!)'], ['GOOD', 12, '4!/2!'], ['SEES', 6, '4!/(2!·2!)'], ['LITTLE', 180, '6!/(2!·2!)'], ['PEPPER', 60, '6!/(3!·2!)'], ['NOON', 6, '4!/(2!·2!)']];
drill('counting', 'Counting', 'nCk, nPk, factorials, repeated letters', 'I', function () {
  var mode = rint(0, 3), n, k;
  if (mode === 0) { n = rint(5, 10); k = rint(2, 4); var c = nCk(n, k); return mc(n + 'C' + k + ' (choose ' + k + ' of ' + n + ', order ignored)', c, [nPk(n, k), nCk(n, k - 1), nCk(n, k + 1), n * k, c + n], n + 'C' + k + ' = ' + n + '!/(' + k + '!·' + (n - k) + '!) = ' + fmt(c), { big: true }); }
  if (mode === 1) { n = rint(4, 8); k = rint(2, 3); var p = nPk(n, k); return mc(n + 'P' + k + ' (arrange ' + k + ' of ' + n + ', order matters)', p, [nCk(n, k), Math.pow(n, k), n * k, p + n, fact(n)], n + 'P' + k + ' = ' + n + '!/' + (n - k) + '! = ' + fmt(p), { big: true }); }
  if (mode === 2) { n = rint(3, 8); return mc(n + '! = ?', fact(n), [fact(n - 1), fact(n + 1), n * n, fact(n) * 2, fact(n) / 2], n + '! = ' + fmt(fact(n)), { big: true }); }
  var w = pick(WORDS);
  return mc('Distinct arrangements of the letters in ' + w[0], w[1], [fact(w[0].length), w[1] * 2, w[1] / 2, fact(w[0].length) / 2, w[1] + w[0].length], w[2] + ' = ' + fmt(w[1]) + ' — divide by the factorial of each repeat count.', { big: true });
});

/* ---------- probability ---------- */
var DICE = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 };
drill('prob', 'Probability', 'Coins, dice and draws without replacement', 'I', function () {
  var mode = rint(0, 3), S = String;
  if (mode === 0) {
    var n = rint(2, 4), kind = rint(0, 2), tot = Math.pow(2, n), ans, q, exp;
    if (kind === 0) { q = 'P(all heads) in ' + n + ' fair coin flips'; ans = frac(1, tot); exp = '(1/2)' + sup(n) + ' = 1/' + tot; }
    else if (kind === 1) { q = 'P(at least one head) in ' + n + ' fair coin flips'; ans = frac(tot - 1, tot); exp = '1 − P(no heads) = 1 − 1/' + tot + ' = ' + frac(tot - 1, tot); }
    else { var k = rint(1, n - 1); q = 'P(exactly ' + k + ' head' + (k > 1 ? 's' : '') + ') in ' + n + ' flips'; ans = frac(nCk(n, k), tot); exp = n + 'C' + k + ' orderings × (1/2)' + sup(n) + ' = ' + nCk(n, k) + '/' + tot + ' = ' + ans; }
    return mc(q, ans, [frac(1, tot), frac(tot - 1, tot), frac(1, n), frac(n, tot), frac(1, 2), frac(n - 1, n), frac(nCk(n, 1), tot), frac(nCk(n, 2), tot), '1/3', '2/3', '1/8', '3/8', '5/8', '7/8', '1/16', '15/16', '3/16'], exp, { fmt: S, big: true });
  }
  if (mode === 1) {
    var s = rint(2, 12), c = DICE[s];
    return mc('P(sum = ' + s + ') with two fair dice', frac(c, 36), [frac(c + 1, 36), frac(c - 1, 36), frac(c, 12), frac(1, 6), frac(s, 36), frac(c + 2, 36)], c + ' of the 36 equally likely pairs add to ' + s + ' → ' + frac(c, 36), { fmt: S, big: true });
  }
  if (mode === 2) {
    var qs = [['P(both dice show the same number)', '1/6', '6 of 36 pairs match → 6/36 = 1/6'], ['P(at least one 6) with two dice', '11/36', '1 − (5/6)² = 1 − 25/36 = 11/36'], ['P(both dice even)', '1/4', '(1/2)(1/2) = 1/4'], ['P(no 6) with two dice', '25/36', '(5/6)² = 25/36'], ['P(sum is odd) with two dice', '1/2', '18 of 36 sums are odd'], ['P(product is odd) with two dice', '1/4', 'both must be odd: (1/2)(1/2)']];
    var row = pick(qs);
    return mc(row[0], row[1], qs.map(function (x) { return x[1]; }).concat(['1/3', '5/36', '1/12']), row[2], { fmt: S, big: true });
  }
  var r = rint(2, 6), b = rint(2, 6), N = r + b, num = r * (r - 1), den = N * (N - 1);
  return mc('A bag has ' + r + ' red and ' + b + ' blue marbles. Two are drawn without replacement. P(both red)?', frac(num, den), [frac(r * r, N * N), frac(r, N), frac(r - 1, N - 1), frac(2 * r, N), frac(r * b, den), frac(num, N * N)], r + '/' + N + ' × ' + (r - 1) + '/' + (N - 1) + ' = ' + frac(num, den) + ' — both parts shrink on the second draw.', { fmt: S });
});

/* ---------- rates & work ---------- */
var AVG = [[30, 60, 40], [40, 60, 48], [20, 30, 24], [60, 90, 72], [10, 40, 16], [12, 24, 16], [15, 60, 24], [30, 70, 42], [20, 60, 30], [45, 90, 60], [36, 45, 40], [24, 40, 30]];
var WORK = [[3, 6, 2], [4, 12, 3], [6, 12, 4], [10, 15, 6], [12, 24, 8], [5, 20, 4], [6, 30, 5], [8, 24, 6], [9, 18, 6], [2, 2, 1], [4, 4, 2], [6, 6, 3], [12, 36, 9], [20, 30, 12], [15, 30, 10]];
drill('ratework', 'Rates & work', 'D = RT, average speed, combined work, catch-up', 'K', function () {
  var mode = rint(0, 3);
  if (mode === 0) {
    var r = pick([30, 40, 45, 50, 60, 70, 80]), t = pick([1.5, 2, 2.5, 3, 4, 0.5]), D = r * t;
    return mc('At ' + r + ' mph for ' + t + ' hours, distance?', D, [r + t, r / t, D + r, D - r, r * (t + 1)], 'D = R × T = ' + r + ' × ' + t + ' = ' + fmt(D) + ' miles', { fmt: function (v) { return fmt(v) + ' mi'; }, big: true });
  }
  if (mode === 1) {
    var row = pick(AVG);
    return mc('Same distance out at ' + row[0] + ' mph and back at ' + row[1] + ' mph. Average speed?', row[2], [(row[0] + row[1]) / 2, row[0] + row[1], row[1] - row[0], row[2] + 5, row[2] - 5], 'Pick a distance divisible by both, add distances, add times: 2·' + row[0] + '·' + row[1] + '/(' + row[0] + ' + ' + row[1] + ') = ' + row[2] + ' mph — never the plain average ' + ((row[0] + row[1]) / 2) + '.', { fmt: function (v) { return fmt(v) + ' mph'; }, big: true });
  }
  if (mode === 2) {
    var w = pick(WORK);
    return mc('A alone takes ' + w[0] + ' h, B alone ' + w[1] + ' h. Together?', w[2], [(w[0] + w[1]) / 2, w[0] + w[1], w[1] - w[0], w[2] + 1, w[2] - 1, (w[0] * w[1])], '1/' + w[0] + ' + 1/' + w[1] + ' = 1/' + w[2] + ' per hour → ' + w[2] + ' h. Rates add; times never do.', { fmt: function (v) { return fmt(v) + ' h'; }, big: true });
  }
  var r1 = pick([20, 30, 40, 50]), diff = pick([10, 20, 30]), r2 = r1 + diff, h = pick([1, 2, 3]), gap = r1 * h, tt = gap / diff;
  var f2 = function (v) { return fmt(v) + ' h'; };
  return mc('A car leaves at ' + r1 + ' mph. ' + h + ' h later a second car follows at ' + r2 + ' mph. Time for the second car to catch up?', tt, [gap / r2, gap / r1, h, tt + 1, (r1 + r2) / diff], 'Gap when the chaser starts: ' + r1 + ' × ' + h + ' = ' + gap + ' mi. Closing speed ' + r2 + ' − ' + r1 + ' = ' + diff + ' mph → ' + gap + '/' + diff + ' = ' + fmt(tt) + ' h.', { fmt: f2 });
});

/* ---------- statistics ---------- */
drill('stats', 'Mean, median, range', 'Small sets, missing values, sum = mean × count', 'H', function () {
  var mode = rint(0, 3);
  if (mode === 3) {
    var n = rint(4, 6), mean = rint(10, 30), total = mean * n, known = [], sum = 0;
    for (var i = 0; i < n - 1; i++) { var v = rint(mean - 8, mean + 8); known.push(v); sum += v; }
    var missing = total - sum; if (missing < 0) return DRILLS.filter(function (d) { return d.id === 'stats'; })[0].gen();
    return mc(n + ' numbers have mean ' + mean + '. ' + (n - 1) + ' of them are ' + known.join(', ') + '. The last one?', missing, [mean, missing + mean, Math.abs(missing - mean), missing + n, total - sum - n], 'Total = ' + mean + ' × ' + n + ' = ' + total + '; known sum ' + sum + '; missing = ' + total + ' − ' + sum + ' = ' + missing, { big: true });
  }
  var cnt = pick([5, 6, 7]), set = [], s = 0;
  var m0 = rint(5, 20); for (var j = 0; j < cnt - 1; j++) { var x = rint(m0 - 6, m0 + 6); set.push(x); s += x; }
  var last = m0 * cnt - s; if (last < 1 || last > 40) return DRILLS.filter(function (d) { return d.id === 'stats'; })[0].gen();
  set.push(last); s += last;
  var sorted = set.slice().sort(function (a, b) { return a - b; });
  var med = cnt % 2 ? sorted[(cnt - 1) / 2] : (sorted[cnt / 2 - 1] + sorted[cnt / 2]) / 2, rng = sorted[cnt - 1] - sorted[0];
  var list = shuffle(set.slice()).join(', ');
  if (mode === 0) return mc('Mean of ' + list, m0, [med, rng, m0 + 1, m0 - 1, s], 'Sum = ' + s + ', count = ' + cnt + ' → ' + s + '/' + cnt + ' = ' + m0, { big: true });
  if (mode === 1) return mc('Median of ' + list, med, [m0, rng, med + 1, med - 1, sorted[Math.floor(cnt / 2) + 1]], 'Sorted: ' + sorted.join(', ') + ' → middle value ' + fmt(med) + (cnt % 2 ? '' : ' (average of the two middle values)'), { big: true });
  return mc('Range of ' + list, rng, [m0, med, rng + 1, rng - 1, sorted[cnt - 1]], 'max − min = ' + sorted[cnt - 1] + ' − ' + sorted[0] + ' = ' + rng, { big: true });
});

/* ---------- quick algebra ---------- */
drill('algebra', 'Quick algebra', 'Linear solves, roots, special products', 'F', function () {
  var mode = rint(0, 3);
  if (mode === 0) {
    var a = rint(2, 9), x = rint(-6, 12), b = rint(-15, 15), c = a * x + b;
    var q = a + 'x ' + (b < 0 ? '− ' + (-b) : '+ ' + b) + ' = ' + fmt(c) + '. x = ?';
    return mc(q, x, [x + 1, x - 1, -x, c - b, x + 2], a + 'x = ' + fmt(c - b) + ' → x = ' + fmt(x), { nonneg: false, big: true });
  }
  if (mode === 1) {
    var p = rint(-7, 7), r2 = rint(-7, 7); if (p === r2) r2 = p + 1;
    var sm = p + r2, pr = p * r2;
    var q2 = 'x² ' + (sm === 0 ? '' : (-sm < 0 ? '− ' + sm : '+ ' + (-sm)) + 'x ') + (pr < 0 ? '− ' + (-pr) : '+ ' + pr) + ' = 0. Sum of the roots?';
    return mc(q2, sm, [pr, -sm, sm + 1, sm - 1, -pr], 'Roots ' + p + ' and ' + r2 + ' (Vieta: sum = −b/a = ' + fmt(sm) + ', product = c/a = ' + fmt(pr) + ')', { nonneg: false, big: true });
  }
  if (mode === 2) {
    var s2 = rint(3, 12), pr2 = rint(1, 20), ans = s2 * s2 - 2 * pr2;
    return mc('x + y = ' + s2 + ' and xy = ' + pr2 + '. x² + y² = ?', ans, [s2 * s2, s2 * s2 - pr2, s2 * s2 + 2 * pr2, ans + pr2, s2 * s2 - 2 * pr2 + 1], '(x + y)² = x² + 2xy + y², so x² + y² = ' + s2 + '² − 2(' + pr2 + ') = ' + fmt(ans), { nonneg: false, big: true });
  }
  var m = rint(11, 60), d2 = rint(1, 9), big = m + d2, small = m - d2, v = big * big - small * small;
  return mc(big + '² − ' + small + '² = ?', v, [(big - small) * (big - small), v + 10, v - 10, big * big - small, 2 * m * d2 * 2 + 4], '(a + b)(a − b) = ' + (big + small) + ' × ' + (big - small) + ' = ' + fmt(v), { big: true });
});

window.DRILLS = DRILLS;
})();
