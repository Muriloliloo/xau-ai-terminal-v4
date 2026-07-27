"""Filesystem and runtime configuration."""

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Final

PACKAGE_DIR: Final = Path(__file__).resolve().parent
BASE_DIR: Final = PACKAGE_DIR.parent


def _path_from_environment(variable: str, default: Path) -> Path:
    configured = os.getenv(variable)
    return Path(configured).expanduser().resolve() if configured else default


DATABASE_PATH: Final = _path_from_environment(
    "XAU_DATABASE_PATH",
    BASE_DIR / "database" / "xau_terminal.db",
)
SAMPLE_CSV_PATH: Final = _path_from_environment(
    "XAU_SAMPLE_CSV_PATH",
    BASE_DIR / "data" / "sample_options.csv",
)
OUTPUT_DIR: Final = _path_from_environment(
    "XAU_OUTPUT_DIR",
    BASE_DIR / "outputs",
)


def _positive_int(variable: str, default: int) -> int:
    try:
        return max(1, int(os.getenv(variable, str(default))))
    except ValueError:
        return default


def _environment_flag(variable: str, default: bool) -> bool:
    configured = os.getenv(variable)
    if configured is None:
        return default
    return configured.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class MarketDataSettings:
    provider: str
    alpha_vantage_api_key: str | None
    cache_seconds: int
    timeout_seconds: int
    allow_demo_fallback: bool
    csv_path: Path | None
    symbol: str

    @classmethod
    def from_environment(cls) -> "MarketDataSettings":
        provider = os.getenv("MARKET_DATA_PROVIDER", "auto").strip().lower()
        supported = {
            "auto",
            "alpha_vantage",
            "cme_bulletin",
            "manual",
            "csv",
            "demo",
        }
        if provider not in supported:
            provider = "auto"
        key = os.getenv("ALPHA_VANTAGE_API_KEY", "").strip() or None
        configured_csv = os.getenv("MARKET_DATA_CSV_PATH", "").strip()
        return cls(
            provider=provider,
            alpha_vantage_api_key=key,
            cache_seconds=_positive_int("MARKET_DATA_CACHE_SECONDS", 60),
            timeout_seconds=_positive_int("MARKET_DATA_TIMEOUT_SECONDS", 10),
            allow_demo_fallback=_environment_flag(
                "ALLOW_DEMO_FALLBACK",
                True,
            ),
            csv_path=Path(configured_csv).expanduser() if configured_csv else None,
            symbol=os.getenv("MARKET_DATA_SYMBOL", "XAU").strip().upper() or "XAU",
        )
