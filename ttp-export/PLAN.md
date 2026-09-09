# TTP Study-Record Export — Claude Code Build Plan

## How to use this file

Save this as `PLAN.md` in the root of a new empty folder (e.g. `C:\dev\ttp-export`) and start Claude Code there. First message:

> Read PLAN.md in full. Fill in the `## Config` placeholders by asking me for each value. Then execute **Task 0 only**, end with its Checkpoint Report, and stop.

After each checkpoint: "Approved — do Task N." Never more than one task per instruction.

---

## Role and context (read this, Claude Code)

You are building a personal archival tool. Adam pays for Target Test Prep (TTP, GMAT prep). His subscription ends in 1–2 weeks. TTP has no export for its error log or test history, so this tool saves **his own study record** — every question he has already attempted, the error log, and his analytics — into (1) Obsidian notes he can review on iPad and (2) an Excel workbook he can filter, track, and redo questions from.

Scale: 500–1,500 attempted questions. Priority order: **Quant → Data Insights → Verbal**, and within that, **error log first**. Read pace only: ~20 s/page, `--max-pages 250` per evening ≈ 1–1.5 h. The whole capture fits in 2–5 evenings.

This is *not* a scraper of the TTP course. It is an export of pages Adam has already earned the right to look at, done at the speed he would look at them.

## Non-negotiables

1. **Read-only.** Scripts navigate to and read review pages, the error log, and analytics — pages that display Adam's completed work. They never click an answer choice, submit anything, start/resume/retry a test, or change an account setting. The only permitted clicks besides navigation are client-side disclosure toggles ("show explanation", tab switches on a review page). If enumerating attempted questions would require starting something, **stop and report**.
2. **Real browser, no disguise.** Attach to Adam's own Google Chrome over CDP (`connect_over_cdp`). No `playwright-stealth` or equivalent, no user-agent/timezone/canvas/device spoofing, no proxies, no mouse-jiggle or fake-reading routines. If you ever think one is needed, it isn't — stop and report.
3. **Stop on pushback.** On HTTP 403/429/5xx, a redirect to a login page, a CAPTCHA/challenge/interstitial, or 3 consecutive selector timeouts: log it, flush data, print a plain-English message, exit non-zero. No retry loops, no "wait 300 s and continue."
4. **Pace.** One tab, one page at a time, `random.uniform(4, 9)` seconds between page loads, `--max-pages` per run (default 250). No parallelism. No shuffling — walk in the natural order.
5. **`data/records.jsonl` is the source of truth.** Append-only, one JSON line per question, flushed on write. Every run is resumable (skip qids already present). Both builders are pure functions of the JSONL (plus the RedoLog round-trip in Task 7).
6. **Vault safety.** Never modify, move, or delete existing files in Adam's Obsidian vault. The inventory (Task 6) is read-only. Writes go only inside the export folder you create.
7. **Report before rewrite.** For anything subjective — selector map, markdown conversion rules, topic↔folder matching, note template, workbook layout — show a sample and wait for approval before applying at scale.
8. **Checkpoint discipline.** One task per instruction. End every task with the Checkpoint Report specified. Do not start the next task until told.
9. **Windows.** PowerShell 7, Windows paths, `pathlib` everywhere, no bash-isms.

## Config (fill by asking Adam)

```toml
# config.toml
[chrome]
cdp_url = "http://127.0.0.1:9222"
ttp_domain = ""                 # e.g. the host in the URL bar when logged in

[vault]
root = ""                       # Obsidian vault root, Windows path
gmat_folder = ""                # existing GMAT folder inside the vault (his lesson screenshots live here)
export_folder = "GMAT/TTP Export"   # NEW folder the tool creates; nothing else in the vault is touched
image_format = "png"            # png | webp | jpg   (webp/jpg shrink Obsidian Sync usage; ask him)
image_quality = 85

[pacing]
min_wait = 4.0
max_wait = 9.0
max_pages_default = 250
```

