"""Reusable UI models."""

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class MetricItem:
    label: str
    value: Any
    delta: str | None = None
