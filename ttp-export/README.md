# ttp-export

Personal archival tool: saves **my own** Target Test Prep study record (attempted questions,
error log, analytics) into Obsidian notes and an Excel workbook. Read-only, one tab, human pace,
attached to my own Chrome. The full specification is in [PLAN.md](PLAN.md); deviations and
decisions are logged in [NOTES.md](NOTES.md).

*This README is the Task 0 interim version. Task 8 replaces it with the final three commands and
the redo workflow.*

## Task 0 — setup and smoke test (Windows 11, PowerShell 7, Python 3.11+)

```powershell
cd <this folder>
.\setup.ps1                                   # .venv + deps + config.toml (no playwright install)
notepad config.toml                           # fill in the blanks; single quotes around Windows paths
.\launch-chrome.ps1                           # Chrome with remote debugging on a dedicated profile
#   -> log in to TTP in that window (first time only), open the dashboard
.\.venv\Scripts\python -m ttp_export.connect  # prints title + URL, saves data\discovery\smoke.png
```

## Task 1 — discovery dumps (you navigate, the script only reads)

With the debugging Chrome open on a TTP page:

```powershell
.\.venv\Scripts\python -m ttp_export.discovery dashboard
```

Then navigate by hand and repeat with the next name. Names to capture (skip DI types you have not
attempted): `dashboard`, `error_log` (+ `error_log_p2` if paginated), `test_list`, `test_review`,
`q_ps`, `q_ds`, `q_msr`, `q_ta`, `q_gi`, `q_tpa`, `q_cr`, `q_rc`, `analytics` (+ `analytics_*`).
If several TTP tabs are open, add `--tab <part of the URL or title>`.

To hand the dumps over for analysis:

```powershell
Compress-Archive -Path data\discovery\* -DestinationPath ttp-discovery.zip -Force
```

`data\`, `out\`, `config.toml` and `*.zip` are git-ignored: nothing personal and nothing copied
from TTP is ever committed to this (public) repository.
