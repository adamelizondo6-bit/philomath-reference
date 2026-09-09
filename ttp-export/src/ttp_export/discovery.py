"""Read-only DOM dumps of the page currently open in the attached Chrome (Task 1).

    python -m ttp_export.discovery <name> [--tab <substring>]

You navigate by hand, then run this. It never navigates or clicks. For the current tab it writes,
under data/discovery/:

    <name>.html          page.content() of the main frame
    <name>.frame<N>.html content of every child iframe (question bodies sometimes live in one)
    <name>.png           full-page screenshot
    <name>.aria.yaml     ARIA snapshot of <body> (roles, names, structure)
    <name>.a11y.json     legacy accessibility tree, only on Playwright versions that still have it
    <name>.summary.json  counts of math renderers, images, tables, iframes, forms, ... (helps Task 1)
    <name>.url.txt       URL, title, timestamp, viewport, frame list

Names: letters, digits, '-' and '_' only, e.g. dashboard, error_log, q_ps, analytics_quant.
"""

from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path
from typing import Any

from ._cli import die, human_size, now_iso, utf8_console
from .config import Config, ConfigError, load_config
from .connect import Attached, ConnectError, attach, url_matches_domain

NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")

# Read-only element counts. querySelectorAll only -- nothing is changed on the page.
SUMMARY_JS = """
() => {
  const q = (s) => document.querySelectorAll(s).length;
  return {
    katex: q('.katex'),
    katex_tex_annotations: q('annotation[encoding="application/x-tex"]'),
    mathjax_v2: q('.MathJax'),
    mathjax_v3: q('mjx-container'),
    math_tex_scripts: q('script[type^="math/tex"]'),
    mathml: q('math'),
    img: q('img'),
    svg: q('svg'),
    table: q('table'),
    iframe: q('iframe'),
    form: q('form'),
    input: q('input'),
    button: q('button'),
    select: q('select'),
    links: q('a[href]'),
    data_attrs_sample: Array.from(new Set(
      Array.from(document.querySelectorAll('*'))
        .flatMap(el => Array.from(el.attributes).map(a => a.name))
        .filter(n => n.startsWith('data-'))
    )).sort().slice(0, 80),
    title: document.title,
    readyState: document.readyState,
    scrollHeight: document.documentElement.scrollHeight,
  };
}
"""


