"""Helpers for data-source objects."""

from pathlib import Path
from typing import Any


def source_name(source: Any) -> str:
    if isinstance(source, (str, Path)):
        return Path(source).name
    return str(getattr(source, "name", type(source).__name__))