Also ask: does TTP track in-lesson practice questions he answered (separate from chapter/custom tests)? If yes, they're in scope.

## Environment

- Windows 11, PowerShell 7, Python 3.11+ in `.venv`, system Google Chrome, Excel 365 (desktop; he also uses Excel and Obsidian on iPad), Obsidian with Sync.
- Python deps: `playwright beautifulsoup4 markdownify openpyxl pywin32 rapidfuzz pillow tomli` (`tomli` only if Python < 3.11). **No `playwright install`** — we attach to system Chrome; no bundled browser is needed.
- Chrome must be launched with remote debugging on a **dedicated profile directory** (current Chrome versions refuse remote debugging on the default profile). Adam runs this once per session:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="$env:LOCALAPPDATA\ttp-chrome-profile"
```

He logs in to TTP in that window once; the profile keeps the session across launches, so there is no login routine in the scripts at all.

## Repo layout

```
ttp-export/
  PLAN.md  README.md  config.toml  SELECTORS.md  NOTES.md
  .venv/
  src/ttp_export/
    __init__.py
    config.py           # load config.toml
    connect.py          # attach over CDP → (browser, context, page)
    discovery.py        # dump DOM / screenshot / a11y tree of the current page under a name
    selectors.py        # constants generated from SELECTORS.md (Task 1)
    extract.py          # page/HTML → record fields (text, choices, math, tables, images)
    capture.py          # capture_one(page, url) → record + screenshots
    enumerate_q.py      # build data/queue.json
    run.py              # walker: queue → records.jsonl
    analytics_shots.py
    inventory.py        # read-only Obsidian inventory + coverage map
    build_obsidian.py
    build_excel.py
    verify_excel.py     # Excel COM full recalc + error scan
  data/
    records.jsonl       # SOURCE OF TRUTH
    queue.json
    capture_log.jsonl   # failures/skips with url + reason
    analytics.json
    discovery/          # Task 1 dumps
    shots/clean/  shots/review/  shots/extra/
    inventory/obsidian_inventory.json  inventory/coverage.json
  out/
    TTP_Export.xlsx