def dump_current_page(att: Attached, name: str, cfg: Config) -> list[Path]:
    """Write all dump files for att.page under data/discovery/<name>.* and return their paths."""
    if not NAME_RE.match(name):
        raise ValueError(f"bad name {name!r}: use letters, digits, '-' or '_' (max 64 chars)")
    out_dir = cfg.paths.discovery
    out_dir.mkdir(parents=True, exist_ok=True)
    page = att.page
    written: list[Path] = []

    def write_text(suffix: str, text: str) -> None:
        p = out_dir / f"{name}{suffix}"
        p.write_text(text, encoding="utf-8")
        written.append(p)

    try:
        page.bring_to_front()
        page.wait_for_load_state("load", timeout=15_000)
    except Exception as e:  # noqa: BLE001 - a still-loading page is fine to dump; say so
        print(f"note: page not fully loaded ({type(e).__name__}); dumping what is there.", file=sys.stderr)
    time.sleep(0.5)

    url = page.url
    title = page.title()

    # 1. Main document + child frames
    write_text(".html", page.content())
    frame_lines: list[str] = []
    for i, frame in enumerate(page.frames):
        if frame == page.main_frame:
            continue
        frame_lines.append(f"frame{i}: name={frame.name!r} url={frame.url}")
        try:
            write_text(f".frame{i}.html", frame.content())
        except Exception as e:  # noqa: BLE001
            frame_lines.append(f"frame{i}: content unavailable ({type(e).__name__}: {e})")

    # 2. Full-page screenshot
    png = out_dir / f"{name}.png"
    page.screenshot(path=str(png), full_page=True)
    written.append(png)

    # 3. Accessibility tree (old API, deprecated but still useful) and ARIA snapshot (new API)
    if hasattr(page, "accessibility"):  # removed in newer Playwright; .aria.yaml is its replacement
        try:
            tree = page.accessibility.snapshot()
            write_text(".a11y.json", json.dumps(tree, indent=1, ensure_ascii=False))
        except Exception as e:  # noqa: BLE001
            print(f"note: accessibility snapshot failed ({type(e).__name__}); skipping .a11y.json", file=sys.stderr)
    try:
        aria = page.locator("body").aria_snapshot()
        write_text(".aria.yaml", aria)
    except Exception as e:  # noqa: BLE001
        print(f"note: aria snapshot unavailable ({type(e).__name__}); skipping .aria.yaml", file=sys.stderr)

    # 4. Read-only summary counts
    summary: dict[str, Any] = {}
    try:
        summary = page.evaluate(SUMMARY_JS)
    except Exception as e:  # noqa: BLE001
        summary = {"error": f"{type(e).__name__}: {e}"}
    summary.update({"name": name, "url": url, "captured_at": now_iso(), "frames": len(page.frames) - 1})
    write_text(".summary.json", json.dumps(summary, indent=1, ensure_ascii=False))

    # 5. URL/title/timestamp record
    try:  # viewport_size is None for attached tabs; ask the page instead
        vp = page.evaluate("() => ({width: window.innerWidth, height: window.innerHeight})")
    except Exception:  # noqa: BLE001
        vp = {}
    write_text(
        ".url.txt",
        "\n".join(
            [
                f"url: {url}",
                f"title: {title}",
                f"captured_at: {now_iso()}",
                f"viewport: {vp.get('width', '?')}x{vp.get('height', '?')}",
                f"frames: {len(page.frames) - 1}",
                *frame_lines,
                "",
            ]
        ),
    )
    return written


def main(argv: list[str] | None = None) -> int:
    utf8_console()
    argv = list(sys.argv[1:] if argv is None else argv)
    tab_filter = ""
    if "--tab" in argv:
        i = argv.index("--tab")
        if i + 1 >= len(argv):
            die("--tab needs a value", 2)
        tab_filter = argv[i + 1]
        del argv[i : i + 2]
    if len(argv) != 1 or argv[0].startswith("-"):
        print(__doc__)
        return 2
    name = argv[0]
    if not NAME_RE.match(name):
        die(f"bad name {name!r}: use letters, digits, '-' or '_' (max 64 chars)", 2)
    try:
        cfg = load_config()
    except ConfigError as e:
        die(str(e), 2)
    cfg.paths.ensure()
    existing = sorted(cfg.paths.discovery.glob(f"{name}.*"))
    if existing:
        print(f"note: overwriting {len(existing)} existing file(s) named {name}.*", file=sys.stderr)
    try:
        att = attach(cfg, tab_filter)
    except ConnectError as e:
        die(str(e), 3)
    try:
        if cfg.chrome.ttp_domain and not url_matches_domain(att.page.url, cfg.chrome.ttp_domain):
            print(
                f"WARNING: the chosen tab is not on {cfg.chrome.ttp_domain!r}: {att.page.url}\n"
                "         (dumping it anyway; use --tab <substring> to pick a different tab)",
                file=sys.stderr,
            )
        print(f"Dumping {att.page.url}")
        files = dump_current_page(att, name, cfg)
    finally:
        att.detach()
    for p in files:
        print(f"  {p.name:<32} {human_size(p.stat().st_size):>10}")
    summary_path = cfg.paths.discovery / f"{name}.summary.json"
    if summary_path.exists():
        s = json.loads(summary_path.read_text(encoding="utf-8"))
        keys = ("katex", "katex_tex_annotations", "mathjax_v2", "mathjax_v3", "math_tex_scripts", "mathml", "img", "table", "iframe", "form")
        print("Summary: " + "  ".join(f"{k}={s.get(k, '?')}" for k in keys))
    print(f"Done: {name}. Navigate to the next page by hand, then run again with a new name.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
