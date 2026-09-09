"""Attach to Adam's own, already-running Google Chrome over CDP (Task 0).

    python -m ttp_export.connect      # smoke test: print title + URL, save data/discovery/smoke.png

Rules baked in here:
- never launches a browser, never creates a context or a tab;
- uses browser.contexts[0] (the profile's real context) and an existing tab;
- detaching only drops our connection -- Chrome and its tabs stay open.
"""

from __future__ import annotations

import sys
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Sequence
from urllib.parse import urlsplit

from ._cli import die, human_size, utf8_console
from .config import Config, ConfigError, load_config

if TYPE_CHECKING:  # pragma: no cover
    from playwright.sync_api import Browser, BrowserContext, Page

CDP_TIMEOUT_MS = 15_000


class ConnectError(Exception):
    """Could not attach to Chrome; the message says what to do."""


@dataclass
class Attached:
    playwright: Any
    browser: "Browser"
    context: "BrowserContext"
    page: "Page"
    matched_domain: bool  # True if `page` was chosen because its host matches ttp_domain

    def detach(self) -> None:
        """Drop the CDP connection. Never closes Chrome, its context, or any tab."""
        try:
            self.playwright.stop()
        except Exception:  # noqa: BLE001 - best effort on the way out
            pass

    def __enter__(self) -> "Attached":
        return self

    def __exit__(self, *exc: object) -> None:
        self.detach()


def host_of(url: str) -> str:
    try:
        return (urlsplit(url).hostname or "").lower()
    except ValueError:
        return ""


def url_matches_domain(url: str, domain: str) -> bool:
    """True if the URL's host is `domain` or a subdomain of it (or, as a fallback, contains it)."""
    if not domain:
        return False
    host = host_of(url)
    if host == domain or host.endswith("." + domain):
        return True
    return domain in url.lower()


def pick_page(pages: Sequence[Any], domain: str, tab_filter: str = "") -> tuple[Any, bool]:
    """Choose the tab to work in.

    Order: a tab matching `tab_filter` (substring of URL or title) if given; else the first tab on
    `domain`; else the first http(s) tab; else the first tab. Returns (page, matched_domain).
    """
    if not pages:
        raise ConnectError("No open tabs. Open the TTP dashboard in the debugging Chrome window and retry.")
    if tab_filter:
        needle = tab_filter.lower()
        for p in pages:
            if needle in p.url.lower() or needle in (_safe_title(p)).lower():
                return p, url_matches_domain(p.url, domain)
        raise ConnectError(f"No tab matches --tab {tab_filter!r}.")
    for p in pages:
        if url_matches_domain(p.url, domain):
            return p, True
    for p in pages:
        if p.url.startswith(("http://", "https://")):
            return p, False
    return pages[0], False


def _safe_title(page: Any) -> str:
    try:
        return page.title()
    except Exception:  # noqa: BLE001
        return ""


def attach(cfg: Config | None = None, tab_filter: str = "") -> Attached:
    """Connect to the running Chrome and return the tab to work in. Raises ConnectError."""
    from playwright.sync_api import sync_playwright

    cfg = cfg or load_config()
    pw = sync_playwright().start()
    try:
        browser = pw.chromium.connect_over_cdp(cfg.chrome.cdp_url, timeout=CDP_TIMEOUT_MS)
    except Exception as e:  # noqa: BLE001 - playwright raises several types here
        pw.stop()
        raise ConnectError(
            f"Could not attach to Chrome at {cfg.chrome.cdp_url}.\n"
            "  Is Chrome running with remote debugging? Start it with .\\launch-chrome.ps1 "
            "(a Chrome window opened WITHOUT that script will not answer on the port).\n"
            f"  Details: {type(e).__name__}: {str(e).splitlines()[0] if str(e) else ''}"
        ) from e
    try:
        contexts = browser.contexts
        if not contexts:
            raise ConnectError("Attached, but Chrome reports no browser context. Open a window in that Chrome and retry.")
        if len(contexts) > 1:
            print(f"note: Chrome has {len(contexts)} contexts; using the first (the profile's own).", file=sys.stderr)
        context = contexts[0]
        page, matched = pick_page(context.pages, cfg.chrome.ttp_domain, tab_filter)
    except Exception:
        pw.stop()
        raise
    return Attached(playwright=pw, browser=browser, context=context, page=page, matched_domain=matched)


def describe_tabs(att: Attached) -> list[str]:
    lines = []
    for p in att.context.pages:
        mark = "*" if p is att.page else " "
        lines.append(f"  [{mark}] {_safe_title(p)[:60]!r}  {p.url}")
    return lines


def main(argv: list[str] | None = None) -> int:
    """Smoke test: attach, print title + URL, screenshot to data/discovery/smoke.png, detach."""
    utf8_console()
    argv = list(sys.argv[1:] if argv is None else argv)
    tab_filter = ""
    if "--tab" in argv:
        i = argv.index("--tab")
        tab_filter = argv[i + 1] if i + 1 < len(argv) else ""
    try:
        cfg = load_config()
    except ConfigError as e:
        die(str(e), 2)
    cfg.paths.ensure()
    try:
        att = attach(cfg, tab_filter)
    except ConnectError as e:
        die(str(e), 3)
    try:
        print(f"Attached to Chrome {att.browser.version} at {cfg.chrome.cdp_url}")
        print(f"Contexts: {len(att.browser.contexts)}   Tabs in context[0]: {len(att.context.pages)}")
        print("\n".join(describe_tabs(att)))
        if cfg.chrome.ttp_domain:
            print(f"ttp_domain {cfg.chrome.ttp_domain!r} matched: {'yes' if att.matched_domain else 'NO -- fell back to another tab'}")
        else:
            print("ttp_domain is empty in config.toml -- using the first tab.")
        page = att.page
        page.bring_to_front()
        print(f"Title: {page.title()}")
        print(f"URL:   {page.url}")
        shot = cfg.paths.discovery / "smoke.png"
        page.screenshot(path=str(shot), full_page=True)
        print(f"Saved: {shot} ({human_size(shot.stat().st_size)})")
    finally:
        att.detach()
    print("Detached. Chrome and all its tabs should still be open -- please confirm that in the checkpoint report.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
