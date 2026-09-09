# NOTES — decisions and deviations from PLAN.md

Newest first. Anything subjective waits for approval (PLAN.md non-negotiable 7).

## Task 0 (2026-09-09)

- **Handoff to a local session.** See HANDOFF.md: Adam's answers, config values, and the
  reason for moving from the cloud session to a local terminal.

- **Location.** The plan assumes a new empty folder. The tool lives in `ttp-export/` inside the
  existing `philomath-reference` repository (a public GitHub Pages site) on branch
  `claude/september-14-deadline-qg7mce`. Consequence: `config.toml`, `data/`, `out/`, `.venv/` and
  `*.zip` are git-ignored so no personal path, no logged-in page dump, no question text and no
  screenshot can ever be committed. `config.example.toml` is the committed template.
- **Built remotely, run locally.** The code was written and exercised in a Linux container that
  cannot see Adam's Chrome, vault or Excel. Everything that touches Chrome, the vault or Excel is
  run by Adam on Windows; the attach path was tested here against a real Chromium over CDP.
- **Discovery tool shipped with Task 0.** `discovery.py` is Task 1's mechanical first paragraph
  (dump DOM/screenshot/a11y of the current tab). It is included now because each round trip costs
  a day: Adam can run the smoke test and the dumps in one sitting. Nothing in Task 1's *analysis*
  (SELECTORS.md) is started until the dumps exist.
- **Extra dump files.** Besides `.html/.png/.a11y.json/.url.txt`, discovery also writes
  `.frame<N>.html` for every iframe (question bodies sometimes live in one), `.aria.yaml`
  (Playwright's ARIA snapshot; `.a11y.json` is only written on older Playwright versions that
  still have `page.accessibility` -- 1.62 does not) and `.summary.json` (read-only element
  counts: KaTeX/MathJax/MathML/images/tables/iframes/forms, plus the set of `data-*` attribute
  names). All read-only.
- **Verified here** against a headless Chromium 141 over CDP with a fake review page: tab
  selection, full-page screenshot (1265x2159), main + iframe HTML, ARIA snapshot, summary counts,
  and that Chromium keeps all tabs after detach. Windows-specific pieces (setup.ps1,
  launch-chrome.ps1, pywin32) could not be run here -- the Task 0 smoke test on Adam's machine
  is their first real run.
- **`vault.name` added to config.** The Excel `obsidian://open?vault=…` links (Task 7b) need the
  vault's display name; it was not in the plan's config block.
- **Tab choice.** `connect.py` prefers the first tab whose *host* is `ttp_domain` (or a subdomain),
  then any tab whose URL merely contains it, then the first http(s) tab, then the first tab.
  `--tab <substring>` overrides. Only `browser.contexts[0]` is ever used; no context or tab is
  created.
- **Detach never closes Chrome.** `Attached.detach()` only stops the Playwright driver (drops the
  CDP connection). `browser.close()` is deliberately not called.
- **Screenshots activate the tab.** `page.bring_to_front()` is called before screenshots so a
  background tab renders; it changes nothing on the page.
- **Console output is forced to UTF-8** (`_cli.utf8_console`) so status glyphs such as ✓ never
  crash a Windows console.
- **launch-chrome.ps1** first checks whether port 9222 already answers (a second Chrome launch
  with the same profile silently ignores the debugging flag), then launches, waits, and confirms
  via `http://127.0.0.1:9222/json/version`.