```

## Data model — one JSON line per question

```jsonc
{
  "qid": "q_7f3a9c",                  // stable id derived from TTP's own identifier (URL/attr) — never a counter
  "section": "quant" | "di" | "verbal",
  "qtype": "ps" | "ds" | "msr" | "ta" | "gi" | "tpa" | "cr" | "rc",
  "chapter": "", "topic": "", "subtopic": "", "difficulty": "easy|medium|hard|null",
  "source": { "kind": "error_log|chapter_test|custom_test|lesson_practice", "name": "", "url": "" },
  "attempted_at": "ISO date or null",
  "result": "correct" | "incorrect" | "skipped",
  "answer_format": "single" | "multi_statement" | "two_part" | "dropdown",
  "my_answer": "B" | { "1": "Yes", "2": "No" } | { "col1": "C", "col2": "E" },
  "key":       "D" | { ... same shape as my_answer ... },
  "time_sec": 143, "time_target_sec": null,
  "prompt_md": "", "choices": { "A": "", "B": "", "C": "", "D": "", "E": "" } | { "statements": [ ... ] } | { "cols": [...], "rows": [...] },
  "passage_id": null | "p_1c2d",       // RC: passage stored once in data/passages.jsonl
  "explanation_md": "",
  "assets": { "clean": "shots/clean/quant_q_7f3a9c.png", "review": "shots/review/quant_q_7f3a9c.png", "extra": [] },
  "captured_at": "ISO datetime", "capture_version": 1
}
```

Filenames are stable (`{section}_{qid}[_tabN|_passage].png`) so links never break; timestamps live in the record, not the filename.

---

## Task 0 — Scaffold + attach smoke test

1. Create the layout above, `.venv`, install deps, write `config.toml` from the Config section with Adam's values, `config.py` loader.
2. `connect.py`: `chromium.connect_over_cdp(cdp_url)`; use `browser.contexts[0]`; pick the page whose URL contains `ttp_domain` (else the first page). Return `(browser, context, page)`. Never create a new context.
3. `python -m ttp_export.connect` prints the page title + URL and saves `data/discovery/smoke.png`.
4. Adam: launch Chrome with the command above, log in, open the dashboard, then run step 3.

**Checkpoint Report:** exact Chrome command used, console output of the smoke test, screenshot path, deps installed, anything that deviated from this plan.

## Task 1 — Discovery (read-only DOM dumps → SELECTORS.md)

`python -m ttp_export.discovery <name>` saves, for the page currently open in the attached Chrome: `data/discovery/<name>.html` (`page.content()`), `<name>.png` (full page), `<name>.a11y.json` (accessibility snapshot), `<name>.url.txt`. No navigation by the script — Adam navigates by hand, then runs the command.

Adam captures these (skip any DI type he hasn't attempted):
`dashboard`, `error_log` (plus `error_log_p2` if paginated), `test_list` (where completed tests are listed), `test_review` (one completed test's results page listing its questions), `q_ps`, `q_ds`, `q_msr`, `q_ta`, `q_gi`, `q_tpa`, `q_cr`, `q_rc` (a review page for each type), `analytics` (+ `analytics_*` sub-pages).

Then read the dumps and write **`SELECTORS.md`** covering:

1. **Navigation map** — how to enumerate every attempted question: error-log entry link pattern; completed tests → review page → per-question links; whether lesson practice questions are tracked anywhere; pagination; and the **qid source** (is a review URL stable and does it carry an ID or data attribute?).
2. **Field selectors per qtype** — prompt, choices, selected answer, key, result, time spent (+ target time if shown), explanation (and its disclosure toggle if collapsed), chapter/topic/difficulty breadcrumbs, attempted date; RC passage; MSR tabs; TA table; GI dropdowns; TPA grid.
3. **Math rendering** — KaTeX (`annotation[encoding="application/x-tex"]`), MathJax (assistive MathML / `aria-label` / `script[type="math/tex"]`), images, or plain text — and how to recover TeX.
4. **Review highlighting** — the classes/attributes/icons that mark the selected and correct choices, so a `clean` screenshot can neutralize them with injected CSS.
5. **qtype detection rule** from the DOM.
6. **Unknowns** — anything that needs another dump.

**Checkpoint Report:** post SELECTORS.md in full. Write no extraction code yet. (Report-before-rewrite.)

## Task 2 — Single-question capture

Implement `extract.py` and `capture.py`. `capture_one(page, url, source)`:

1. `goto(url)`, `wait_for_selector(prompt, timeout=10000)`, `wait_for_load_state("networkidle")`, short pause.
2. **Clean shot:** inject CSS (`page.add_style_tag`) that neutralizes the review highlighting found in Task 1 → element screenshot of the question container → `shots/clean/…`. MSR: one per tab (switch tabs; client-side toggle). RC: passage shot + question shot. If highlighting can't be neutralized for a type, fall back to a stem-only shot and say so in NOTES.md.
3. Remove the injected style. Expand the explanation if collapsed. **Full-page screenshot** → `shots/review/…`.
4. Extract fields → record. HTML→Markdown rules: math → `$…$` / `$$…$$` from recovered TeX; tables → GFM tables; images inside prompt/explanation → download to `shots/extra/` and link relatively; strip site chrome; preserve paragraphs and lists. RC passage → `data/passages.jsonl` once, keyed by `passage_id`.
5. Return the record; do not write to `records.jsonl` yet in this task.

Run it on three review URLs Adam supplies (quant, DI, verbal). Print the three records and the shot paths.

**Checkpoint Report:** the three records pretty-printed, all shot paths, and a short list of conversion decisions (math, tables, images, whitespace). Adam compares against the live pages; iterate until faithful before Task 3.

## Task 3 — Enumeration → `data/queue.json`

Build the ordered queue: error log (Quant → DI → Verbal) → completed test review pages (Quant → DI → Verbal, chronological) → any other tracked attempted questions. Dedupe by qid, keeping the first source seen. Never start, resume, or retry anything; if a "test" has unfinished questions, enumerate only the reviewed ones.

**Checkpoint Report:** counts by section and source, total vs the 500–1,500 estimate, and anything that looked like it would require starting a test (flagged, not done).

## Task 4 — Walker `run.py`

Flags: `--max-pages N` (default 250), `--section quant|di|verbal|all`, `--only-errorlog`, `--dry-run`. Behavior: load queue; skip qids already in `records.jsonl`; for each URL → `capture_one` → append one line, flush; pause `uniform(min_wait, max_wait)`; on failure append to `capture_log.jsonl` with url + reason and continue, except the stop conditions in Non-negotiable 3, which end the run. Console line per page:

`[12/250] quant q_7f3a9c  chapter_test "Ch 7 Hard"  clean ✓ review ✓ record ✓  next in 6.3s`

End-of-run summary: captured, skipped, failed, elapsed, remaining in queue. Smoke: `--max-pages 20 --only-errorlog`.

**Checkpoint Report:** the smoke run log, failures with reasons, mean seconds per page, confirmation that nothing outside `data/` changed.

## Task 5 — Analytics screenshots

Full-page shots of every analytics/dashboard view → `data/shots/analytics/{view}_{YYYY-MM-DD}.png`. If per-chapter accuracy/timing tables are in the DOM, extract them to `data/analytics.json`.

**Checkpoint Report:** file list.

## Task 6 — Obsidian inventory + coverage map (read-only)

`inventory.py` walks `vault.gmat_folder` recursively and records every `.png/.jpg/.jpeg/.webp/.pdf/.md` with path, size, mtime, and for `.md` the frontmatter, tags, and H1/H2s → `inventory/obsidian_inventory.json`. Then match TTP chapters/topics (from the navigation map and record breadcrumbs) to his folders/files with normalized fuzzy matching (`rapidfuzz`) → `inventory/coverage.json` and a markdown table: chapter → topic → screenshot count → matched folder/note.

**Checkpoint Report (report-before-rewrite):** the proposed mapping table. Adam corrects it; only the approved mapping is used for linking in Task 7.

## Task 7 — Builders

### 7a `build_obsidian.py`

Writes only inside `{vault.root}/{export_folder}/`:

```
Questions/{Quant|Data Insights|Verbal}/{Chapter}/{qid}.md
_assets/                      # copied shots, converted to image_format/quality
Index — Quant.md, Index — Data Insights.md, Index — Verbal.md
Index — Error Log.md          # all incorrect
Index — Redo Queue.md         # incorrect + correct-but-slow (SlowFlag, see 7b)
```

Note template (adjust after approval):

```markdown
---
qid: q_7f3a9c
section: quant
qtype: ps
chapter: "Ch 7"
topic: "Remainders"
difficulty: hard
result: incorrect
my_answer: B
key: D
time_sec: 143
attempted: 2026-08-14
source: "Chapter Test — Ch 7 Hard"
tags: [ttp/quant/remainders, result/incorrect]
---
# Remainders — Ch 7 Hard — q_7f3a9c

