# HANDOFF — state of the project on 2026-09-09, for a local Claude Code session

Read this after PLAN.md and NOTES.md. It captures everything decided in the remote (cloud)
session so nothing has to be re-asked.

## Why the move to a local terminal

The cloud session could not reach Adam's Chrome, vault, or Excel, so every step that touches
them cost a day-long round trip. Locally, Claude Code attaches to Chrome directly, reads the
discovery dumps as soon as they exist, iterates on selectors in minutes, runs the walker
overnight, inventories the real vault, and runs the Excel COM verifier. That is the workflow
PLAN.md was written for.

## Done so far (Task 0 code, verified only against a headless Chromium on Linux)

- `config.py` loader, `connect.py` CDP attach + smoke test, `discovery.py` dumper,
  `setup.ps1`, `launch-chrome.ps1`, stubs for every later module. See NOTES.md for details.
- **Not yet run on Windows.** Task 0 step 4 (Adam launches Chrome, logs in, runs
  `python -m ttp_export.connect`) is the next action. Then the Task 0 Checkpoint Report.

## Adam's answers (2026-09-09)

- **TTP domain:** `gmat.targettestprep.com`.
- **Where everything is:**
  - Study plan (missions, lessons, chapter tests): `https://gmat.targettestprep.com/study_plan`
  - Chapter tests: `https://gmat.targettestprep.com/evaluations/quant`, `/evaluations/verbal`,
    `/evaluations/di`
  - Error tracker: `https://gmat.targettestprep.com/error_tracker/quant` (expect `/verbal`, `/di`)
  - "Most everything else is probably not needed as much."
- **In-lesson practice questions:** "I think they keep track if I add it to the error log, not
  completely sure." Treat the error tracker as the union of what he flagged; confirm during
  Task 1/3 whether lesson practice appears anywhere else. Never start anything to find out.
- **Vault:** his GMAT notes live in `C:\Vaults\Obsidian Vault\5 - Main Notes (Zettelkasten)\GMAT Prep`.
  Assumed vault root `C:\Vaults\Obsidian Vault` (verify it contains `.obsidian\`), vault name
  `Obsidian Vault`. Proposed export folder: `...\GMAT Prep\TTP Export` (a NEW subfolder; the
  plan's `GMAT/TTP Export` default was a placeholder). These are pre-filled in
  `config.example.toml`; adjust `config.toml` if the vault root differs.
- **Checkpoints:** batch approvals are fine ("do Tasks 1 and 2"); still show samples before
  applying anything subjective at scale (selectors, markdown rules, mapping, note template,
  workbook layout).
- **Time:** all evenings available; he sleeps 10:00 PM to 7:00 AM and wants work (including
  capture runs on his machine) to continue overnight. Hard deadline: September 14, 11:59 PM.
- **Constraint in his words:** "just don't run it to the point where I get banned." Keep PLAN.md
  non-negotiables 2, 3 and 4 exactly: one tab, natural order, 4-9 s between pages, stop on any
  pushback, no disguise. For an overnight run raise `--max-pages`, never the pace.
- **Repo:** he prefers a private repo. The cloud session could not create one (GitHub App
  returned 403 on repo creation). The scaffold was pushed to the PUBLIC repo
  `adamelizondo6-bit/philomath-reference`, branch `claude/september-14-deadline-qg7mce`, folder
  `ttp-export/`, with `config.toml`, `data/`, `out/`, `.venv/`, `*.zip` git-ignored. Once copied
  locally, that branch can be deleted; a local `git init` (optionally pushed to a private repo)
  is enough from then on.

## Suggested first message for the local session

> Read PLAN.md, NOTES.md and HANDOFF.md in full. Config values are already in
> config.example.toml; copy to config.toml and confirm them with me. Then execute Task 0 step 4
> (I will launch Chrome and log in when you tell me), end with the Task 0 Checkpoint Report, and
> stop. After that I will approve tasks in batches.

## Suggested order after Task 0

1. Task 1 dumps: dashboard, study_plan, error_tracker (quant/verbal/di, plus a second page if
   paginated), evaluations (quant/verbal/di), one completed chapter-test review, one review page
   per question type attempted, analytics. Then SELECTORS.md.
2. Tasks 2-3, then a Task 4 smoke (`--max-pages 20 --only-errorlog`).
3. First overnight run: error log for all sections, then Quant, DI, Verbal, at the plan's pace.
4. Tasks 5-7 while runs proceed; builders are pure functions of `data/records.jsonl`.
5. Task 8 README and final report before September 14, 11:59 PM.
