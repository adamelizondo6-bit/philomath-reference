"""Load config.toml (Task 0).

The *project root* is the folder that holds config.toml (the parent of src/).
All data lives under <project root>/data and <project root>/out, both git-ignored.
Set the TTP_EXPORT_CONFIG environment variable to point at a different .toml file.

    python -m ttp_export.config      # print the resolved configuration
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit

try:
    import tomllib
except ModuleNotFoundError:  # Python < 3.11
    import tomli as tomllib  # type: ignore[no-redef]

PACKAGE_DIR = Path(__file__).resolve().parent
DEFAULT_PROJECT_ROOT = PACKAGE_DIR.parents[1]  # src/ttp_export -> src -> project root
CONFIG_NAME = "config.toml"
EXAMPLE_NAME = "config.example.toml"

IMAGE_FORMATS = ("png", "webp", "jpg")


class ConfigError(Exception):
    """A problem with config.toml, explained in plain English."""


@dataclass(frozen=True)
class ChromeConfig:
    cdp_url: str
    ttp_domain: str  # bare host, e.g. "app.example.com"; may be "" (falls back to first tab)


@dataclass(frozen=True)
class VaultConfig:
    root: str
    name: str
    gmat_folder: str
    export_folder: str
    image_format: str
    image_quality: int

    @property
    def root_path(self) -> Path:
        return Path(self.root)

    @property
    def gmat_path(self) -> Path:
        return self.root_path / self.gmat_folder

    @property
    def export_path(self) -> Path:
        return self.root_path / self.export_folder


@dataclass(frozen=True)
class PacingConfig:
    min_wait: float
    max_wait: float
    max_pages_default: int


@dataclass(frozen=True)
class Paths:
    """Every file/folder the tool reads or writes, under the project root."""

    root: Path
    data: Path
    records: Path
    passages: Path
    queue: Path
    capture_log: Path
    analytics: Path
    discovery: Path
    shots_clean: Path
    shots_review: Path
    shots_extra: Path
    shots_analytics: Path
    inventory: Path
    out: Path
    workbook: Path

    @classmethod
    def from_root(cls, root: Path) -> "Paths":
        data = root / "data"
        out = root / "out"
        return cls(
            root=root,
            data=data,
            records=data / "records.jsonl",
            passages=data / "passages.jsonl",
            queue=data / "queue.json",
            capture_log=data / "capture_log.jsonl",
            analytics=data / "analytics.json",
            discovery=data / "discovery",
            shots_clean=data / "shots" / "clean",
            shots_review=data / "shots" / "review",
            shots_extra=data / "shots" / "extra",
            shots_analytics=data / "shots" / "analytics",
            inventory=data / "inventory",
            out=out,
            workbook=out / "TTP_Export.xlsx",
        )

    def directories(self) -> list[Path]:
        return [
            self.data,
            self.discovery,
            self.shots_clean,
            self.shots_review,
            self.shots_extra,
            self.shots_analytics,
            self.inventory,
            self.out,
        ]

    def ensure(self) -> None:
        for d in self.directories():
            d.mkdir(parents=True, exist_ok=True)


@dataclass(frozen=True)
class Config:
    chrome: ChromeConfig
    vault: VaultConfig
    pacing: PacingConfig
    paths: Paths
    source: Path  # the config file that was loaded

    def require_vault(self) -> None:
        """Raise unless the vault settings are filled in and the vault exists (Tasks 6-7)."""
        v = self.vault
        missing = [k for k in ("root", "name", "gmat_folder", "export_folder") if not getattr(v, k).strip()]
        if missing:
            raise ConfigError(f"[vault] {', '.join(missing)} must be filled in {self.source}")
        if not v.root_path.is_dir():
            raise ConfigError(f"[vault] root does not exist or is not a folder: {v.root_path}")
        if not v.gmat_path.is_dir():
            raise ConfigError(f"[vault] gmat_folder does not exist inside the vault: {v.gmat_path}")


def find_config_path() -> Path:
    env = os.environ.get("TTP_EXPORT_CONFIG")
    if env:
        return Path(env).expanduser()
    for candidate in (DEFAULT_PROJECT_ROOT / CONFIG_NAME, Path.cwd() / CONFIG_NAME):
        if candidate.is_file():
            return candidate
    return DEFAULT_PROJECT_ROOT / CONFIG_NAME


def normalize_domain(value: str) -> str:
    """Accept 'app.example.com', 'https://app.example.com/dashboard', or '' and return the bare host."""
    value = value.strip()
    if not value:
        return ""
    if "://" in value:
        host = urlsplit(value).hostname or ""
    else:
        host = urlsplit("//" + value).hostname or value.split("/")[0]
    return host.lower().rstrip(".")


def _section(raw: dict, name: str) -> dict:
    sec = raw.get(name)
    if sec is None:
        raise ConfigError(f"missing [{name}] section")
    if not isinstance(sec, dict):
        raise ConfigError(f"[{name}] must be a table")
    return sec


def _get(sec: dict, section: str, key: str, kind: type, default=None):
    if key not in sec:
        if default is not None:
            return default
        raise ConfigError(f"[{section}] {key} is missing")
    value = sec[key]
    if kind is float and isinstance(value, int) and not isinstance(value, bool):
        value = float(value)
    if not isinstance(value, kind) or isinstance(value, bool) and kind is not bool:
        raise ConfigError(f"[{section}] {key} must be a {kind.__name__}, got {type(value).__name__}")
    return value


def load_config(path: Path | str | None = None) -> Config:
    """Parse config.toml and validate what Task 0 needs. Vault settings are checked lazily."""
    cfg_path = Path(path).expanduser() if path else find_config_path()
    if not cfg_path.is_file():
        example = cfg_path.parent / EXAMPLE_NAME
        raise ConfigError(
            f"{cfg_path} not found. Copy {example.name} to {CONFIG_NAME} next to it and fill in the blanks "
            f"(setup.ps1 does the copy for you)."
        )
    try:
        raw = tomllib.loads(cfg_path.read_text(encoding="utf-8"))
    except tomllib.TOMLDecodeError as e:
        raise ConfigError(
            f"{cfg_path} is not valid TOML: {e}\n"
            "Hint: Windows paths must be in single quotes, e.g. root = 'C:\\Users\\you\\Vault'"
        ) from e

    chrome_raw = _section(raw, "chrome")
    vault_raw = _section(raw, "vault")
    pacing_raw = _section(raw, "pacing")

    cdp_url = _get(chrome_raw, "chrome", "cdp_url", str, "http://127.0.0.1:9222").strip()
    if not cdp_url.startswith(("http://", "https://", "ws://", "wss://")):
        raise ConfigError(f"[chrome] cdp_url must start with http:// (got {cdp_url!r})")
    chrome = ChromeConfig(cdp_url=cdp_url, ttp_domain=normalize_domain(_get(chrome_raw, "chrome", "ttp_domain", str, "")))

    image_format = _get(vault_raw, "vault", "image_format", str, "png").strip().lower()
    if image_format == "jpeg":
        image_format = "jpg"
    if image_format not in IMAGE_FORMATS:
        raise ConfigError(f"[vault] image_format must be one of {IMAGE_FORMATS}, got {image_format!r}")
    image_quality = _get(vault_raw, "vault", "image_quality", int, 85)
    if not 1 <= image_quality <= 100:
        raise ConfigError("[vault] image_quality must be between 1 and 100")
    vault = VaultConfig(
        root=_get(vault_raw, "vault", "root", str, "").strip(),
        name=_get(vault_raw, "vault", "name", str, "").strip(),
        gmat_folder=_get(vault_raw, "vault", "gmat_folder", str, "").strip().strip("/\\"),
        export_folder=_get(vault_raw, "vault", "export_folder", str, "GMAT/TTP Export").strip().strip("/\\"),
        image_format=image_format,
        image_quality=image_quality,
    )

    min_wait = _get(pacing_raw, "pacing", "min_wait", float, 4.0)
    max_wait = _get(pacing_raw, "pacing", "max_wait", float, 9.0)
    max_pages = _get(pacing_raw, "pacing", "max_pages_default", int, 250)
    if min_wait < 0 or max_wait < min_wait:
        raise ConfigError("[pacing] need 0 <= min_wait <= max_wait")
    if max_pages < 1:
        raise ConfigError("[pacing] max_pages_default must be >= 1")
    pacing = PacingConfig(min_wait=min_wait, max_wait=max_wait, max_pages_default=max_pages)

    project_root = cfg_path.resolve().parent
    return Config(chrome=chrome, vault=vault, pacing=pacing, paths=Paths.from_root(project_root), source=cfg_path.resolve())


def main(argv: list[str] | None = None) -> int:
    from ._cli import utf8_console

    utf8_console()
    try:
        cfg = load_config(argv[0] if argv else None)
    except ConfigError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 2
    print(f"config file : {cfg.source}")
    print(f"project root: {cfg.paths.root}")
    print(f"cdp_url     : {cfg.chrome.cdp_url}")
    print(f"ttp_domain  : {cfg.chrome.ttp_domain or '(empty -> first tab is used)'}")
    print(f"vault root  : {cfg.vault.root or '(empty)'}")
    print(f"vault name  : {cfg.vault.name or '(empty)'}")
    print(f"gmat folder : {cfg.vault.gmat_path if cfg.vault.root else '(empty)'}")
    print(f"export to   : {cfg.vault.export_path if cfg.vault.root else '(empty)'}")
    print(f"images      : {cfg.vault.image_format} q={cfg.vault.image_quality}")
    print(f"pacing      : {cfg.pacing.min_wait}-{cfg.pacing.max_wait}s, max_pages {cfg.pacing.max_pages_default}")
    print(f"records     : {cfg.paths.records}")
    print(f"workbook    : {cfg.paths.workbook}")
    try:
        cfg.require_vault()
        print("vault check : ok")
    except ConfigError as e:
        print(f"vault check : not ready ({e}) -- only needed from Task 6 on")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