![[_assets/quant_q_7f3a9c.png]]

{prompt_md}

A. … B. … C. … D. … E. …

> [!info] Your notes on this topic: [[{matched lesson folder/note from coverage map}]]

> [!answer]- Reveal answer and explanation
> **Key: D** — you chose **B** (incorrect, 2:23)
>
> {explanation_md}
>
> ![[_assets/quant_q_7f3a9c_review.png]]
```

The folded callout is the **redo mode**: he attempts the question from the clean shot, then expands. Idempotent regeneration; never touches files outside the export folder.

### 7b `build_excel.py` → `out/TTP_Export.xlsx`

Sheets, in this order:

- **Legend** — which cells to type in (blue font, yellow fill), how Redo works, one clearly marked example RedoLog row.
- **Questions** — Excel Table `tblQ`, frozen header, autofilter, wrap text. Columns: `qid, section, qtype, chapter, topic, subtopic, difficulty, source_kind, source_name, attempted_at, result, my_answer, key, time_sec, time_mmss, SlowFlag, prompt_md, choice_A..E (or choices_json), explanation_md, note_link, clean_shot, review_shot`. `note_link` = `obsidian://open?vault={name}&file={path}` hyperlink; shot columns = `file:///` hyperlinks. Cells > 32,000 chars are truncated with `[…see note]`.
- **ErrorLog** — the incorrect rows, pre-filtered in Python (regenerated each build).
- **Redo** — `B2` = qid chosen from a data-validation dropdown (named range `Q_ID`); `INDEX/MATCH` pulls section, chapter, topic, prompt, choices, clean-shot link. `B10` = "Your answer" input. Reveal block, all formulas of the form `=IF($B$10="","",INDEX(Q_Key,MATCH($B$2,Q_ID,0)))`: key, Correct/Incorrect, original answer, original result and time, explanation, review-shot link. "Times redone / last result" via `COUNTIFS`/`INDEX-MATCH` on RedoLog.
- **RedoLog** — `qid | date | your_answer | correct? (formula) | notes`. **Round-trip:** the build reads existing RedoLog rows before regenerating and writes them back unchanged.
- **Analytics** — by section and chapter: attempted, correct, accuracy, avg time, slow-correct count — `COUNTIFS`/`AVERAGEIFS` over defined names.
- **Coverage** — the approved Task 6 mapping.
- **Passages** — RC passages by `passage_id`.

