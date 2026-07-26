"""Filesystem and runtime configuration."""

import os
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
