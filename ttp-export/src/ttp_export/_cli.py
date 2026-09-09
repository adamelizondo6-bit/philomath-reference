"""Small helpers shared by the command-line entry points."""

from __future__ import annotations

import sys
from datetime import datetime, timezone


def utf8_console() -> None:
    """Make stdout/stderr UTF-8 so status glyphs never crash a Windows console."""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        except (AttributeError, ValueError):
            pass


def now_iso() -> str:
    """Local time with UTC offset, second precision, e.g. 2026-09-09T21:03:14-05:00."""
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def human_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} GB"


def die(message: str, code: int = 1) -> "NoReturn":  # noqa: F821
    print(f"\nERROR: {message}", file=sys.stderr)
    raise SystemExit(code)