Rules: formulas, never pasted values; defined names (`Q_ID`, `Q_Key`, `Q_Result`, …) sized to the exact row count at build time; `INDEX/MATCH`, `COUNTIFS`, `AVERAGEIFS`, `IFERROR` only — **no `XLOOKUP`, `FILTER`, or other dynamic arrays** (keeps it verifiable and working in Excel on iPad); Arial 10; sensible column widths. `SlowFlag` = `time_sec > 1.5 × median time of correct answers in the same chapter`, computed in Python, threshold documented on the Legend sheet.

### 7c `verify_excel.py`

Open the workbook via `win32com`, `Application.CalculateFullRebuild()`, scan every used range for `#N/A #REF! #NAME? #VALUE! #DIV/0!`, spot-check three Redo lookups against `records.jsonl`, save, close. Zero errors required before the checkpoint.

**Checkpoint Report (report-before-rewrite):** five sample notes (one per section plus one MSR and one RC), screenshots of the Questions and Redo sheets, the verify report. Adam approves the template and layout before the full build.

## Task 8 — Full runs + README

Run order across evenings: `--only-errorlog` (all sections) → `--section quant` → `--section di` → `--section verbal`, ~250 pages per run. After each run, rebuild both outputs (should take seconds). `README.md` with exactly three commands (launch Chrome, run the walker, build outputs) and the redo workflow in Obsidian and in Excel.

**Final Checkpoint Report:** captured vs queued per section, the `capture_log.jsonl` failure list with reasons, total runtime, and the one-line commands to regenerate everything.

## Definition of done

- Every queued qid is either in `records.jsonl` or in `capture_log.jsonl` with a reason.
- ErrorLog row count matches the count TTP shows in its error log.
- `verify_excel.py` reports zero errors; Redo sheet works with the dropdown.
- Sample notes render correctly in Obsidian on iPad, including math.
- One command regenerates both outputs from `records.jsonl` without touching anything else in the vault.
