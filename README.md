# Philomath Reference

A single-page GMAT study site built for the phone: the reference pages exported from the
Philomath app, a formula sheet, a must-know list you can test yourself on, and practice drills
and question sets. It is plain HTML, CSS and JavaScript with no build step, served from GitHub Pages.

## What is where

| File | What it holds |
| --- | --- |
| `index.html` | The page shell plus the **exported content block**: 135 reference-page templates, the formula sheet and the two JSON indexes. The block between the `===== Content exported …` comments comes from the app's publish step. Regenerate it; do not hand-edit it. |
| `assets/app.css` | All styles. Dark mode is `html[data-theme="dark"]`, chosen from the saved preference or the system setting. |
| `assets/app.js` | Router, side navigation (built from the sections index), home, section, page and formula views, search, theme and the shared progress store (`localStorage` key `pmref.v1`). |
| `assets/mustknows.js` | The must-know items, grouped by section letter. |
| `assets/drills.js` | Speed-drill generators. Every answer is computed, so keys cannot be wrong. |
| `assets/questions.js` | Problem-solving and data-sufficiency question sets. |
| `assets/questions-verbal.js` | Critical-reasoning and reading-comprehension question sets. |
| `assets/practice.js` | The must-knows and practice screens and the shared round player (choices, feedback, explanations, stars, review of misses, progress). |
| `sw.js`, `manifest.webmanifest`, `assets/icon*.png` | Offline support and home-screen install. The service worker is network-first with cache fallback. |
| `tools/check.js` | Validates the data files against `index.html`. Run `node tools/check.js` after editing any data file. |

## Routes

`#/` home · `#/sec/num/A` section · `#/num/remainders` page · `#/formulas` and `#/formulas/<slug>` ·
`#/must`, `#/must/g/<group>`, `#/must/cards/<scope>`, `#/must/quiz/<scope>` (scope is a group letter,
`all` or `weak`) · `#/practice`, `#/practice/drill/<id>`, `#/practice/set/<id>`, `#/practice/mixed`,
`#/practice/missed` · `#/about`.

## Adding content

**A must-know** is one object in `assets/mustknows.js`:

```js
{ id: 'E21', g: 'E', q: 'prompt', a: 'answer', n: 'optional note', l: '#/num/percent-formulas',
  alts: ['wrong 1', 'wrong 2', 'wrong 3'] }
```

`alts` are the wrong answers used in quizzes. Leave them out for table facts (squares, roots,
fraction–percent pairs, …) and give the item a `k` sub-kind instead; the quiz then borrows answers
from other items with the same `k`. Keep every group at four items or more.

**A question** is one object inside a set in `assets/questions.js` or `assets/questions-verbal.js`:

```js
{ id: 'psf11', q: 'stem (newlines allowed)', c: ['A', 'B', 'C', 'D', 'E'], a: 2,
  e: 'explanation', l: '#/num/percent-formulas' }
```

`a` is the zero-based index of the correct choice. Data-sufficiency questions omit `c` (the five
standard verdicts are added automatically) and must contain `(1)` and `(2)` in the stem. Critical
reasoning and reading questions carry the argument or passage in `p`; consecutive reading questions
with the same `p` show the passage collapsed after the first one. Question ids must be unique across
every set because they are used to remember misses.

**A drill** is a `drill(id, title, subtitle, sectionLetter, generator)` call in `assets/drills.js`.
The generator returns `{ q, choices, ans, exp, big }`; use the `mc()` helper so distractors are
de-duplicated and padded.

After any change: `node tools/check.js`, then bump `VERSION` in `sw.js` so phones drop the old
offline cache.

## Republishing from the app

The app's publish step writes a complete `index.html`. If you republish, keep only the exported
content block from the new file and paste it between the two `=====` comments in this `index.html`
(or update the publish step to emit this shell). The data and script files are untouched by a
republish.

## Progress and privacy

Progress (must-know boxes, best scores, stars, missed questions, theme) lives only in the browser's
`localStorage` on that device. "About" has a reset button.
